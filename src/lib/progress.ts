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

export function puzzleOf(p: Progress, id: string): PuzzleProgress {
  return p.puzzles[id] ?? { hints: 0 };
}

export const isSolved = (p: Progress, puzzleId: string) => Boolean(p.puzzles[puzzleId]?.solvedAt);
export const isLessonDone = (p: Progress, lessonId: string) => Boolean(p.lessons[lessonId]);
