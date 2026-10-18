/**
 * Classical ciphers beyond Caesar. Encoders make and verify puzzles; decoders serve the tools.
 * Letter ciphers keep case and pass everything else through; transpositions work on A–Z only.
 */
import { ALPHABET, mod26 } from './caesar';

const isLetter = (c: string) => /[A-Za-z]/.test(c);
const lettersOnly = (text: string) => text.toUpperCase().replace(/[^A-Z]/g, '');

// ── Substitution ───────────────────────────────────────────────────────

/** Applies a cipher alphabet: plain A→key[0], B→key[1]… Case is kept. */
export function substitute(text: string, key: string): string {
  const k = key.toUpperCase();
  return text.replace(/[A-Za-z]/g, (c) => {
    const out = k[c.toUpperCase().charCodeAt(0) - 65] ?? c;
    return c === c.toUpperCase() ? out : out.toLowerCase();
  });
}

/** Inverts a cipher alphabet. Letters missing from the key stay unmapped ("?"). */
export function invertKey(key: string): string {
  const inv = Array(26).fill('?');
  [...key.toUpperCase()].forEach((c, i) => {
    const j = c.charCodeAt(0) - 65;
    if (j >= 0 && j < 26) inv[j] = ALPHABET[i];
  });
  return inv.join('');
}

export const ATBASH_KEY = [...ALPHABET].reverse().join('');
export const atbash = (text: string) => substitute(text, ATBASH_KEY);

/** Keyword alphabet: the keyword's letters (repeats dropped), then the rest of A–Z in order. */
export function keywordAlphabet(keyword: string): string {
  return [...new Set(lettersOnly(keyword) + ALPHABET)].join('');
}

