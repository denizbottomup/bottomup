import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { spawn, type ChildProcess } from 'node:child_process';
import { promises as fs, watch as fsWatch, type FSWatcher } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { LivecastService } from './livecast.service.js';

const CHUNK_SECONDS = 8;
const SAMPLE_RATE = 16_000;
const IDLE_KILL_MS = 30_000;
const MAX_STREAMS = 6;

export interface TranscriptEvent {
  ts: string;
  original: string;
  /** Translation per requested language (lazy-filled by translate()). */
  translated: string;
  lang: string;
}

interface Subscriber {
  id: string;
  lang: string;
  send: (ev: TranscriptEvent) => void;
}

interface ActiveStream {
  videoId: string;
  workdir: string;
  ytdlp: ChildProcess | null;
  ffmpeg: ChildProcess | null;
  watcher: FSWatcher | null;
  subscribers: Map<string, Subscriber>;
  /** Files we've already handed off to Whisper (avoid double-processing
   * on filesystem rename events). */
  processed: Set<string>;
  startedAt: number;
  killTimer: NodeJS.Timeout | null;
  /** Cache of `original → { lang → translated }` so re-subscribing in
   * a different language doesn't re-translate already-spoken chunks. */
  translationCache: Map<string, Map<string, string>>;
  /** Last 40 transcript events so a late subscriber sees recent context
   * immediately rather than waiting up to 8s for the next chunk. */
  history: TranscriptEvent[];
}

/**
 * Server-side YouTube live capture. Pulls the audio track via yt-dlp,
 * segments it into 8-second WAV chunks via ffmpeg, transcribes each
 * chunk via Whisper, translates the result via Claude, and fans the
 * `{original, translated}` events out to every active SSE subscriber
 * for that videoId.
 *
 * One yt-dlp+ffmpeg pair per videoId regardless of viewer count — that's
 * the entire point of the redesign vs. the old per-viewer browser-tab
 * capture flow. Whisper cost scales with the number of *streams*, not
 * viewers; Claude cost scales with `(stream × distinct target language)`.
 */
@Injectable()
export class LivestreamCaptureService implements OnModuleDestroy {
  private readonly log = new Logger(LivestreamCaptureService.name);
  private readonly streams = new Map<string, ActiveStream>();

  constructor(private readonly livecast: LivecastService) {}

  onModuleDestroy() {
    for (const s of this.streams.values()) this.tearDown(s, 'shutdown');
  }

  isReady(): boolean {
    return this.livecast.isReady();
  }

