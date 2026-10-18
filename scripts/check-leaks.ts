/**
 * Fails if any secret from the content files shows up in the built site (dist/).
 * Secrets: puzzle answers, puzzle plaintexts, writeups, partial replies, quick-check notes.
 * Lesson quick-check answers are too short to search for (FDW, 16) and aren't checked.
 *
 * Run after `npm run build`:  npm run leaks
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'yaml';

const ROOT = new URL('..', import.meta.url).pathname;
const DIST = join(ROOT, 'dist');
const PUZZLES = join(ROOT, 'src/content/puzzles');
const LESSONS = join(ROOT, 'src/content/lessons');

/** Shorter needles match ordinary words too often to mean anything. */
const MIN_LETTERS = 5;

type Secret = { what: string; text: string };

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function frontmatter(file: string): Record<string, any> {
  const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  return m ? parse(m[1]) : {};
}

const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

/** Words in order, allowing punctuation or a little markup between them (`<code>`, quotes). */
function needle(text: string, maxWords = 8): RegExp | null {
  const w = words(text).slice(0, maxWords);
  if (w.join('').length < MIN_LETTERS) return null;
  return new RegExp(`\\b${w.join('[^a-z0-9]{1,24}')}\\b`);
}

const secrets: Secret[] = [];

for (const file of walk(PUZZLES).filter((f) => f.endsWith('.mdx'))) {
  const id = relative(PUZZLES, file).replace(/\.mdx$/, '');
  const fm = frontmatter(file);
  for (const a of fm.answers ?? []) secrets.push({ what: `${id}: answer`, text: String(a) });
  if (fm.cipher?.plaintext) secrets.push({ what: `${id}: plaintext`, text: fm.cipher.plaintext });
  // Partial answers are wrong turns ("ROT13", "BRUTUS"), not secrets; only the replies are.
  for (const p of fm.partials ?? []) secrets.push({ what: `${id}: partial reply`, text: p.reply });
  for (const para of String(fm.writeup ?? '').split(/\n\s*\n/)) {
    if (para.trim()) secrets.push({ what: `${id}: writeup`, text: para });
  }
}

for (const file of walk(LESSONS).filter((f) => f.endsWith('.mdx'))) {
  const id = relative(LESSONS, file).replace(/\.mdx$/, '');
  for (const [, attrs] of readFileSync(file, 'utf8').matchAll(/<QuickCheck\b([^>]*)>/g)) {
    const note = attrs.match(/note="([^"]*)"/)?.[1];
    if (note) secrets.push({ what: `${id}: quick-check note`, text: note });
  }
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

const files = walk(DIST)
  .filter((f) => /\.(html|js|mjs|json|xml|txt|css)$/.test(f))
  .map((f) => ({ path: relative(ROOT, f), text: decode(readFileSync(f, 'utf8')).toLowerCase() }));

if (files.length === 0) {
  console.error('No built files in dist/. Run `npm run build` first.');
  process.exit(2);
}

let leaks = 0;
let skipped = 0;
for (const s of secrets) {
  const re = needle(s.text);
  if (!re) {
    skipped++;
    continue;
  }
  const hits = files.filter((f) => re.test(f.text)).map((f) => f.path);
  if (hits.length) {
    leaks++;
    console.error(`LEAK  ${s.what}: "${s.text.slice(0, 60)}" found in ${hits.join(', ')}`);
  }
}

const checked = secrets.length - skipped;
if (leaks) {
  console.error(`\n${leaks} of ${checked} secrets found in the build.`);
  process.exit(1);
}
console.log(`No leaks: checked ${checked} secrets against ${files.length} built files (${skipped} too short to search).`);