/** Letter counts, most common first. */
export function frequencies(text: string): { letter: string; count: number; share: number }[] {
  const counts = new Map<string, number>();
  for (const c of lettersOnly(text)) counts.set(c, (counts.get(c) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;
  return [...ALPHABET]
    .map((letter) => ({ letter, count: counts.get(letter) ?? 0, share: (counts.get(letter) ?? 0) / total }))
    .sort((a, b) => b.count - a.count || a.letter.localeCompare(b.letter));
}

/** English letter frequencies, most common first (approximate, from large corpora). */
export const ENGLISH_ORDER = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';

// ── Polybius square and tap code ───────────────────────────────────────

/** The 25-letter square: keyword first, then the alphabet. Polybius merges J into I; tap code merges K into C. */
export function polybiusSquare(keyword = '', tap = false): string {
  const drop = tap ? 'K' : 'J';
  const fold = (s: string) => lettersOnly(s).replace(new RegExp(drop, 'g'), tap ? 'C' : 'I');
  return [...new Set(fold(keyword) + fold(ALPHABET))].join('');
}

/** Row then column, 1–5, letters separated by spaces and words by " / ". */
export function polybiusEncode(text: string, keyword = '', tap = false): string {
  const sq = polybiusSquare(keyword, tap);
  const fold = (c: string) => (tap ? (c === 'K' ? 'C' : c) : c === 'J' ? 'I' : c);
  return text
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean)
    .map((w) =>
      [...w]
        .map((c) => {
          const i = sq.indexOf(fold(c));
          return `${Math.floor(i / 5) + 1}${(i % 5) + 1}`;
        })
        .join(' '),
    )
    .join(' / ');
}

/** Reads digit pairs; anything else separates words if it's a slash, otherwise is ignored. */
export function polybiusDecode(text: string, keyword = '', tap = false): string {
  const sq = polybiusSquare(keyword, tap);
  return text
    .split(/\s*[\/|]\s*/)
    .map((w) => {
      const digits = w.replace(/[^0-9]/g, '');
      let out = '';
      for (let i = 0; i + 1 < digits.length; i += 2) {
        const r = Number(digits[i]) - 1;
        const c = Number(digits[i + 1]) - 1;
        out += r >= 0 && r < 5 && c >= 0 && c < 5 ? sq[r * 5 + c] : '?';
      }
      return out + (digits.length % 2 ? '?' : '');
    })
    .join(' ');
}

// ── Vigenère ───────────────────────────────────────────────────────────

function vigenere(text: string, key: string, sign: 1 | -1): string {
  const k = lettersOnly(key);
  if (!k) return text;
  let i = 0;
  return text.replace(/[A-Za-z]/g, (c) => {
    const base = c <= 'Z' ? 65 : 97;
    const shift = k.charCodeAt(i++ % k.length) - 65;
    return String.fromCharCode(base + mod26(c.charCodeAt(0) - base + sign * shift));
  });
}

/** Each letter shifts by the matching key letter (A=0), the key repeating. Only letters use up the key. */
export const vigenereEncrypt = (text: string, key: string) => vigenere(text, key, 1);
export const vigenereDecrypt = (text: string, key: string) => vigenere(text, key, -1);

/**
 * Kasiski examination: repeated sequences (3+ letters) and the distances between them.
 * The key length is probably a factor shared by most distances.
 */
export function kasiski(text: string, minLen = 3): { seq: string; distances: number[] }[] {
  const t = lettersOnly(text);
  const seen = new Map<string, number[]>();
  for (let len = minLen; len <= 5; len++) {
    for (let i = 0; i + len <= t.length; i++) {
      const s = t.slice(i, i + len);
      seen.set(s, [...(seen.get(s) ?? []), i]);
    }
  }
  const out: { seq: string; distances: number[] }[] = [];
  for (const [seq, pos] of seen) {
    if (pos.length < 2) continue;
    // Skip sequences that are only part of a longer repeat at the same places.
    out.push({ seq, distances: pos.slice(1).map((p, i) => p - pos[i]) });
  }
  return out
    .filter((r) => !out.some((o) => o.seq.length > r.seq.length && o.seq.includes(r.seq) && o.distances.join() === r.distances.join()))
    .sort((a, b) => b.seq.length - a.seq.length || a.seq.localeCompare(b.seq));
}

/** For key lengths 2–12, how many Kasiski distances each divides. */
export function factorCounts(distances: number[], max = 12): { length: number; count: number }[] {
  return Array.from({ length: max - 1 }, (_, i) => i + 2).map((length) => ({ length, count: distances.filter((d) => d % length === 0).length }));
}

/** Every n-th letter starting at `offset`: one Caesar-shifted column of a Vigenère text. */
export function column(text: string, n: number, offset: number): string {
  return [...lettersOnly(text)].filter((_, i) => i % n === offset).join('');
}

// ── Transposition ──────────────────────────────────────────────────────

/** Zigzag over `rails` rows, read row by row. Letters only, uppercase. */
export function railFenceEncrypt(text: string, rails: number): string {
  const t = lettersOnly(text);
  if (rails < 2) return t;
  return railOrder(t.length, rails)
    .map((i) => t[i])
    .join('');
}

export function railFenceDecrypt(text: string, rails: number): string {
  const t = lettersOnly(text);
  if (rails < 2) return t;
  const order = railOrder(t.length, rails);
  const out = Array<string>(t.length);
  order.forEach((pos, k) => (out[pos] = t[k]));
  return out.join('');
}

/** Positions of the plaintext in the order the rail fence reads them. */
function railOrder(n: number, rails: number): number[] {
  const rows: number[][] = Array.from({ length: rails }, () => []);
  let r = 0;
  let d = 1;
  for (let i = 0; i < n; i++) {
    rows[r].push(i);
    if (r === 0) d = 1;
    else if (r === rails - 1) d = -1;
    r += d;
  }
  return rows.flat();
}

/** Column order for a keyword: alphabetical, ties left to right. */
function keyOrder(key: string): number[] {
  const k = lettersOnly(key);
  return [...k].map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c) || a.i - b.i).map((x) => x.i);
}

/** Write the letters in rows under the keyword, read the columns in alphabetical order. No padding. */
export function columnarEncrypt(text: string, key: string): string {
  const t = lettersOnly(text);
  const n = lettersOnly(key).length;
  if (n < 2) return t;
  return keyOrder(key)
    .map((col) => [...t].filter((_, i) => i % n === col).join(''))
    .join('');
}

