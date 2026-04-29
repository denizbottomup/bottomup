import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard.js';
import { LivecastService, type LiveSearchHit } from './livecast.service.js';

interface AudioChunkPayload {
  audio_b64?: string;
  mime?: string;
  target_lang?: string;
}

@Controller()
@UseGuards(FirebaseAuthGuard)
export class LivecastController {
  constructor(private readonly livecast: LivecastService) {}

  /**
   * `/me/livecast/config` — UI bootstrap. Tells the frontend whether
   * server-side transcription is available so the "Çevirili
   * transcript başlat" button can render in the right state, and
   * whether YouTube search is wired up (separate env var).
   */
  @Get('/me/livecast/config')
  config(): { transcribe_enabled: boolean; search_enabled: boolean } {
    return {
      transcribe_enabled: this.livecast.isReady(),
      search_enabled: !!process.env.YOUTUBE_API_KEY,
    };
  }

  /**
   * `/me/livecast/search?q=...` — finance-aware live search across
   * YouTube. Powell, FOMC, ECB, Lagarde, Bloomberg TV, "btc trader
   * live", whatever. Falls back to a curated channel set when
   * YOUTUBE_API_KEY isn't set yet.
   */
  @Get('/me/livecast/search')
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
}
