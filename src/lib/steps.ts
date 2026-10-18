/**
 * How a puzzle's ciphertext was made, as a list of steps applied to the plaintext in order.
 * The content schema re-runs these at build time and fails if the result isn't the ciphertext.
 */
import { caesarEncrypt } from './caesar';
import {
  atbash,
  baconEncode,
  baconHide,
  bookEncode,
  columnarEncrypt,
  keywordAlphabet,
  polybiusEncode,
  railFenceEncrypt,
  substitute,
  vigenereEncrypt,
  type BookMode,
} from './classical';
import {
  a1z26Encode,
  asciiEncode,
  base32Encode,
  base64Encode,
  binaryEncode,
  hexEncode,
  keypadEncode,
  morseEncode,
} from './encodings';

export type Step =
  | { type: 'caesar'; shift: number }
  | { type: 'a1z26'; start?: number }
  | { type: 'keypad' }
  | { type: 'morse' }
  | { type: 'binary' }
  | { type: 'ascii' }
  | { type: 'hex' }
  | { type: 'base64' }
  | { type: 'base32' }
  | { type: 'atbash' }
  /** A full 26-letter cipher alphabet: plain A becomes key[0]. */
  | { type: 'substitution'; key: string }
  /** Substitution with a keyword alphabet (keyword first, then the rest of A–Z). */
  | { type: 'keyword'; keyword: string }
  | { type: 'polybius'; keyword?: string; tap?: boolean }
  | { type: 'vigenere'; key: string }
  | { type: 'railfence'; rails: number }
  | { type: 'columnar'; key: string }
  | { type: 'bacon'; variant?: 24 | 26 }
  /** Hides the text as Bacon in the case of a cover text (capitals are B). */
  | { type: 'bacon-case'; cover: string; variant?: 24 | 26 }
  /** References into a source text: "line.word" or "word.letter", first appearance. */
  | { type: 'book'; source: string; mode: BookMode }
  | { type: 'upper' }
  /** Reverses the whole string. */
  | { type: 'reverse' }
  /** Replaces single characters, e.g. { "0": "□", "1": "■" }. Others pass through. */
  | { type: 'map'; map: Record<string, string> };

export function applyStep(text: string, step: Step): string {
  switch (step.type) {
    case 'caesar':
      return caesarEncrypt(text, step.shift);
    case 'a1z26':
      return a1z26Encode(text, step.start ?? 1);
    case 'keypad':
      return keypadEncode(text);
    case 'morse':
      return morseEncode(text);
    case 'binary':
      return binaryEncode(text);
    case 'ascii':
      return asciiEncode(text);
    case 'hex':
      return hexEncode(text);
    case 'base64':
      return base64Encode(text);
    case 'base32':
      return base32Encode(text);
    case 'atbash':
      return atbash(text);
    case 'substitution':
      return substitute(text, step.key);
    case 'keyword':
      return substitute(text, keywordAlphabet(step.keyword));
    case 'polybius':
      return polybiusEncode(text, step.keyword ?? '', step.tap ?? false);
    case 'vigenere':
      return vigenereEncrypt(text, step.key);
    case 'railfence':
      return railFenceEncrypt(text, step.rails);
    case 'columnar':
      return columnarEncrypt(text, step.key);
    case 'bacon':
      return baconEncode(text, step.variant ?? 26);
    case 'bacon-case':
      return baconHide(text, step.cover, step.variant ?? 26);
    case 'book':
      return bookEncode(text, step.source, step.mode);
    case 'upper':
      return text.toUpperCase();
    case 'reverse':
      return [...text].reverse().join('');
    case 'map':
      return [...text].map((c) => step.map[c] ?? c).join('');
  }
}

export const applySteps = (plaintext: string, steps: Step[]) => steps.reduce(applyStep, plaintext);
