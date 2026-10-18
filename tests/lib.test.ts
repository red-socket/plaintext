import { describe, expect, it } from 'vitest';
import { allShifts, caesar, caesarDecrypt, caesarEncrypt } from '../src/lib/caesar';
import { normalizeAnswer } from '../src/lib/normalize';
import { open, sealAll } from '../src/lib/seal';

describe('normalizeAnswer', () => {
  it('ignores case, spaces, punctuation and accents', () => {
    expect(normalizeAnswer('  Lighthouse keeper! ')).toBe('LIGHTHOUSEKEEPER');
    expect(normalizeAnswer('Café-15')).toBe('CAFE15');
    expect(normalizeAnswer('?!')).toBe('');
  });
});

describe('caesar', () => {
  it('shifts letters, keeps case and everything else', () => {
    expect(caesarEncrypt('Hello, World!', 3)).toBe('Khoor, Zruog!');
    expect(caesarDecrypt('Khoor, Zruog!', 3)).toBe('Hello, World!');
  });

  it('wraps around the alphabet and accepts any integer shift', () => {
    expect(caesar('XYZ', 3)).toBe('ABC');
    expect(caesar('ABC', -1)).toBe('ZAB');
    expect(caesar('ABC', 29)).toBe('DEF');
  });

  it('ROT13 is its own inverse', () => {
    expect(caesar(caesar('Spoilers', 13), 13)).toBe('Spoilers');
  });

  it('allShifts covers the key space', () => {
    const all = allShifts('KHOOR');
    expect(all).toHaveLength(25);
    expect(all.find((s) => s.shift === 3)?.text).toBe('HELLO');
  });
});

describe('seal / open', () => {
  const items = [
    { answer: 'Aqueduct', payload: { type: 'solve' as const, writeup: 'Shift back by 3.' } },
    { answer: 'III', payload: { type: 'partial' as const, reply: "That's the key." } },
  ];

  it('opens with any form of the right answer', async () => {
    const entries = await sealAll('p1', items);
    expect(await open('p1', 'aqueduct ', entries)).toEqual(items[0].payload);
    expect(await open('p1', 'iii', entries)).toEqual(items[1].payload);
  });

  it('rejects wrong answers, empty answers and other scopes', async () => {
    const entries = await sealAll('p1', items);
    expect(await open('p1', 'aqueducts', entries)).toBeNull();
    expect(await open('p1', '!!', entries)).toBeNull();
    expect(await open('p2', 'aqueduct', entries)).toBeNull();
  });

  it('keeps answers out of the sealed data', async () => {
    const entries = await sealAll('p1', items);
    expect(JSON.stringify(entries)).not.toMatch(/aqueduct|shift back/i);
  });
});
