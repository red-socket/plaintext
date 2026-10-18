import { describe, expect, it } from 'vitest';
import { exportCode, importCode, mergeProgress, type Progress } from '../src/lib/progress';

const a: Progress = {
  v: 1,
  checks: { c1: 'FDW' },
  lessons: { caesar: { completedAt: 200 } },
  puzzles: {
    p1: { hints: 1, solvedAt: 300, answer: 'AQUEDUCT' },
    p2: { hints: 2 },
  },
};

const b: Progress = {
  v: 1,
  checks: { c2: 'WORLD' },
  lessons: { caesar: { completedAt: 100 } },
  puzzles: {
    p1: { hints: 0, solvedAt: 250, answer: 'AQUEDUCT' },
    p2: { hints: 1, solvedAt: 400, answer: 'LIGHTHOUSEKEEPER' },
    p3: { hints: 3 },
  },
};

describe('mergeProgress', () => {
  it('keeps everything from both saves', () => {
    const m = mergeProgress(a, b);
    expect(m.checks).toEqual({ c1: 'FDW', c2: 'WORLD' });
    expect(m.lessons.caesar.completedAt).toBe(100);
    expect(m.puzzles.p1).toEqual({ hints: 1, solvedAt: 250, answer: 'AQUEDUCT' });
    expect(m.puzzles.p2).toEqual({ hints: 2, solvedAt: 400, answer: 'LIGHTHOUSEKEEPER' });
    expect(m.puzzles.p3).toEqual({ hints: 3 });
  });

  it('gives the same result in either order', () => {
    expect(mergeProgress(a, b)).toEqual(mergeProgress(b, a));
  });
});

describe('export / import codes', () => {
  it('round-trips a save', () => {
    const code = exportCode(a);
    expect(code).toMatch(/^PT1-[A-Za-z0-9_-]+$/);
    expect(importCode(code)).toEqual(a);
  });

  it('tolerates whitespace from copying', () => {
    const code = exportCode(a);
    expect(importCode(`  ${code.slice(0, 20)}\n${code.slice(20)} `)).toEqual(a);
  });

  it('rejects other text and damaged codes with a readable message', () => {
    expect(() => importCode('hello')).toThrow(/start with PT1-/);
    expect(() => importCode(exportCode(a).slice(0, 30))).toThrow(/damaged/);
  });
});
