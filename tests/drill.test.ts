import { describe, expect, it } from 'vitest';
import { caesarDecrypt } from '../src/lib/caesar';
import { base64Decode, hexDecode, morseDecode } from '../src/lib/encodings';
import { DRILL_TECHNIQUES, lookalikes, makeDrillRound } from '../src/lib/drill';

describe('drill rounds', () => {
  it('always has the answer among four distinct choices, and no lookalikes', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const r = makeDrillRound(seed);
      expect(r.choices).toContain(r.technique);
      expect(new Set(r.choices).size).toBe(4);
      for (const l of lookalikes(r.technique)) expect(r.choices).not.toContain(l);
      expect(r.sample.length).toBeGreaterThan(0);
    }
  });

  it('covers every technique', () => {
    const seen = new Set(Array.from({ length: 2000 }, (_, s) => makeDrillRound(s).technique));
    expect([...seen].sort()).toEqual([...DRILL_TECHNIQUES].sort());
  });

  it('respects a smaller pool but still offers four choices', () => {
    for (let seed = 0; seed < 200; seed++) {
      const r = makeDrillRound(seed, ['morse', 'binary']);
      expect(['morse', 'binary']).toContain(r.technique);
      expect(r.choices).toHaveLength(4);
    }
  });

  it('samples really are what they claim', () => {
    for (let seed = 0; seed < 2000; seed++) {
      const r = makeDrillRound(seed);
      if (r.technique === 'rot13') expect(caesarDecrypt(r.sample, 13)).toBe(r.plaintext);
      if (r.technique === 'morse') expect(morseDecode(r.sample)).toBe(r.plaintext);
      if (r.technique === 'hex') expect(hexDecode(r.sample)).toBe(r.plaintext);
      if (r.technique === 'base64') expect(base64Decode(r.sample)).toBe(r.plaintext);
      if (r.technique === 'caesar') expect(r.detail).not.toBe('shift 13');
    }
  });
});
