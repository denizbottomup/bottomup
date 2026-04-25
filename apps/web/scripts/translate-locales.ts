/**
 * translate-locales — fills missing keys in non-English locale files
 * by translating from `en.ts` via the free Google Translate widget
 * endpoint.
 *
 * Workflow:
 *   1. Add a new field to lib/locales/schema.ts.
 *   2. Add the English value to lib/locales/en.ts.
 *   3. From apps/web, run:  pnpm translate-locales
 *      → the 9 other locales auto-fill the missing branch.
 *   4. Spot-check the output (Google's free endpoint is decent but not
 *      perfect, especially for ticker symbols / proper nouns).
 *   5. Commit.
 *
 * Existing translations are NEVER overwritten. The script only
 * touches keys that are missing in the target locale. Hand-tuned
 * translations stay intact.
 *
 * `{placeholder}` segments (e.g. {total}, {year}) are preserved
 * across translation by masking → translating → unmasking.
 *
 * The first time the script writes a locale file, the formatting
 * shifts to the script's standard layout (single quotes where
 * possible, two-space indent). This is a one-time cost; subsequent
 * runs reuse the same shape.
 */

import { writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = resolve(__dirname, '../src/lib/locales');

interface Target {
  /** Internal locale code we use in URLs / dict keys. */
  code: string;
  /** Code Google Translate expects in `tl=`. */
  google: string;
}

const TARGETS: Target[] = [
  { code: 'tr', google: 'tr' },
  { code: 'es', google: 'es' },
  { code: 'pt', google: 'pt' },
  { code: 'ru', google: 'ru' },
  { code: 'vi', google: 'vi' },
  { code: 'id', google: 'id' },
  { code: 'zh', google: 'zh-CN' },
  { code: 'ko', google: 'ko' },
  { code: 'ar', google: 'ar' },
];

type DictNode = string | DictNode[] | { [key: string]: DictNode };

async function loadLocale(code: string): Promise<DictNode> {
  // Resolve via file URL so tsx / Node ESM can dynamic-import the .ts.
  const url = new URL(`../src/lib/locales/${code}.ts`, import.meta.url).href;
  const mod = (await import(url)) as Record<string, DictNode>;
  const value = mod[code];
  if (value == null) {
    throw new Error(`No export named "${code}" in ${code}.ts`);
  }
  return value;
}

const PH_TOKEN = (i: number) => `__BUP_PH_${i}__`;
const PH_TOKEN_RE = /__BUP_PH_(\d+)__/g;
const PH_INPUT_RE = /\{[^}]+\}/g;

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function translateOne(text: string, googleCode: string): Promise<string> {
  if (text.length === 0) return '';

  // Mask {placeholders} so Google Translate doesn't garble them.
  const placeholders: string[] = [];
  const masked = text.replace(PH_INPUT_RE, (m) => {
    placeholders.push(m);
    return PH_TOKEN(placeholders.length - 1);
  });

  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', googleCode);
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', masked);

  let attempt = 0;
  while (attempt < 4) {
    attempt += 1;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (res.status === 429 || res.status === 503) {
        await sleep(1000 * attempt * attempt);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${googleCode}`);
      const data = (await res.json()) as unknown;
      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        throw new Error('unexpected response shape');
      }
      let out = '';
      for (const seg of data[0]) {
        if (Array.isArray(seg) && typeof seg[0] === 'string') out += seg[0];
      }
      out = out.replace(PH_TOKEN_RE, (_, idx: string) => placeholders[+idx] ?? '');
      return out;
    } catch (err) {
      if (attempt === 4) throw err;
      await sleep(500 * attempt);
    }
  }
  throw new Error('unreachable');
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

let translationCount = 0;

async function mergeTranslate(
  source: DictNode,
  target: DictNode | undefined,
  googleCode: string,
  path: string[] = [],
): Promise<DictNode> {
  if (typeof source === 'string') {
    if (typeof target === 'string') return target; // keep existing
    translationCount += 1;
    const out = await translateOne(source, googleCode);
    const preview = out.length > 60 ? `${out.slice(0, 60)}…` : out;
    console.log(`  + ${path.join('.')}: ${preview}`);
    return out;
  }
  if (Array.isArray(source)) {
    const targetArr = Array.isArray(target) ? target : [];
    const out: DictNode[] = [];
    for (let i = 0; i < source.length; i += 1) {
      out.push(
        await mergeTranslate(source[i] as DictNode, targetArr[i], googleCode, [
          ...path,
          String(i),
        ]),
      );
    }
    return out;
  }
  if (typeof source === 'object' && source !== null) {
    const targetObj =
      typeof target === 'object' && target !== null && !Array.isArray(target)
        ? (target as { [key: string]: DictNode })
        : {};
    const out: { [key: string]: DictNode } = {};
    for (const key of Object.keys(source)) {
      out[key] = await mergeTranslate(
        source[key] as DictNode,
        targetObj[key],
        googleCode,
        [...path, key],
      );
    }
    return out;
  }
  return source;
}

const IDENT_RE = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

function tsLiteral(value: DictNode, indent = 0): string {
  if (typeof value === 'string') {
    // Prefer single quotes (matches existing locale style). Fall back
    // to JSON.stringify (double-quoted) when the value contains
    // anything we'd otherwise have to escape — apostrophes, newlines.
    if (value.includes("'") || value.includes('\n') || value.includes('\\')) {
      return JSON.stringify(value);
    }
    return `'${value}'`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    const items = value
      .map((v) => `${pad}${tsLiteral(v, indent + 1)}`)
      .join(',\n');
    return `[\n${items},\n${closePad}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const pad = '  '.repeat(indent + 1);
    const closePad = '  '.repeat(indent);
    const items = keys
      .map((k) => {
        const safeKey = IDENT_RE.test(k) ? k : JSON.stringify(k);
        return `${pad}${safeKey}: ${tsLiteral(value[k] as DictNode, indent + 1)}`;
      })
      .join(',\n');
    return `{\n${items},\n${closePad}}`;
  }
  return JSON.stringify(value);
}

async function main(): Promise<void> {
  const en = await loadLocale('en');
  let totalTranslations = 0;

  for (const loc of TARGETS) {
    console.log(`\n${loc.code}:`);
    translationCount = 0;
    let target: DictNode;
    try {
      target = await loadLocale(loc.code);
    } catch (err) {
      console.log(`  (no existing file, creating from scratch)`);
      target = {};
    }
    const merged = await mergeTranslate(en, target, loc.google);
    if (translationCount === 0) {
      console.log(`  up to date.`);
      continue;
    }
    totalTranslations += translationCount;
    const literal = tsLiteral(merged);
    const code =
      `import type { Dict } from './schema';\n\n` +
      `export const ${loc.code}: Dict = ${literal};\n`;
    await writeFile(resolve(LOCALES_DIR, `${loc.code}.ts`), code, 'utf8');
    console.log(`  ✓ ${translationCount} new strings, file rewritten.`);
  }

  console.log(
    `\nDone. Total: ${totalTranslations} translations across ${TARGETS.length} locales.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
