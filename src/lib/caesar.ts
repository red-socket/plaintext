export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Wraps any integer shift into 0–25. */
export function mod26(n: number): number {
  return ((n % 26) + 26) % 26;
}

/**
 * Shifts every letter forward by `shift` (negative shifts go back).
 * Case is kept; anything that is not A–Z passes through unchanged.
 */
export function caesar(text: string, shift: number): string {
  const k = mod26(shift);
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= 'Z' ? 65 : 97;
    return String.fromCharCode(base + mod26(ch.charCodeAt(0) - base + k));
  });
}

export const caesarEncrypt = (text: string, shift: number) => caesar(text, shift);
export const caesarDecrypt = (text: string, shift: number) => caesar(text, -shift);

/** Every possible decryption, shifts 1–25: the whole key space. */
export function allShifts(text: string): { shift: number; text: string }[] {
  return Array.from({ length: 25 }, (_, i) => ({ shift: i + 1, text: caesarDecrypt(text, i + 1) }));
}
