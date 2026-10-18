/** The regex lesson and puzzles depend on facts about the word list. Pin them. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const words = readFileSync('public/files/words.txt', 'utf8').trim().split('\n');
const find = (re: RegExp) => words.filter((w) => re.test(w));

describe('word list', () => {
  it('is lowercase letters only, sorted, without repeats', () => {
    expect(words.length).toBe(38015);
    expect(words.every((w) => /^[a-z]+$/.test(w))).toBe(true);
    expect(new Set(words).size).toBe(words.length);
    expect([...words].sort()).toEqual(words);
  });
});

describe('lesson facts', () => {
  it('^c.t$ has three matches', () => expect(find(/^c.t$/)).toEqual(['cat', 'cot', 'cut']));
  it('there are eleven five-letter palindromes', () => expect(find(/^(.)(.).\2\1$/)).toHaveLength(11));
  it('LISTEN has five anagrams, silent among them', () => {
    const anagrams = words.filter((w) => w.length === 6 && [...w].sort().join('') === 'eilnst');
    expect(anagrams).toEqual(['enlist', 'inlets', 'listen', 'silent', 'tinsel']);
  });
});

describe('puzzle facts', () => {
  it('only mystery fits ^.y.t.ry$', () => expect(find(/^.y.t.ry$/)).toEqual(['mystery']));
  it('bookkeeper is the shortest triple double', () => {
    expect(find(/(.)\1(.)\2(.)\3/).sort((a, b) => a.length - b.length)[0]).toBe('bookkeeper');
  });
  it('only facetious has the vowels in order, once each', () => {
    expect(find(/^[^aeiou]*a[^aeiou]*e[^aeiou]*i[^aeiou]*o[^aeiou]*u[^aeiou]*$/)).toEqual(['facetious']);
  });
});
