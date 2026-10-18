/**
 * Unicode and UTF-8: code points, the bytes behind them, and mojibake (UTF-8 bytes read as
 * Windows-1252, the "Ã©" that should have been "é").
 */

const enc = new TextEncoder();

export type CharInfo = { char: string; codePoint: string; bytes: string; kind: 'ascii' | 'latin' | 'other' };

export function inspect(text: string): CharInfo[] {
  return [...text].map((char) => {
    const cp = char.codePointAt(0)!;
    return {
      char,
      codePoint: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'),
      bytes: [...enc.encode(char)].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
      kind: cp < 0x80 ? 'ascii' : cp < 0x250 ? 'latin' : 'other',
    };
  });
}

/** Windows-1252 differs from Latin-1 only in 0x80–0x9F. Undefined slots keep their Latin-1 control code. */
const CP1252: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021,
  0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160, 0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018,
  0x92: 0x2019, 0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02dc,
  0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153, 0x9e: 0x017e, 0x9f: 0x0178,
};
const FROM_CP1252 = Object.fromEntries(Object.entries(CP1252).map(([b, cp]) => [cp, Number(b)]));

/** What UTF-8 text looks like when a program wrongly reads its bytes as Windows-1252. */
export function toMojibake(text: string): string {
  return [...enc.encode(text)].map((b) => String.fromCodePoint(CP1252[b] ?? b)).join('');
}

/**
 * Undoes mojibake: turns each character back into its Windows-1252 byte and reads the bytes as
 * UTF-8. Returns null if the text contains characters Windows-1252 can't hold (so it wasn't mojibake).
 */
export function fromMojibake(text: string): string | null {
  const bytes: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    const b = FROM_CP1252[cp] ?? (cp < 0x100 ? cp : -1);
    if (b < 0) return null;
    bytes.push(b);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Telltale pairs: Ã or Â followed by another accented character, or â€ sequences. */
export const looksLikeMojibake = (text: string) => /[ÃÂ][\u0080-ÿ]|â€/.test(text);
