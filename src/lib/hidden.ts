/**
 * Messages hidden in ordinary text: acrostics and null ciphers, invisible characters, trailing whitespace.
 */

// ── Acrostics and null ciphers ─────────────────────────────────────────

export type ExtractMethod = 'line-first' | 'line-last' | 'word-first' | 'word-last' | 'word-nth' | 'every-nth' | 'capitals';

const lines = (t: string) =>
  t
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const words = (t: string) => t.split(/\s+/).map((w) => w.replace(/[^A-Za-z]/g, '')).filter(Boolean);
const letters = (t: string) => t.replace(/[^A-Za-z]/g, '');

/**
 * Reads letters out of a text by position. `n` is 1-based: the n-th letter of each word
 * (word-nth), or every n-th letter of the text (every-nth, starting at `offset`, also 1-based).
 */
export function extract(text: string, method: ExtractMethod, n = 1, offset = 1): string {
  switch (method) {
    case 'line-first':
      return lines(text).map((l) => letters(l)[0] ?? '').join('').toUpperCase();
    case 'line-last':
      return lines(text).map((l) => letters(l).slice(-1)).join('').toUpperCase();
    case 'word-first':
      return words(text).map((w) => w[0]).join('').toUpperCase();
    case 'word-last':
      return words(text).map((w) => w.slice(-1)).join('').toUpperCase();
    case 'word-nth':
      return words(text).map((w) => w[n - 1] ?? '').join('').toUpperCase();
    case 'every-nth':
      return [...letters(text)].filter((_, i) => i >= offset - 1 && (i - (offset - 1)) % n === 0).join('').toUpperCase();
    case 'capitals':
      return text.replace(/[^A-Z]/g, '');
  }
}

// ── Invisible characters ───────────────────────────────────────────────

export const ZERO = '​'; // zero-width space: bit 0
export const ONE = '‌'; // zero-width non-joiner: bit 1
const ZW_ANY = /[​-‍⁠﻿]/g;
const IS_ZW = /^[\u200B-\u200D\u2060\uFEFF]$/;

const toBits = (s: string) => [...new TextEncoder().encode(s)].map((b) => b.toString(2).padStart(8, '0')).join('');
function fromBits(bits: string): string {
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Hides `message` as zero-width characters right after the first character of `cover`. */
export function zeroWidthHide(message: string, cover: string): string {
  const hidden = [...toBits(message)].map((b) => (b === '1' ? ONE : ZERO)).join('');
  return cover.slice(0, 1) + hidden + cover.slice(1);
}

/** Reads zero-width space as 0 and zero-width non-joiner as 1, wherever they are. */
export function zeroWidthReveal(text: string): string {
  const bits = [...text].filter((c) => c === ZERO || c === ONE).map((c) => (c === ONE ? '1' : '0')).join('');
  return fromBits(bits);
}

/** Trailing whitespace: each line ends in spaces (0) and tabs (1). */
export function whitespaceReveal(text: string): string {
  const bits = text
    .split('\n')
    .map((l) => (l.match(/[ \t]+$/)?.[0] ?? '').replace(/ /g, '0').replace(/\t/g, '1'))
    .join('');
  return fromBits(bits);
}

export type Shown = { char: string; kind: 'text' | 'zw' | 'space' | 'tab' | 'other' };

const NAMES: Record<string, string> = {
  '​': 'ZWSP',
  '‌': 'ZWNJ',
  '‍': 'ZWJ',
  '⁠': 'WJ',
  '﻿': 'BOM',
  ' ': 'NBSP',
};

/** Splits text into characters, marking the ones you can't see. */
export function reveal(text: string): Shown[] {
  return [...text].map((char) => {
    if (char in NAMES) return { char: NAMES[char], kind: IS_ZW.test(char) ? 'zw' : 'other' };
    if (char === '\t') return { char: '→', kind: 'tab' };
    if (char === ' ') return { char: '·', kind: 'space' };
    return { char, kind: 'text' };
  });
}

export const countInvisible = (text: string) => (text.match(ZW_ANY) ?? []).length;
