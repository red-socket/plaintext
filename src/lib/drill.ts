/**
 * The "What is it?" drill: a generated sample of one technique, and choices to tell it apart.
 * Technique ids match Field Guide entry ids, so the page can show that entry's signs.
 */
import { ALPHABET, caesarEncrypt } from './caesar';
import { atbash, baconEncode, columnarEncrypt, polybiusEncode, railFenceEncrypt, substitute, vigenereEncrypt } from './classical';
import { a1z26Encode, asciiEncode, base32Encode, base64Encode, binaryEncode, hexEncode, keypadEncode, morseEncode } from './encodings';
import { PHRASES, rng } from './practice';

export type DrillTechnique =
  | 'caesar'
  | 'rot13'
  | 'atbash'
  | 'substitution'
  | 'vigenere'
  | 'rail-fence'
  | 'a1z26'
  | 'phone-keypad'
  | 'polybius'
  | 'ascii'
  | 'binary'
  | 'morse'
  | 'hex'
  | 'base64'
  | 'base32'
  | 'bacon'
  | 'pigpen';

export const DRILL_TECHNIQUES: DrillTechnique[] = [
  'caesar', 'rot13', 'atbash', 'substitution', 'vigenere', 'rail-fence',
  'a1z26', 'phone-keypad', 'polybius', 'ascii', 'binary', 'morse',
  'hex', 'base64', 'base32', 'bacon', 'pigpen',
];

/**
 * Techniques you can't tell apart by looking at a short sample. They never appear as each
 * other's wrong choices, so every round has one answer you could reach by observation.
 */
const LOOKALIKES: DrillTechnique[][] = [['caesar', 'rot13', 'atbash', 'substitution', 'vigenere']];

export function lookalikes(t: DrillTechnique): DrillTechnique[] {
  return LOOKALIKES.find((g) => g.includes(t))?.filter((x) => x !== t) ?? [];
}

const KEYS = ['LEMON', 'RAVEN', 'ORCHID', 'CANDLE', 'HARBOUR', 'MIRROR', 'SPARROW', 'COPPER'];

export type DrillRound = {
  technique: DrillTechnique;
  sample: string;
  /** How to show it: as text, or drawn as pigpen symbols. */
  display: 'text' | 'pigpen';
  plaintext: string;
  /** What was used, in words: "shift 7", "key RAVEN". */
  detail?: string;
  choices: DrillTechnique[];
};

/** Byte encodings and two-symbol codes get long fast, so they use only the first few words. */
const short = (p: string, words: number) => p.split(' ').slice(0, words).join(' ');

function make(t: DrillTechnique, phrase: string, r: () => number): Omit<DrillRound, 'technique' | 'choices'> {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  switch (t) {
    case 'caesar': {
      const shift = pick([...Array(25).keys()].map((i) => i + 1).filter((s) => s !== 13));
      return { sample: caesarEncrypt(phrase, shift), display: 'text', plaintext: phrase, detail: `shift ${shift}` };
    }
    case 'rot13':
      return { sample: caesarEncrypt(phrase, 13), display: 'text', plaintext: phrase };
    case 'atbash':
      return { sample: atbash(phrase), display: 'text', plaintext: phrase };
    case 'substitution': {
      const key = [...ALPHABET].map((c) => ({ c, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.c).join('');
      return { sample: substitute(phrase, key), display: 'text', plaintext: phrase, detail: 'a random alphabet' };
    }
    case 'vigenere': {
      const key = pick(KEYS);
      return { sample: vigenereEncrypt(phrase, key), display: 'text', plaintext: phrase, detail: `key ${key}` };
    }
    case 'rail-fence': {
      if (r() < 0.5) {
        const rails = 2 + Math.floor(r() * 3);
        return { sample: railFenceEncrypt(phrase, rails), display: 'text', plaintext: phrase, detail: `rail fence, ${rails} rails` };
      }
      const key = pick(KEYS);
      return { sample: columnarEncrypt(phrase, key), display: 'text', plaintext: phrase, detail: `columns under ${key}` };
    }
    case 'a1z26':
      return { sample: a1z26Encode(phrase), display: 'text', plaintext: phrase };
    case 'phone-keypad':
      return { sample: keypadEncode(short(phrase, 3)), display: 'text', plaintext: short(phrase, 3) };
    case 'polybius':
      return { sample: polybiusEncode(phrase), display: 'text', plaintext: phrase };
    case 'ascii':
      return { sample: asciiEncode(short(phrase, 3)), display: 'text', plaintext: short(phrase, 3) };
    case 'binary':
      return { sample: binaryEncode(short(phrase, 2)), display: 'text', plaintext: short(phrase, 2) };
    case 'morse':
      return { sample: morseEncode(short(phrase, 4)), display: 'text', plaintext: short(phrase, 4) };
    case 'hex':
      return { sample: hexEncode(short(phrase, 3)), display: 'text', plaintext: short(phrase, 3) };
    case 'base64':
      return { sample: base64Encode(short(phrase, 4)), display: 'text', plaintext: short(phrase, 4) };
    case 'base32':
      return { sample: base32Encode(short(phrase, 3)), display: 'text', plaintext: short(phrase, 3) };
    case 'bacon':
      return { sample: baconEncode(short(phrase, 2)), display: 'text', plaintext: short(phrase, 2) };
    case 'pigpen':
      return { sample: phrase, display: 'pigpen', plaintext: phrase };
  }
}

/** One round from `pool`: the technique, its sample, and four choices (fewer if the pool is small). */
export function makeDrillRound(seed: number, pool: DrillTechnique[] = DRILL_TECHNIQUES): DrillRound {
  const r = rng(seed);
  const technique = pool[Math.floor(r() * pool.length)];
  const phrase = PHRASES[Math.floor(r() * PHRASES.length)];
  // Wrong choices come from the whole set, so a small pool still gets real alternatives.
  const banned = new Set([technique, ...lookalikes(technique)]);
  const others = DRILL_TECHNIQUES.filter((t) => !banned.has(t))
    .map((t) => ({ t, k: r() }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 3)
    .map((x) => x.t);
  const choices = [technique, ...others].map((t) => ({ t, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.t);
  return { technique, choices, ...make(technique, phrase, r) };
}
