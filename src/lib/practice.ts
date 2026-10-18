/**
 * Generated practice rounds. Answers here are in the client on purpose:
 * practice has no writeup to protect and no record to keep.
 */
import { caesarEncrypt } from './caesar';
import { vigenereEncrypt } from './classical';
import { normalizeAnswer } from './normalize';

/** Small, fast, seedable PRNG (mulberry32). Same seed, same rounds. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PHRASES = [
  'MEET ME UNDER THE CLOCK AT NOON',
  'THE KEY IS TAPED UNDER THE DRAWER',
  'BRING THE MAP BUT LEAVE THE LANTERN',
  'THE THIRD BOOK ON THE SHELF IS HOLLOW',
  'DO NOT TRUST THE MAN IN THE GREEN COAT',
  'THE PASSWORD CHANGES EVERY TUESDAY',
  'LOOK BEHIND THE PAINTING OF THE SHIP',
  'THE TRAIN LEAVES AT MIDNIGHT FROM PLATFORM NINE',
  'COUNT THE STEPS FROM THE OLD OAK',
  'THE ANSWER WAS IN THE MARGINS ALL ALONG',
  'BURN THIS NOTE AFTER READING',
  'THE LIGHTHOUSE IS NOT EMPTY',
  'ASK THE BARTENDER FOR A BLUE MOON',
  'EVERY CLUE POINTS TO THE OBSERVATORY',
  'THE SAFE OPENS WITH HER BIRTHDAY',
  'WAIT FOR THE SECOND BELL BEFORE YOU MOVE',
  'THE RADIO PLAYS THE SAME SONG AT DAWN',
  'FOLLOW THE CANAL UNTIL THE BRIDGE ENDS',
  'A RED CANDLE MEANS THE DEAL IS OFF',
  'THE LAST PAGE OF THE DIARY IS MISSING',
  'HIDE THE LETTERS INSIDE THE PIANO',
  'THE CROW FLIES WEST AT SUNSET',
  'SOMEONE HAS BEEN READING OUR MAIL',
  'THE MUSEUM GUARD TAKES A BREAK AT FOUR',
  'NOTHING IS WRITTEN ON THE BACK OF THE CARD',
  'THE NUMBERS ON THE TICKET ARE COORDINATES',
  'SHE KNEW ABOUT THE TUNNEL ALL ALONG',
  'THE CODE WORD FOR TODAY IS PEPPERMINT',
  'TURN LEFT AT THE STATUE WITH NO HEAD',
  'THE FOG WILL COVER US UNTIL MORNING',
  'KEEP THE MATCHES DRY AND THE DOOR LOCKED',
  'THE GARDENER SAW EVERYTHING',
  'TWO KNOCKS THEN A PAUSE THEN ONE MORE',
  'THE SILVER SPOON IS A SIGNAL',
  'WE MOVE WHEN THE TIDE GOES OUT',
  'THE PHOTOGRAPH WAS TAKEN BEFORE THE FIRE',
  'LEAVE THE WINDOW OPEN AN INCH',
  'THE OWL ON THE ROOF IS A CAMERA',
  'THERE IS A SECOND DOOR IN THE CELLAR',
  'THE PARCEL ARRIVES ON FRIDAY BY BOAT',
] as const;

export type PracticeCipher = 'caesar' | 'vigenere';

/** Caesar: shift given, unknown, or ROT13. Vigenère: key given, or one of four candidate keys. */
export type PracticeMode = 'given' | 'unknown' | 'rot13' | 'candidates';

export const PRACTICE_MODES: Record<PracticeCipher, { id: PracticeMode; label: string; help: string }[]> = {
  caesar: [
    { id: 'given', label: 'Shift given', help: 'You get the shift. Practise decoding quickly and accurately.' },
    { id: 'unknown', label: 'Unknown shift', help: 'No key. Find the shift from the shape of the words, or try them all.' },
    { id: 'rot13', label: 'ROT13', help: 'Always 13. Learn to read GUR as THE on sight.' },
  ],
  vigenere: [
    { id: 'given', label: 'Key given', help: 'You get the keyword. Practise the shifting until it is automatic.' },
    { id: 'candidates', label: 'Pick the key', help: 'The key is one of four words. Try them; the right one reads as English.' },
  ],
};

export const KEYWORDS = ['LEMON', 'RAVEN', 'ORCHID', 'CANDLE', 'HARBOUR', 'MIRROR', 'SPARROW', 'COPPER', 'LANTERN', 'THISTLE', 'QUARTZ', 'WILLOW'] as const;

export type Round = {
  cipher: PracticeCipher;
  mode: PracticeMode;
  plaintext: string;
  ciphertext: string;
  shift?: number;
  key?: string;
  /** For "pick the key": four keywords, one of them right. */
  candidates?: string[];
};

export function makeRound(seed: number, mode: PracticeMode, cipher: PracticeCipher = 'caesar'): Round {
  const r = rng(seed);
  const plaintext = PHRASES[Math.floor(r() * PHRASES.length)];
  if (cipher === 'vigenere') {
    const pool = [...KEYWORDS].map((k) => ({ k, s: r() })).sort((a, b) => a.s - b.s).map((x) => x.k);
    const key = pool[0];
    const candidates = mode === 'candidates' ? pool.slice(0, 4).map((k) => ({ k, s: r() })).sort((a, b) => a.s - b.s).map((x) => x.k) : undefined;
    return { cipher, mode, plaintext, ciphertext: vigenereEncrypt(plaintext, key), key, candidates };
  }
  const shift = mode === 'rot13' ? 13 : 1 + Math.floor(r() * 25);
  return { cipher, mode, plaintext, ciphertext: caesarEncrypt(plaintext, shift), shift };
}

export type Verdict = { kind: 'solved' } | { kind: 'close'; text: string } | { kind: 'wrong'; text: string };

export function judge(round: Round, guess: string): Verdict {
  const g = normalizeAnswer(guess);
  const target = normalizeAnswer(round.plaintext);
  if (g === target) return { kind: 'solved' };
  if (round.shift !== undefined && g === String(round.shift)) return { kind: 'close', text: 'That’s the shift. Now decode the message with it.' };
  if (round.key && g === round.key) return { kind: 'close', text: 'That’s the key. Now decode the message with it.' };
  if (g.length >= 4 && target.startsWith(g)) return { kind: 'close', text: 'Right so far. Type the whole message.' };
  return { kind: 'wrong', text: 'Not quite. Check a few letters against the wheel.' };
}
