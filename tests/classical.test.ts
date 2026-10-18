import { describe, expect, it } from 'vitest';
import {
  atbash,
  baconDecode,
  baconEncode,
  baconFromCase,
  baconHide,
  bookDecode,
  bookEncode,
  columnarDecrypt,
  columnarEncrypt,
  factorCounts,
  frequencies,
  invertKey,
  kasiski,
  keywordAlphabet,
  pigpenGlyph,
  polybiusDecode,
  polybiusEncode,
  polybiusSquare,
  railFenceDecrypt,
  railFenceEncrypt,
  substitute,
  vigenereDecrypt,
  vigenereEncrypt,
} from '../src/lib/classical';

describe('substitution', () => {
  it('Atbash matches the Field Guide and undoes itself', () => {
    expect(atbash('HELLO WORLD')).toBe('SVOOL DLIOW');
    expect(atbash(atbash('Round trip!'))).toBe('Round trip!');
  });

  it('keyword alphabets match the classic ZEBRAS example', () => {
    const key = keywordAlphabet('zebras');
    expect(key).toBe('ZEBRASCDFGHIJKLMNOPQTUVWXY');
    expect(substitute('flee at once. we are discovered!', key)).toBe('siaa zq lkba. va zoa rfpbluaoar!');
    expect(substitute(substitute('Attack', key), invertKey(key))).toBe('Attack');
  });

  it('counts letter frequencies, most common first', () => {
    const f = frequencies('Banana!');
    expect(f[0]).toEqual({ letter: 'A', count: 3, share: 0.5 });
    expect(f[1].letter).toBe('N');
  });
});

describe('Polybius and tap code', () => {
  it('matches the Field Guide example and round-trips', () => {
    expect(polybiusEncode('Hello')).toBe('23 15 31 31 34');
    expect(polybiusDecode('23 15 31 31 34 / 52 34 42 31 14')).toBe('HELLO WORLD');
  });

  it('merges J into I, or K into C for tap code', () => {
    expect(polybiusSquare()).toHaveLength(25);
    expect(polybiusEncode('JI')).toBe('24 24');
    expect(polybiusSquare('', true).slice(0, 10)).toBe('ABCDEFGHIJ');
    expect(polybiusEncode('KC', '', true)).toBe('13 13');
    expect(polybiusEncode('water', '', true)).toBe('52 11 44 15 42');
  });

  it('supports a keyword square', () => {
    expect(polybiusSquare('ZEBRA').slice(0, 6)).toBe('ZEBRAC');
    expect(polybiusDecode(polybiusEncode('secret', 'zebra'), 'zebra')).toBe('SECRET');
  });
});

describe('Vigenère', () => {
  it('matches the LEMON example', () => {
    expect(vigenereEncrypt('ATTACK AT DAWN', 'LEMON')).toBe('LXFOPV EF RNHR');
    expect(vigenereDecrypt('LXFOPV EF RNHR', 'lemon')).toBe('ATTACK AT DAWN');
  });

  it('keeps case and skips non-letters without using up the key', () => {
    expect(vigenereDecrypt(vigenereEncrypt('Hi, there!', 'key'), 'key')).toBe('Hi, there!');
  });

  it('Kasiski finds the key length on a repetitive text', () => {
    const plain = 'THE CAT AND THE DOG AND THE BIRD AND THE FISH WENT TO THE MARKET AND THE CAT CAME BACK';
    const ct = vigenereEncrypt(plain, 'KEYS');
    const distances = kasiski(ct).flatMap((r) => r.distances);
    const best = factorCounts(distances).sort((a, b) => b.count - a.count || a.length - b.length);
    expect([2, 4]).toContain(best[0].length);
    expect(best.find((b) => b.length === 4)!.count).toBeGreaterThan(0);
  });
});

