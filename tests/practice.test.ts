import { describe, expect, it } from 'vitest';
import { caesarDecrypt } from '../src/lib/caesar';
import { judge, makeRound, PHRASES, rng } from '../src/lib/practice';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(rng(1)()).not.toBe(rng(2)());
  });
});

describe('makeRound', () => {
  it('makes solvable rounds with shifts 1–25', () => {
    for (let seed = 0; seed < 500; seed++) {
      const r = makeRound(seed, 'unknown');
      expect(r.shift).toBeGreaterThanOrEqual(1);
      expect(r.shift).toBeLessThanOrEqual(25);
      expect(caesarDecrypt(r.ciphertext, r.shift!)).toBe(r.plaintext);
      expect(r.ciphertext).not.toBe(r.plaintext);
    }
  });

  it('uses shift 13 for ROT13 rounds', () => {
    expect(makeRound(7, 'rot13').shift).toBe(13);
  });

  it('keeps the phrase bank clean: letters and spaces only, no repeats', () => {
    for (const p of PHRASES) expect(p).toMatch(/^[A-Z]+( [A-Z]+)*$/);
    expect(new Set(PHRASES).size).toBe(PHRASES.length);
  });
});

describe('judge', () => {
  const round = makeRound(3, 'given');

  it('accepts the message in any case and spacing', () => {
    expect(judge(round, round.plaintext.toLowerCase().replace(/ /g, '')).kind).toBe('solved');
  });

  it('nudges on the shift or a correct start', () => {
    expect(judge(round, String(round.shift)).kind).toBe('close');
    expect(judge(round, round.plaintext.slice(0, 8)).kind).toBe('close');
  });

  it('rejects the ciphertext itself', () => {
    expect(judge(round, round.ciphertext).kind).toBe('wrong');
  });
});

describe('Vigenère practice', () => {
  it('makes solvable rounds; candidates include the key', async () => {
    const { vigenereDecrypt } = await import('../src/lib/classical');
    for (let seed = 0; seed < 300; seed++) {
      const given = makeRound(seed, 'given', 'vigenere');
      expect(vigenereDecrypt(given.ciphertext, given.key!)).toBe(given.plaintext);
      const pick = makeRound(seed, 'candidates', 'vigenere');
      expect(pick.candidates).toHaveLength(4);
      expect(pick.candidates).toContain(pick.key);
      expect(new Set(pick.candidates).size).toBe(4);
    }
  });

  it('nudges when the key is typed instead of the message', () => {
    const r = makeRound(5, 'given', 'vigenere');
    expect(judge(r, r.key!.toLowerCase()).kind).toBe('close');
  });
});