export function columnarDecrypt(text: string, key: string): string {
  const t = lettersOnly(text);
  const n = lettersOnly(key).length;
  if (n < 2) return t;
  const rows = Math.ceil(t.length / n);
  const full = t.length % n || n; // columns that get the extra letter
  const cols: string[] = Array(n).fill('');
  let k = 0;
  for (const col of keyOrder(key)) {
    const len = col < full ? rows : rows - 1;
    cols[col] = t.slice(k, k + len);
    k += len;
  }
  let out = '';
  for (let r = 0; r < rows; r++) for (let c = 0; c < n; c++) out += cols[c][r] ?? '';
  return out;
}

// ── Bacon ──────────────────────────────────────────────────────────────

/** Bacon's original alphabet: I/J share a code, and so do U/V. */
const BACON_24 = 'ABCDEFGHIKLMNOPQRSTUWXYZ';

/** A letter's position as five bits, A for 0 and B for 1. */
function baconCode(c: string, variant: 24 | 26): string {
  const i = variant === 24 ? BACON_24.indexOf(c === 'J' ? 'I' : c === 'V' ? 'U' : c) : c.charCodeAt(0) - 65;
  return i.toString(2).padStart(5, '0').replace(/0/g, 'A').replace(/1/g, 'B');
}

export function baconEncode(text: string, variant: 24 | 26 = 26): string {
  return [...lettersOnly(text)].map((c) => baconCode(c, variant)).join(' ');
}

/** Reads any A/B text (other characters ignored) in groups of five. */
export function baconDecode(text: string, variant: 24 | 26 = 26): string {
  const ab = text.toUpperCase().replace(/[^AB]/g, '');
  const letters = variant === 24 ? BACON_24 : ALPHABET;
  let out = '';
  for (let i = 0; i + 5 <= ab.length; i += 5) {
    const n = parseInt(ab.slice(i, i + 5).replace(/A/g, '0').replace(/B/g, '1'), 2);
    out += letters[n] ?? '?';
  }
  return out + (ab.length % 5 ? '?' : '');
}

/**
 * Hides a Bacon message in a cover text: lowercase letters are A, capitals are B.
 * The cover must have exactly five letters per hidden letter, so nothing is left over to misread.
 */
export function baconHide(text: string, cover: string, variant: 24 | 26 = 26): string {
  const bits = baconEncode(text, variant).replace(/ /g, '');
  const have = [...cover].filter(isLetter).length;
  if (have !== bits.length) throw new Error(`Cover text needs exactly ${bits.length} letters, has ${have}`);
  let i = 0;
  return cover.replace(/[A-Za-z]/g, (c) => (bits[i++] === 'B' ? c.toUpperCase() : c.toLowerCase()));
}

/** Reads case as Bacon: lowercase is A, capital is B. */
export const baconFromCase = (text: string) => [...text].filter(isLetter).map((c) => (c === c.toUpperCase() ? 'B' : 'A')).join('');

// ── Book cipher ────────────────────────────────────────────────────────

export type BookMode = 'line-word' | 'word-letter';

const bookLines = (source: string) =>
  source
    .trim()
    .split('\n')
    .map((l) => l.trim().split(/\s+/).filter(Boolean));
const cleanWord = (w: string) => w.toUpperCase().replace(/[^A-Z]/g, '');

/**
 * line-word: each plaintext word becomes "line.word" for its first appearance.
 * word-letter: each plaintext letter becomes "word.letter" for its first appearance, counting words through the whole text.
 * Throws if the source lacks a word or letter, since the puzzle couldn't be solved.
 */
export function bookEncode(text: string, source: string, mode: BookMode): string {
  const lines = bookLines(source);
  if (mode === 'line-word') {
    return text
      .toUpperCase()
      .split(/[^A-Z]+/)
      .filter(Boolean)
      .map((w) => {
        for (let l = 0; l < lines.length; l++) {
          const i = lines[l].findIndex((x) => cleanWord(x) === w);
          if (i >= 0) return `${l + 1}.${i + 1}`;
        }
        throw new Error(`"${w}" is not in the source text`);
      })
      .join(' ');
  }
  const words = lines.flat().map(cleanWord);
  return [...lettersOnly(text)]
    .map((c) => {
      for (let w = 0; w < words.length; w++) {
        const i = words[w].indexOf(c);
        if (i >= 0) return `${w + 1}.${i + 1}`;
      }
      throw new Error(`"${c}" is not in the source text`);
    })
    .join(' ');
}

