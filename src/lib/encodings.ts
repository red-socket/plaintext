/**
 * Encodings: public rules with no key. Each has an encoder (used to make and verify puzzles)
 * and a forgiving decoder (used by tools, which get whatever the player pastes).
 * Decoders mark anything they can't read with "?" instead of throwing.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

// ── A1Z26 ──────────────────────────────────────────────────────────────

/** Letters to numbers: dashes between letters, spaces between words. `start` 0 gives A0Z25. */
export function a1z26Encode(text: string, start = 1): string {
  return words(text)
    .map((w) => [...w].map((c) => c.charCodeAt(0) - 65 + start).join('-'))
    .join(' ');
}

export function a1z26Decode(text: string, start = 1): string {
  return text
    .trim()
    .split(/\s*[\/|]\s*|\s+/)
    .filter(Boolean)
    .map((w) =>
      w
        .split(/[^0-9]+/)
        .filter(Boolean)
        .map((n) => {
          const i = Number(n) - start;
          return i >= 0 && i < 26 ? String.fromCharCode(65 + i) : '?';
        })
        .join(''),
    )
    .join(' ');
}

// ── Phone keypad (multi-tap) ───────────────────────────────────────────

export const KEYPAD: Record<string, string> = { '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ' };

/** Each letter is its key pressed n times; 0 is a space, as on old phones. */
export function keypadEncode(text: string): string {
  return words(text)
    .map((w) =>
      [...w]
        .map((c) => {
          const [key, letters] = Object.entries(KEYPAD).find(([, l]) => l.includes(c))!;
          return key.repeat(letters.indexOf(c) + 1);
        })
        .join(' '),
    )
    .join(' 0 ');
}

export function keypadDecode(text: string): string {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => {
      if (/^0+$/.test(tok)) return ' ';
      const letters = KEYPAD[tok[0]];
      if (!letters || !/^(\d)\1*$/.test(tok)) return '?';
      return letters[(tok.length - 1) % letters.length];
    })
    .join('');
}

// ── Morse ──────────────────────────────────────────────────────────────

export const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---',
  K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-',
  U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-',
  '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '-': '-....-',
};

const FROM_MORSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

/** Spaces between letters, " / " between words. Characters without a code are dropped. */
export function morseEncode(text: string): string {
  return text
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .map((w) => [...w].map((c) => MORSE[c]).filter(Boolean).join(' '))
    .filter(Boolean)
    .join(' / ');
}

/** Accepts . and - plus the usual stand-ins (· • _ — –), words split by / or |. */
export function morseDecode(text: string): string {
  return text
    .replace(/[·•]/g, '.')
    .replace(/[_—–−]/g, '-')
    .trim()
    .split(/\s*[\/|]\s*/)
    .map((w) =>
      w
        .split(/\s+/)
        .filter(Boolean)
        .map((code) => FROM_MORSE[code] ?? '?')
        .join(''),
    )
    .join(' ');
}

// ── Bytes: binary, decimal, hex ────────────────────────────────────────

const bytesOf = (text: string) => enc.encode(text);
const textOf = (bytes: number[]) => dec.decode(new Uint8Array(bytes));

export const binaryEncode = (text: string) => [...bytesOf(text)].map((b) => b.toString(2).padStart(8, '0')).join(' ');

export function binaryDecode(text: string): string {
  const bits = text.replace(/[^01]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return textOf(bytes) + (bits.length % 8 ? '?' : '');
}

export const asciiEncode = (text: string) => [...bytesOf(text)].join(' ');

export function asciiDecode(text: string): string {
  const nums = text.match(/\d+/g) ?? [];
  return nums.map((n) => (Number(n) < 256 ? textOf([Number(n)]) : '?')).join('');
}

export const hexEncode = (text: string) => [...bytesOf(text)].map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

export function hexDecode(text: string): string {
  const hex = text.replace(/0x/gi, '').replace(/[^0-9a-f]/gi, '');
  const bytes: number[] = [];
  for (let i = 0; i + 2 <= hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16));
  return textOf(bytes) + (hex.length % 2 ? '?' : '');
}

// ── Base64 and Base32 ──────────────────────────────────────────────────

export function base64Encode(text: string): string {
  let s = '';
  for (const b of bytesOf(text)) s += String.fromCharCode(b);
  return btoa(s);
}

/** Tolerates whitespace, missing padding and the URL-safe alphabet. Throws on anything else. */
export function base64Decode(text: string): string {
  let s = text.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s)) throw new Error('Base64 uses only A–Z, a–z, 0–9, + and /, with = at the end.');
  s = s.replace(/=+$/, '');
  if (s.length % 4 === 1) throw new Error('That length can’t be Base64. A character is missing or extra.');
  s += '='.repeat((4 - (s.length % 4)) % 4);
  return textOf([...atob(s)].map((c) => c.charCodeAt(0)));
}

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(text: string): string {
  let bits = '';
  for (const b of bytesOf(text)) bits += b.toString(2).padStart(8, '0');
  let out = '';
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)];
  return out + '='.repeat((8 - (out.length % 8)) % 8);
}

export function base32Decode(text: string): string {
  const s = text.replace(/\s+/g, '').toUpperCase().replace(/=+$/, '');
  if (!/^[A-Z2-7]*$/.test(s)) throw new Error('Base32 uses only A–Z and 2–7, with = at the end.');
  let bits = '';
  for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return textOf(bytes);
}

// ── helpers ────────────────────────────────────────────────────────────

/** Uppercase words of letters only; everything else is a word break. */
function words(text: string): string[] {
  return text.toUpperCase().split(/[^A-Z]+/).filter(Boolean);
}