  subscribe(
    videoId: string,
    lang: string,
    send: (ev: TranscriptEvent) => void,
  ): { unsubscribe: () => void; history: TranscriptEvent[] } {
    let stream = this.streams.get(videoId);
    if (!stream) {
      if (this.streams.size >= MAX_STREAMS) {
        throw new Error(
          `livestream capture saturated (max ${MAX_STREAMS} concurrent streams)`,
        );
      }
      stream = this.startStream(videoId);
      this.streams.set(videoId, stream);
    }
    if (stream.killTimer) {
      clearTimeout(stream.killTimer);
      stream.killTimer = null;
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    stream.subscribers.set(id, { id, lang, send });
    this.log.log(
      `subscribe video=${videoId} lang=${lang} id=${id} total=${stream.subscribers.size}`,
    );

    // Replay last few translated chunks so the new viewer sees context.
    const replay = stream.history.slice(-10);
    void this.replayHistory(stream, replay, lang, send);

    return {
      history: replay,
      unsubscribe: () => this.unsubscribe(videoId, id),
    };
  }

  private async replayHistory(
    stream: ActiveStream,
    history: TranscriptEvent[],
    lang: string,
    send: (ev: TranscriptEvent) => void,
  ): Promise<void> {
    for (const past of history) {
      const translated = await this.translateOnce(stream, past.original, lang);
      send({
        ts: past.ts,
        original: past.original,
        translated,
        lang,
      });
    }
  }

  private unsubscribe(videoId: string, subscriberId: string) {
    const stream = this.streams.get(videoId);
    if (!stream) return;
    stream.subscribers.delete(subscriberId);
    this.log.log(
      `unsubscribe video=${videoId} id=${subscriberId} remaining=${stream.subscribers.size}`,
    );
    if (stream.subscribers.size === 0 && !stream.killTimer) {
      stream.killTimer = setTimeout(() => {
        this.tearDown(stream, 'idle');
        this.streams.delete(videoId);
      }, IDLE_KILL_MS);
    }
  }

  private startStream(videoId: string): ActiveStream {
    const workdir = path.join(
      os.tmpdir(),
      `livecast-${videoId}-${Date.now().toString(36)}`,
    );
    const stream: ActiveStream = {
      videoId,
      workdir,
      ytdlp: null,
      ffmpeg: null,
      watcher: null,
      subscribers: new Map(),
      processed: new Set(),
      startedAt: Date.now(),
      killTimer: null,
      translationCache: new Map(),
      history: [],
    };
    void this.bootStream(stream);
    return stream;
  }

  private async bootStream(stream: ActiveStream): Promise<void> {
    const { videoId, workdir } = stream;
    try {
      await fs.mkdir(workdir, { recursive: true });
      this.log.log(`stream boot video=${videoId} workdir=${workdir}`);

      // yt-dlp: bestaudio of the live stream → stdout (raw bytes,
      // container varies — webm/opus typically). --no-warnings to keep
      // the log clean; --quiet still leaves errors on stderr.
      //
      // YouTube aggressively flags datacenter IPs (Railway, AWS, GCP)
      // as bots and demands `--cookies` from the default `web` player.
      // Switching the extractor's player_client to the mobile/iOS/Safari
      // bouquet sidesteps the bot check on most live streams without
      // any cookie file. If a stream still gates this we'll need to
      // mount a cookies.txt; until then the multi-client fallback is
      // the cheapest fix.
      //
      // Dropped --live-from-start: replaying from the broadcast start
      // is gated by the same auth flow we're trying to avoid; the live
      // edge is what we actually want anyway.
      const ytdlp = spawn(
        'yt-dlp',
        [
          '-f',
          'bestaudio',
          '--no-warnings',
          '--quiet',
          '--no-part',
          '--extractor-args',
          'youtube:player_client=android,ios,web_safari,mweb',
          '-o',
          '-',
          `https://www.youtube.com/watch?v=${videoId}`,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );
      stream.ytdlp = ytdlp;

      // ffmpeg: take yt-dlp's stdout, re-encode to mono 16kHz wav, and
      // emit `chunk_NNNN.wav` files of CHUNK_SECONDS each into workdir.
      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-loglevel',
          'error',
          '-i',
          'pipe:0',
          '-vn',
          '-ac',
          '1',
          '-ar',
          String(SAMPLE_RATE),
          '-c:a',
          'pcm_s16le',
          '-f',
          'segment',
          '-segment_time',
          String(CHUNK_SECONDS),
          '-reset_timestamps',
          '1',
          path.join(workdir, 'chunk_%05d.wav'),
        ],
        { stdio: ['pipe', 'inherit', 'pipe'] },
      );
      stream.ffmpeg = ffmpeg;

      ytdlp.stdout!.pipe(ffmpeg.stdin!);
      ytdlp.stderr?.on('data', (b: Buffer) =>
        this.log.warn(`yt-dlp[${videoId}] ${b.toString().trim().slice(0, 200)}`),
      );
      ffmpeg.stderr?.on('data', (b: Buffer) =>
        this.log.warn(`ffmpeg[${videoId}] ${b.toString().trim().slice(0, 200)}`),
      );

      ytdlp.on('exit', (code) => {
        this.log.warn(`yt-dlp[${videoId}] exited ${code}`);
        try {
          ffmpeg.stdin?.end();
        } catch {
          /* ignore */
        }
      });
      ffmpeg.on('exit', (code) => {
        this.log.warn(`ffmpeg[${videoId}] exited ${code}`);
      });

      // Watch the dir; whenever ffmpeg finishes a chunk it renames the
      // segment into place — we pick up `rename` events and queue the
      // file (one chunk behind, so the *previous* file is fully written
      // when we see the *next* one appear).
      const watcher = fsWatch(workdir, { persistent: false });
      stream.watcher = watcher;
      watcher.on('error', (err) =>
        this.log.error(`watcher[${videoId}]`, err),
      );
      watcher.on('change', (_event, filename) => {
        if (!filename) return;
        const name = String(filename);
        if (!name.endsWith('.wav')) return;
        // Process chunks in order — the file we just got an event for
        // might still be growing (segment muxer). We process files
        // strictly older than the latest one.
        void this.scanReady(stream);
      });
      // Belt-and-suspenders: also poll every 4s (fs.watch on macOS Docker
      // overlays is unreliable, and we'd rather over-poll than miss a
      // chunk).
      const poll = setInterval(() => void this.scanReady(stream), 4000);
      ytdlp.on('exit', () => clearInterval(poll));
    } catch (err) {
      this.log.error(`stream boot failed video=${videoId}`, err);
      this.tearDown(stream, 'boot-error');
      this.streams.delete(videoId);
    }
  }

