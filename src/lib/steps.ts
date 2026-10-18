/**
 * How a puzzle's ciphertext was made, as a list of steps applied to the plaintext in order.
 * The content schema re-runs these at build time and fails if the result isn't the ciphertext.
 */
import { caesarEncrypt } from './caesar';
import { zeroWidthHide } from './hidden';
import { toMojibake } from './unicode';
import { md5, sha256 } from './digest';
import { enigmaText, rsaLetters, xorText } from './modern';
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
  /** UTF-8 bytes misread as Windows-1252: café becomes cafÃ©. */
  | { type: 'mojibake' }
  /** XOR with a text key (repeated), or a hex key; output is spaced hex. */
  | { type: 'xor'; key?: string; keyHex?: string }
  /** Enigma I. Output in groups of `group` letters (0 for none). */
  | { type: 'enigma'; rotors: [string, string, string]; reflector: string; rings: string; positions: string; plugs?: string; group?: number }
  /** Textbook RSA on each letter's A1Z26 number. */
  | { type: 'rsa'; n: number; e: number }
  | { type: 'md5' }
  | { type: 'sha256' }
  /** Each character as its Unicode code point, U+0041. */
  | { type: 'codepoints' }
  /** Hides the text as invisible zero-width characters inside a cover sentence. */
  | { type: 'zero-width'; cover: string }
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
    case 'mojibake':
      return toMojibake(text);
    case 'xor':
      return xorText(text, step.keyHex !== undefined ? { hex: step.keyHex } : { text: step.key ?? '' });
    case 'enigma':
      return enigmaText(text, step, step.group ?? 5);
    case 'rsa':
      return rsaLetters(text, step.n, step.e);
    case 'md5':
      return md5(text);
    case 'sha256':
      return sha256(text);
    case 'codepoints':
      return [...text].map((c) => 'U+' + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');
    case 'zero-width':
      return zeroWidthHide(text, step.cover);
    case 'reverse':
      return [...text].reverse().join('');
    case 'map':
      return [...text].map((c) => step.map[c] ?? c).join('');
  }
}

export const applySteps = (plaintext: string, steps: Step[]) => steps.reduce(applyStep, plaintext);
