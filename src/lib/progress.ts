/**
 * Player progress, kept in this browser only (no accounts in v1).
 * Works as a Svelte store (`$progress`) and from plain scripts via `progress.subscribe`.
 */
export type PuzzleProgress = { solvedAt?: number; answer?: string; hints: number };

export type Progress = {
  v: 1;
  /** Quick checks inside lessons: id → the answer given. */
  checks: Record<string, string>;
  lessons: Record<string, { completedAt: number }>;
  puzzles: Record<string, PuzzleProgress>;
};

const KEY = 'plaintext:progress';

const empty = (): Progress => ({ v: 1, checks: {}, lessons: {}, puzzles: {} });

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw);
    if (data?.v !== 1) return empty();
    return { ...empty(), ...data };
  } catch {
    return empty();
  }
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Private mode or storage blocked: progress lasts for this page only.
  }
}

type Listener = (p: Progress) => void;

let state: Progress = typeof window === 'undefined' ? empty() : load();
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn(state);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      emit();
    }
  });
}

export const progress = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },
  get: () => state,
  update(fn: (draft: Progress) => void) {
    const next = structuredClone(state);
    fn(next);
    state = next;
    save(state);
    emit();
  },
};

/**
 * Combines two saves without losing anything: solved stays solved (earliest time wins),
 * hints count the most ever shown, lessons stay complete.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const out: Progress = { v: 1, checks: { ...b.checks, ...a.checks }, lessons: { ...b.lessons }, puzzles: {} };
  for (const [id, l] of Object.entries(a.lessons)) {
    const other = out.lessons[id];
    out.lessons[id] = other && other.completedAt < l.completedAt ? other : l;
  }
  for (const id of new Set([...Object.keys(a.puzzles), ...Object.keys(b.puzzles)])) {
    const x = a.puzzles[id];
    const y = b.puzzles[id];
    if (!x || !y) {
      out.puzzles[id] = { ...(x ?? y)! };
      continue;
    }
    const solved = [x, y].filter((s) => s.solvedAt).sort((m, n) => m.solvedAt! - n.solvedAt!)[0];
    out.puzzles[id] = { hints: Math.max(x.hints, y.hints), ...(solved && { solvedAt: solved.solvedAt, answer: solved.answer }) };
  }
  return out;
}

const CODE_PREFIX = 'PT1-';

/** A copyable code holding the whole save. Not secret, just compact. */
export function exportCode(p: Progress): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return CODE_PREFIX + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Parses a code from `exportCode`. Throws with a message fit to show the player. */
export function importCode(code: string): Progress {
  const trimmed = code.replace(/\s+/g, '');
  if (!trimmed.startsWith(CODE_PREFIX)) throw new Error('That isn’t a Plaintext progress code. Codes start with PT1-.');
  try {
    const b64 = trimmed.slice(CODE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (data?.v !== 1 || typeof data.puzzles !== 'object' || typeof data.lessons !== 'object' || typeof data.checks !== 'object') {
      throw new Error('shape');
    }
    return data as Progress;
  } catch {
    throw new Error('That code is damaged or incomplete. Copy the whole code again.');
  }
}

export function resetProgress() {
  progress.update((p) => {
    p.checks = {};
    p.lessons = {};
    p.puzzles = {};
  });
}

export function puzzleOf(p: Progress, id: string): PuzzleProgress {
  return p.puzzles[id] ?? { hints: 0 };
}

export const isSolved = (p: Progress, puzzleId: string) => Boolean(p.puzzles[puzzleId]?.solvedAt);
export const isLessonDone = (p: Progress, lessonId: string) => Boolean(p.lessons[lessonId]);