describe('transposition', () => {
  it('rail fence matches the classic example', () => {
    expect(railFenceEncrypt('WE ARE DISCOVERED FLEE AT ONCE', 3)).toBe('WECRLTEERDSOEEFEAOCAIVDEN');
    expect(railFenceDecrypt('WECRLTEERDSOEEFEAOCAIVDEN', 3)).toBe('WEAREDISCOVEREDFLEEATONCE');
    for (const rails of [2, 4, 5]) expect(railFenceDecrypt(railFenceEncrypt('ODDLENGTHMESSAGE', rails), rails)).toBe('ODDLENGTHMESSAGE');
  });

  it('columnar matches the ZEBRAS example and handles uneven columns', () => {
    expect(columnarEncrypt('WE ARE DISCOVERED FLEE AT ONCE', 'ZEBRAS')).toBe('EVLNACDTESEAROFODEECWIREE');
    expect(columnarDecrypt('EVLNACDTESEAROFODEECWIREE', 'ZEBRAS')).toBe('WEAREDISCOVEREDFLEEATONCE');
    expect(columnarDecrypt(columnarEncrypt('ATTACKATDAWNX', 'KEEP'), 'KEEP')).toBe('ATTACKATDAWNX');
  });
});

describe('Bacon', () => {
  it('matches the Field Guide example and round-trips', () => {
    expect(baconEncode('hello')).toBe('AABBB AABAA ABABB ABABB ABBBA');
    expect(baconDecode('AABBBAABAAABABBABABBABBBA')).toBe('HELLO');
  });

  it('24-letter variant merges I/J and U/V', () => {
    expect(baconEncode('J', 24)).toBe(baconEncode('I', 24));
    expect(baconEncode('V', 24)).toBe(baconEncode('U', 24));
    expect(baconDecode(baconEncode('WAX', 24), 24)).toBe('WAX');
  });

  it('hides a message in letter case', () => {
    const hidden = baconHide('HI', 'quiet night');
    expect(hidden).toBe('quIET nIght');
    expect(baconDecode(baconFromCase(hidden))).toBe('HI');
    expect(() => baconHide('HI', 'too short')).toThrow(/exactly 10 letters, has 8/);
  });
});

describe('book cipher', () => {
  const page = `The old house stood at the end of the lane
and nobody had lived there for years
but every night a light burned in the attic`;

  it('line-word uses first appearances and decodes back', () => {
    const code = bookEncode('the light', page, 'line-word');
    expect(code).toBe('1.1 3.5');
    expect(bookDecode(code, page, 'line-word')).toBe('THE LIGHT');
  });

  it('word-letter counts words through the whole text', () => {
    const code = bookEncode('hat', page, 'word-letter');
    expect(code).toBe('1.2 5.1 1.1');
    expect(bookDecode(code, page, 'word-letter')).toBe('HAT');
  });

  it('refuses words the source does not contain', () => {
    expect(() => bookEncode('zebra', page, 'line-word')).toThrow(/not in the source/);
  });
});

describe('pigpen', () => {
  it('maps the four sections', () => {
    expect(pigpenGlyph('A')).toEqual({ kind: 'grid', row: 0, col: 0, dot: false });
    expect(pigpenGlyph('R')).toEqual({ kind: 'grid', row: 2, col: 2, dot: true });
    expect(pigpenGlyph('S')).toEqual({ kind: 'x', side: 'top', dot: false });
    expect(pigpenGlyph('Z')).toEqual({ kind: 'x', side: 'bottom', dot: true });
    expect(pigpenGlyph('?')).toBeNull();
  });
});

describe('bestShift', () => {
  it('recovers a Caesar shift from ordinary English', async () => {
    const { caesarEncrypt } = await import('../src/lib/caesar');
    const { bestShift } = await import('../src/lib/classical');
    const text = 'It was the best of times and the worst of times, and nobody in the town could say which one this was.';
    expect(bestShift(caesarEncrypt(text, 11)).shift).toBe(11);
  });
});