  private async scanReady(stream: ActiveStream): Promise<void> {
    const files = await fs
      .readdir(stream.workdir)
      .catch(() => [] as string[]);
    const wavs = files
      .filter((f) => f.endsWith('.wav'))
      .sort();
    // The newest file is still being written; everything older is safe.
    const ready = wavs.slice(0, Math.max(0, wavs.length - 1));
    for (const name of ready) {
      if (stream.processed.has(name)) continue;
      stream.processed.add(name);
      void this.handleChunk(stream, name);
    }
  }

  private async handleChunk(stream: ActiveStream, name: string): Promise<void> {
    const filepath = path.join(stream.workdir, name);
    try {
      const buf = await fs.readFile(filepath);
      // Skip the WAV header for size checks; <2KB total (~64ms of audio)
      // is silence/glitch.
      if (buf.length < 2048) return;
      const original = await this.livecast.transcribe(buf, 'audio/wav');
      if (!original) return;
      const ts = new Date().toISOString();

      // Push base entry (no per-lang translation yet).
      stream.history.push({ ts, original, translated: '', lang: '' });
      if (stream.history.length > 40) stream.history.shift();

      // Group subscribers by lang so each unique lang only hits Claude
      // once per chunk regardless of viewer count.
      const byLang = new Map<string, Subscriber[]>();
      for (const sub of stream.subscribers.values()) {
        const arr = byLang.get(sub.lang) ?? [];
        arr.push(sub);
        byLang.set(sub.lang, arr);
      }
      for (const [lang, subs] of byLang) {
        const translated = await this.translateOnce(stream, original, lang);
        const ev: TranscriptEvent = { ts, original, translated, lang };
        for (const sub of subs) {
          try {
            sub.send(ev);
          } catch (err) {
            this.log.warn(
              `send failed video=${stream.videoId} sub=${sub.id}: ${(err as Error).message}`,
            );
          }
        }
      }
    } catch (err) {
      this.log.error(`chunk ${name} for ${stream.videoId} failed`, err);
    } finally {
      // Free the disk — we only need the file once.
      void fs.unlink(filepath).catch(() => undefined);
    }
  }

  private async translateOnce(
    stream: ActiveStream,
    original: string,
    lang: string,
  ): Promise<string> {
    const cached = stream.translationCache.get(original)?.get(lang);
    if (cached !== undefined) return cached;
    const translated = await this.livecast.translate(original, lang);
    let perLang = stream.translationCache.get(original);
    if (!perLang) {
      perLang = new Map();
      stream.translationCache.set(original, perLang);
    }
    perLang.set(lang, translated);
    // Keep cache bounded.
    if (stream.translationCache.size > 200) {
      const first = stream.translationCache.keys().next().value;
      if (first) stream.translationCache.delete(first);
    }
    return translated;
  }

  private tearDown(stream: ActiveStream, reason: string): void {
    this.log.log(
      `stream teardown video=${stream.videoId} reason=${reason} ran=${
        Math.round((Date.now() - stream.startedAt) / 1000)
      }s subs=${stream.subscribers.size}`,
    );
    if (stream.killTimer) {
      clearTimeout(stream.killTimer);
      stream.killTimer = null;
    }
    try {
      stream.watcher?.close();
    } catch {
      /* ignore */
    }
    try {
      stream.ffmpeg?.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    try {
      stream.ytdlp?.kill('SIGTERM');
    } catch {
      /* ignore */
    }
    void fs
      .rm(stream.workdir, { recursive: true, force: true })
      .catch(() => undefined);
  }
}
