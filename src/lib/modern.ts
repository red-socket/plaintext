/**
 * Modern ideas at a playable size: XOR and the one-time pad, the Enigma machine, and
 * Diffie–Hellman and RSA with numbers small enough to follow by hand.
 */

// ── XOR ────────────────────────────────────────────────────────────────

const enc = new TextEncoder();

export const fromHex = (hex: string) => Uint8Array.from((hex.replace(/[^0-9a-f]/gi, '').match(/../g) ?? []).map((h) => parseInt(h, 16)));
export const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

/** XORs data with a key, repeating the key as needed. */
export function xorBytes(data: Uint8Array, key: Uint8Array): Uint8Array {
  if (!key.length) return data.slice();
  return data.map((b, i) => b ^ key[i % key.length]);
}

/** Text XOR a text or hex key, as spaced hex. */
export function xorText(text: string, key: { text?: string; hex?: string }): string {
  const k = key.hex !== undefined ? fromHex(key.hex) : enc.encode(key.text ?? '');
  return toHex(xorBytes(enc.encode(text), k));
}

/** Best effort: bytes as text, with unprintable bytes shown as a dot. */
export const bytesAsText = (bytes: Uint8Array) => Array.from(bytes, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '·')).join('');

// ── Enigma ─────────────────────────────────────────────────────────────

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Wirings of the Enigma I (Wehrmacht) rotors and reflectors, with each rotor's turnover notch. */
export const ROTORS: Record<string, { wiring: string; notch: string }> = {
  I: { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  II: { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMOUSQ', notch: 'V' },
  IV: { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  V: { wiring: 'VZBRGITYUPSDNHLXAWMJQOFECK', notch: 'Z' },
};
export const REFLECTORS: Record<string, string> = {
  B: 'YRUHQSLDPXNGOKMIEBFZCWVJAT',
  C: 'FVPJIAOYEDRZXWGCTKUQSBNMHL',
};

export type EnigmaSettings = {
  /** Left to right, e.g. ['I', 'II', 'III']. */
  rotors: [string, string, string];
  reflector: string;
  /** Ring settings (Ringstellung), left to right, as letters. */
  rings: string;
  /** Start positions (Grundstellung), left to right, as letters. */
  positions: string;
  /** Plugboard pairs, e.g. "AB CD EF". */
  plugs?: string;
};

const mod = (n: number, m = 26) => ((n % m) + m) % m;
const idx = (c: string) => c.toUpperCase().charCodeAt(0) - 65;

/** Parses plugboard pairs; throws if a letter is used twice. */
export function plugboard(pairs = ''): number[] {
  const map = [...Array(26).keys()];
  const used = new Set<string>();
  for (const pair of pairs.toUpperCase().match(/[A-Z]{2}/g) ?? []) {
    const [x, y] = pair;
    if (used.has(x) || used.has(y) || x === y) throw new Error(`Plug ${pair} reuses a letter`);
    used.add(x);
    used.add(y);
    map[idx(x)] = idx(y);
    map[idx(y)] = idx(x);
  }
  return map;
}

/** A running Enigma: call `press` for each letter. Positions advance before each letter, like the real machine. */
export function enigma(s: EnigmaSettings) {
  const rotors = s.rotors.map((r) => {
    const def = ROTORS[r];
    if (!def) throw new Error(`Unknown rotor ${r}`);
    const fwd = [...def.wiring].map(idx);
    const back = Array(26);
    fwd.forEach((o, i) => (back[o] = i));
    return { fwd, back, notch: idx(def.notch) };
  });
  const refl = [...(REFLECTORS[s.reflector] ?? REFLECTORS.B)].map(idx);
  const rings = [...s.rings.toUpperCase()].map(idx);
  const pos = [...s.positions.toUpperCase()].map(idx);
  const plug = plugboard(s.plugs);

  const through = (c: number, r: number, dir: 'fwd' | 'back') => {
    const shift = pos[r] - rings[r];
    return mod(rotors[r][dir][mod(c + shift)] - shift);
  };

  function step() {
    // The middle rotor steps when it is at its own notch (the "double step"), or when the right one is.
    if (pos[1] === rotors[1].notch) {
      pos[1] = mod(pos[1] + 1);
      pos[0] = mod(pos[0] + 1);
    } else if (pos[2] === rotors[2].notch) {
      pos[1] = mod(pos[1] + 1);
    }
    pos[2] = mod(pos[2] + 1);
  }

  return {
    press(letter: string): string {
      step();
      let c = plug[idx(letter)];
      for (const r of [2, 1, 0]) c = through(c, r, 'fwd');
      c = refl[c];
      for (const r of [0, 1, 2]) c = through(c, r, 'back');
      return A[plug[c]];
    },
    positions: () => pos.map((p) => A[p]).join(''),
  };
}

/** Encrypts (or decrypts: Enigma is its own inverse) the letters of `text`, optionally in groups. */
export function enigmaText(text: string, s: EnigmaSettings, group = 0): string {
  const m = enigma(s);
  const out = [...text.toUpperCase().replace(/[^A-Z]/g, '')].map((c) => m.press(c)).join('');
  return group ? (out.match(new RegExp(`.{1,${group}}`, 'g')) ?? []).join(' ') : out;
}

// ── Modular arithmetic, Diffie–Hellman, RSA ────────────────────────────

/** base^exp mod m, with BigInt so nothing overflows. */
export function modPow(base: number, exp: number, m: number): number {
  let r = 1n;
  let b = BigInt(mod(base, m));
  let e = BigInt(exp);
  const M = BigInt(m);
  while (e > 0n) {
    if (e & 1n) r = (r * b) % M;
    b = (b * b) % M;
    e >>= 1n;
  }
  return Number(r);
}

/** The secret exponent behind a public value, found by trying every one. Only feasible because p is small. */
export function discreteLog(g: number, value: number, p: number): number | null {
  let x = 1;
  for (let k = 0; k < p; k++) {
    if (x === mod(value, p) && k > 0) return k;
    x = (x * g) % p;
  }
  return null;
}

export function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return Math.abs(a);
}

/** Modular inverse by the extended Euclidean algorithm; null if none exists. */
export function modInverse(a: number, m: number): number | null {
  let [r0, r1] = [mod(a, m), m];
  let [s0, s1] = [1, 0];
  while (r1) {
    const q = Math.floor(r0 / r1);
    [r0, r1] = [r1, r0 - q * r1];
    [s0, s1] = [s1, s0 - q * s1];
  }
  return r0 === 1 ? mod(s0, m) : null;
}

/** Splits n into two factors by trial division. Instant for small n, hopeless for real keys. */
export function factor(n: number): [number, number] | null {
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return [d, n / d];
  return null;
}

export function rsaKeys(p: number, q: number, e: number): { n: number; phi: number; e: number; d: number } | null {
  const phi = (p - 1) * (q - 1);
  const d = modInverse(e, phi);
  return d === null ? null : { n: p * q, phi, e, d };
}

/** Textbook RSA on each letter's A1Z26 number: c = m^e mod n. Words separated by " / ". */
export function rsaLetters(text: string, n: number, e: number): string {
  return text
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean)
    .map((w) => [...w].map((c) => modPow(idx(c) + 1, e, n)).join(' '))
    .join(' / ');
}

export function rsaNumbers(numbers: number[], exp: number, n: number): number[] {
  return numbers.map((x) => modPow(x, exp, n));
}

