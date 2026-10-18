import { describe, expect, it } from 'vitest';
import {
  bytesAsText,
  discreteLog,
  enigma,
  enigmaText,
  factor,
  fromHex,
  gcd,
  modInverse,
  modPow,
  plugboard,
  rsaKeys,
  rsaLetters,
  rsaNumbers,
  xorBytes,
  xorText,
} from '../src/lib/modern';

describe('XOR', () => {
  it('undoes itself', () => {
    const ct = xorText('HELLO', { text: 'KEY' });
    expect(bytesAsText(xorBytes(fromHex(ct), new TextEncoder().encode('KEY')))).toBe('HELLO');
  });

  it('flips case with 0x20 and leaves data alone with 0', () => {
    expect(xorText('A', { hex: '20' })).toBe('61');
    expect(xorText('A', { hex: '00' })).toBe('41');
  });

  it('two messages under the same pad XOR to the XOR of the plaintexts', () => {
    const key = fromHex('1F 2E 3D 4C 5B 6A 79 88');
    const enc = (s: string) => xorBytes(new TextEncoder().encode(s), key);
    const both = xorBytes(enc('ATTACKAT'), enc('RETREATS'));
    expect(bytesAsText(xorBytes(both, new TextEncoder().encode('ATTACKAT')))).toBe('RETREATS');
  });
});

describe('Enigma', () => {
  const base = { rotors: ['I', 'II', 'III'] as [string, string, string], reflector: 'B', rings: 'AAA', positions: 'AAA' };

  it('matches the classic test vector', () => {
    expect(enigmaText('AAAAA', base)).toBe('BDZGO');
  });

  it('double-steps the middle rotor', () => {
    const m = enigma({ ...base, positions: 'ADU' });
    const seen = [];
    for (let i = 0; i < 3; i++) {
      m.press('A');
      seen.push(m.positions());
    }
    expect(seen).toEqual(['ADV', 'AEW', 'BFX']);
  });

  it('is its own inverse, and never encrypts a letter to itself', () => {
    const s = { rotors: ['IV', 'II', 'V'] as [string, string, string], reflector: 'C', rings: 'QEV', positions: 'LMN', plugs: 'AZ BY CX' };
    const text = 'THEQUICKBROWNFOXJUMPSOVERTHELAZYDOG'.repeat(4);
    const ct = enigmaText(text, s);
    expect(enigmaText(ct, s)).toBe(text);
    for (let i = 0; i < text.length; i++) expect(ct[i]).not.toBe(text[i]);
  });

  it('rejects a plugboard that reuses a letter', () => {
    expect(() => plugboard('AB AC')).toThrow(/reuses/);
    expect(plugboard('AB')[0]).toBe(1);
  });

  it('groups output in fives', () => {
    expect(enigmaText('AAAAAAA', base, 5)).toMatch(/^[A-Z]{5} [A-Z]{2}$/);
  });
});

describe('Diffie–Hellman and RSA', () => {
  it('modular powers', () => {
    expect(modPow(3, 4, 7)).toBe(4);
    expect(modPow(5, 6, 23)).toBe(8);
    expect(modPow(123456, 65537, 1000003)).toBe(Number((123456n ** 65537n) % 1000003n));
  });

  it('both sides of a key exchange reach the same secret', () => {
    const [p, g, a, b] = [23, 5, 6, 15];
    const A = modPow(g, a, p);
    const B = modPow(g, b, p);
    expect(A).toBe(8);
    expect(B).toBe(19);
    expect(modPow(B, a, p)).toBe(modPow(A, b, p));
    expect(modPow(B, a, p)).toBe(2);
  });

  it('a small exponent can be found by trying', () => {
    const p = 97;
    const A = modPow(5, 37, p);
    const a = discreteLog(5, A, p)!;
    expect(modPow(5, a, p)).toBe(A);
  });

  it('gcd, inverses and factoring', () => {
    expect(gcd(40, 3)).toBe(1);
    expect(modInverse(3, 40)).toBe(27);
    expect(modInverse(4, 40)).toBeNull();
    expect(factor(3233)).toEqual([53, 61]);
    expect(factor(97)).toBeNull();
  });

  it('matches the textbook RSA example', () => {
    const k = rsaKeys(61, 53, 17)!;
    expect(k).toEqual({ n: 3233, phi: 3120, e: 17, d: 2753 });
    expect(rsaNumbers([65], 17, 3233)).toEqual([2790]);
    expect(rsaNumbers([2790], 2753, 3233)).toEqual([65]);
  });

  it('encrypts letters one at a time', () => {
    const ct = rsaLetters('AB C', 55, 3);
    expect(ct).toBe('1 8 / 27');
    expect(rsaNumbers([1, 8, 27], 27, 55)).toEqual([1, 2, 3]);
  });
});

describe('puzzle data the build does not check', () => {
  it('the reused pad: message 1 is the weather report under the same key', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/content/puzzles/xor-3-twice.mdx', 'utf8');
    const key = src.match(/keyHex: "([0-9A-F]+)"/)![1];
    expect(src).toContain(xorText('WEATHER REPORT: CLEAR SKIES OVER THE BAY', { hex: key }));
  });

  it('only telegram B has a valid signature', () => {
    const ok = (m: number, s: number) => modPow(s, 17, 3233) === m;
    expect([ok(877, 1328), ok(1204, 2993), ok(2650, 619)]).toEqual([false, true, false]);
  });

  it('only FLAMINGO can sit under CBSXUJKT', () => {
    const fits = (w: string) => [...w].every((c, i) => c !== 'CBSXUJKT'[i]);
    expect(['COCKATOO', 'FLAMINGO', 'PARAKEET', 'SKYLARKS'].filter(fits)).toEqual(['FLAMINGO']);
  });
});
