/**
 * How a puzzle's ciphertext was made, as a list of steps applied to the plaintext in order.
 * The content schema re-runs these at build time and fails if the result isn't the ciphertext.
 */
import { caesarEncrypt } from './caesar';
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
    case 'reverse':
      return [...text].reverse().join('');
    case 'map':
      return [...text].map((c) => step.map[c] ?? c).join('');
  }
}

export const applySteps = (plaintext: string, steps: Step[]) => steps.reduce(applyStep, plaintext);
