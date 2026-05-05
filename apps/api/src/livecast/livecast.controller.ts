import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { FirebaseService } from '../auth/firebase.service.js';
import { AuthService } from '../auth/auth.service.js';
import { LivecastService, type LiveSearchHit } from './livecast.service.js';
import {
  LivestreamCaptureService,
  type TranscriptEvent,
} from './livestream-capture.service.js';

interface AudioChunkPayload {
  audio_b64?: string;
  mime?: string;
  target_lang?: string;
}

@Controller()
export class LivecastController {
  constructor(
    private readonly livecast: LivecastService,
    private readonly capture: LivestreamCaptureService,
    private readonly firebase: FirebaseService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Verify a Firebase ID token or our own JWT — same accept rules as
   * FirebaseAuthGuard, but reusable from a route that can't go through
   * the guard (the SSE endpoint authenticates via query param because
   * the browser EventSource API can't set custom headers).
   */
  private async verifyToken(token: string): Promise<void> {
    if (!token) throw new UnauthorizedException('Missing token');
    if (this.auth.tryVerifyAccessToken(token)) return;
    try {
      await this.firebase.verifyIdToken(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * `/me/livecast/config` — UI bootstrap. Tells the frontend whether
   * server-side transcription is available so the "Çevirili
   * transcript başlat" button can render in the right state, and
   * whether YouTube search is wired up (separate env var).
   */
  @Get('/me/livecast/config')
  @UseGuards(FirebaseAuthGuard)
  config(): {
    transcribe_enabled: boolean;
    search_enabled: boolean;
    stream_enabled: boolean;
  } {
    return {
      transcribe_enabled: this.livecast.isReady(),
      search_enabled: !!process.env.YOUTUBE_API_KEY,
      stream_enabled: this.capture.isReady(),
    };
  }

  /**
   * `/me/livecast/search?q=...` — finance-aware live search across
   * YouTube. Powell, FOMC, ECB, Lagarde, Bloomberg TV, "btc trader
   * live", whatever. Falls back to a curated channel set when
   * YOUTUBE_API_KEY isn't set yet.
   */
  @Get('/me/livecast/search')
  @UseGuards(FirebaseAuthGuard)
  async search(
    @Query('q') q?: string,
  ): Promise<{ items: LiveSearchHit[] }> {
    const items = await this.livecast.searchLive(q ?? '', 12);
    return { items };
  }

  /**
   * `/me/livecast/audio` — accepts a single audio chunk (base64-encoded
   * audio/webm by default, captured by the user's MediaRecorder),
   * pipes it through Whisper for transcription and Claude for
   * translation, and returns both strings synchronously. Frontend
   * simply appends each response to the running transcript pane.
   *
   * No streaming endpoint here on purpose: a single chunk's
   * transcribe + translate round-trip lands in 3-6s, which feels
   * close enough to "live" for an 8-10s capture window. A full SSE
   * streamer is a V2 polish, not a 1-hour-window blocker.
   */
  @Post('/me/livecast/audio')
  @UseGuards(FirebaseAuthGuard)
  async audio(
    @Body() body: AudioChunkPayload,
  ): Promise<{ original: string; translated: string; ts: string }> {
    if (!this.livecast.isReady()) {
      throw new ServiceUnavailableException(
        'Livecast transcription is not configured',
      );
    }
    if (!body?.audio_b64) {
      throw new BadRequestException('audio_b64 required');
    }
    let buf: Buffer;
    try {
      buf = Buffer.from(body.audio_b64, 'base64');
    } catch {
      throw new BadRequestException('audio_b64 not valid base64');
    }
    if (buf.length < 1024) {
      // Smaller than 1KB is almost certainly silence / glitch — skip
      // to save Whisper credits.
      return { original: '', translated: '', ts: new Date().toISOString() };
    }
    const original = await this.livecast.transcribe(
      buf,
      body.mime ?? 'audio/webm',
    );
    const translated = original
      ? await this.livecast.translate(original, body.target_lang ?? 'tr')
      : '';
    return {
      original,
      translated,
      ts: new Date().toISOString(),
    };
  }

  /**
   * `/me/livecast/stream/:videoId?lang=tr&token=...` — Server-Sent Events
   * stream. Server-side captures the YouTube live audio (yt-dlp +
   * ffmpeg), pushes 8-second chunks through Whisper + Claude, and emits
   * each `{ts, original, translated}` event to every active subscriber
   * for that videoId. One yt-dlp/ffmpeg pair per stream regardless of
   * viewer count — the per-viewer browser-tab capture flow is dead.
   *
   * Auth via `?token=` query param because the EventSource API can't
   * set a custom `Authorization` header. Same accept rules as the
   * guard (Firebase ID token or our own JWT). Token doesn't show up in
   * an Authorization header so we accept it raw.
   *
   * Fastify-native: we hijack the reply socket (Nest's @Sse() decorator
   * is built around Express, not Fastify, and Observable-based SSE
   * tries to control the socket lifecycle in ways that conflict with
   * subscriber teardown on client disconnect).
   */
  @Get('/me/livecast/stream/:videoId')
  async stream(
    @Param('videoId') videoId: string,
    @Query('token') token: string,
    @Query('lang') lang: string,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    await this.verifyToken(String(token ?? '').trim());
    const cleanId = String(videoId ?? '').trim();
    if (!/^[A-Za-z0-9_-]{6,}$/.test(cleanId)) {
      throw new BadRequestException('invalid videoId');
    }
    const targetLang = String(lang ?? 'tr').trim() || 'tr';
    if (!this.capture.isReady()) {
      throw new ServiceUnavailableException(
        'Livecast transcription is not configured',
      );
    }

    // Hijack the underlying socket so Fastify doesn't try to send its
    // own response after we start streaming.
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    raw.write(': ok\n\n');

    let alive = true;
    let sub: { unsubscribe: () => void } | null = null;

    const send = (ev: TranscriptEvent) => {
      if (!alive) return;
      try {
        raw.write(`event: chunk\ndata: ${JSON.stringify(ev)}\n\n`);
      } catch {
        cleanup();
      }
    };

    // Heartbeat every 15s so proxies (Cloudflare, Railway) don't kill
    // the long-lived connection.
    const heartbeat = setInterval(() => {
      if (!alive) return;
      try {
        raw.write(`: ping ${Date.now()}\n\n`);
      } catch {
        cleanup();
      }
    }, 15_000);

    const cleanup = () => {
      if (!alive) return;
      alive = false;
      clearInterval(heartbeat);
      sub?.unsubscribe();
      try {
        raw.end();
      } catch {
        /* ignore */
      }
    };

    req.raw.on('close', cleanup);
    req.raw.on('error', cleanup);

    try {
      sub = this.capture.subscribe(cleanId, targetLang, send);
      // Tell the client we're attached so the UI can move out of the
      // "starting..." state even before the first chunk lands.
      raw.write(`event: ready\ndata: ${JSON.stringify({ videoId: cleanId, lang: targetLang })}\n\n`);
    } catch (err) {
      raw.write(
        `event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`,
      );
      cleanup();
    }
  }
}