export function bookDecode(code: string, source: string, mode: BookMode): string {
  const lines = bookLines(source);
  const refs = code.match(/\d+\s*[.:,-]\s*\d+/g) ?? [];
  if (mode === 'line-word') {
    return refs
      .map((r) => {
        const [l, w] = r.split(/\s*[.:,-]\s*/).map(Number);
        return cleanWord(lines[l - 1]?.[w - 1] ?? '') || '?';
      })
      .join(' ');
  }
  const words = lines.flat().map(cleanWord);
  return refs
    .map((r) => {
      const [w, i] = r.split(/\s*[.:,-]\s*/).map(Number);
      return words[w - 1]?.[i - 1] ?? '?';
    })
    .join('');
}

// ── Pigpen ─────────────────────────────────────────────────────────────

/**
 * The pigpen key used here: A–I in a # grid, J–R in a # grid with dots, S–V in an X, W–Z in an X with dots.
 * In each X, the order is top, left, right, bottom.
 */
export type PigpenGlyph = { kind: 'grid'; row: number; col: number; dot: boolean } | { kind: 'x'; side: 'top' | 'left' | 'right' | 'bottom'; dot: boolean };

export function pigpenGlyph(letter: string): PigpenGlyph | null {
  const i = letter.toUpperCase().charCodeAt(0) - 65;
  if (i < 0 || i > 25) return null;
  if (i < 18) {
    const j = i % 9;
    return { kind: 'grid', row: Math.floor(j / 3), col: j % 3, dot: i >= 9 };
  }
  const sides = ['top', 'left', 'right', 'bottom'] as const;
  return { kind: 'x', side: sides[(i - 18) % 4], dot: i >= 22 };
}

/** SVG drawing for a pigpen glyph in a 20×20 box: the path of its lines and where its dot goes. */
export function pigpenDrawing(g: PigpenGlyph): { d: string; dot: [number, number] | null } {
  if (g.kind === 'grid') {
    const [l, t, r, b] = [3, 3, 17, 17];
    const parts: string[] = [];
    if (g.row > 0) parts.push(`M${l} ${t}H${r}`);
    if (g.row < 2) parts.push(`M${l} ${b}H${r}`);
    if (g.col > 0) parts.push(`M${l} ${t}V${b}`);
    if (g.col < 2) parts.push(`M${r} ${t}V${b}`);
    return { d: parts.join(''), dot: g.dot ? [10, 10] : null };
  }
  const shapes = {
    top: { d: 'M3 4L10 16L17 4', dot: [10, 8] },
    left: { d: 'M4 3L16 10L4 17', dot: [8, 10] },
    right: { d: 'M16 3L4 10L16 17', dot: [12, 10] },
    bottom: { d: 'M3 16L10 4L17 16', dot: [10, 12] },
  } as const;
  const s = shapes[g.side];
  return { d: s.d, dot: g.dot ? [s.dot[0], s.dot[1]] : null };
}

/** English letter frequencies A–Z, as fractions (approximate, from large corpora). */
export const ENGLISH_FREQ = [
  0.082, 0.015, 0.028, 0.043, 0.127, 0.022, 0.02, 0.061, 0.07, 0.0015, 0.0077, 0.04, 0.024,
  0.067, 0.075, 0.019, 0.00095, 0.06, 0.063, 0.091, 0.028, 0.0098, 0.024, 0.0015, 0.02, 0.00074,
];

/**
 * The Caesar shift that makes `text` look most like English (lowest chi-squared).
 * Used on each column of a Vigenère ciphertext once the key length is known.
 */
export function bestShift(text: string): { shift: number; score: number } {
  const t = lettersOnly(text);
  if (!t) return { shift: 0, score: Infinity };
  let best = { shift: 0, score: Infinity };
  for (let s = 0; s < 26; s++) {
    const counts = Array(26).fill(0);
    for (const c of t) counts[mod26(c.charCodeAt(0) - 65 - s)]++;
    const score = counts.reduce((sum, obs, i) => {
      const exp = ENGLISH_FREQ[i] * t.length;
      return sum + (obs - exp) ** 2 / exp;
    }, 0);
    if (score < best.score) best = { shift: s, score };
  }
  return best;
}
