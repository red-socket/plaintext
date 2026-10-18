<script lang="ts">
  import { onMount } from 'svelte';
  import { normalizeAnswer } from '../lib/normalize';
  import { progress, puzzleOf } from '../lib/progress';
  import { open, type SealedEntry } from '../lib/seal';
  import { renderWriteup } from '../lib/writeup';

  interface Props {
    id: string;
    entries: SealedEntry[];
    hints: string[];
    next?: { href: string; title: string };
    lesson: { href: string; title: string };
  }

  let { id, entries, hints, next, lesson }: Props = $props();

  const scope = `puzzle/${id}`;

  let value = $state('');
  let busy = $state(false);
  let feedback = $state<{ kind: 'wrong' | 'partial'; text: string } | null>(null);
  let tried = $state<string[]>([]);
  let solved = $state<{ answer: string; writeup: string } | null>(null);
  let hintsShown = $state(0);
  let hintsAtSolve = $state(0);

  onMount(() => {
    const saved = puzzleOf(progress.get(), id);
    hintsShown = saved.hints;
    if (saved.solvedAt && saved.answer) {
      hintsAtSolve = saved.hints;
      reveal(saved.answer);
    }
  });

  async function reveal(answer: string) {
    const payload = await open(scope, answer, entries);
    if (payload?.type === 'solve') solved = { answer: normalizeAnswer(answer), writeup: payload.writeup ?? '' };
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const guess = normalizeAnswer(value);
    if (!guess || busy) return;
    busy = true;
    const payload = await open(scope, value, entries);
    busy = false;

    if (payload?.type === 'solve') {
      solved = { answer: guess, writeup: payload.writeup ?? '' };
      hintsAtSolve = hintsShown;
      feedback = null;
      progress.update((p) => {
        p.puzzles[id] = { ...puzzleOf(p, id), solvedAt: Date.now(), answer: guess };
      });
      return;
    }

    if (!tried.includes(guess)) tried = [guess, ...tried];
    feedback = payload?.type === 'partial' ? { kind: 'partial', text: payload.reply } : { kind: 'wrong', text: `${guess} is not the answer.` };
  }

  function showHint() {
    hintsShown = Math.min(hints.length, hintsShown + 1);
    const n = hintsShown;
    progress.update((p) => {
      const cur = puzzleOf(p, id);
      p.puzzles[id] = { ...cur, hints: Math.max(cur.hints, n) };
    });
  }

  function solveAgain() {
    solved = null;
    value = '';
    feedback = null;
  }
</script>

<div class="puzzle">
  <section class="answer" aria-labelledby={`answer-${id}`}>
    <h2 id={`answer-${id}`} class="sr-only">Your answer</h2>
    {#if solved}
      <div class="solved" role="status">
        <p class="solved-line">
          Solved: <mark class="mono">{solved.answer}</mark>
        </p>
        <p class="meta">
          {hintsAtSolve === 0 ? 'No hints used.' : `${hintsAtSolve} of ${hints.length} hints used.`}
          <button type="button" class="link" onclick={solveAgain}>Solve again</button>
        </p>
      </div>
    {:else}
      <form onsubmit={submit}>
        <label for={`guess-${id}`}>Answer</label>
        <div class="row">
          <input id={`guess-${id}`} class="answer-input" bind:value autocomplete="off" spellcheck="false" placeholder="Spaces and case don't matter" />
          <button class="btn" type="submit" disabled={busy}>Check answer</button>
        </div>
        <p class="feedback" class:wrong={feedback?.kind === 'wrong'} class:partial={feedback?.kind === 'partial'} aria-live="polite">
          {feedback?.text ?? ''}
        </p>
        {#if tried.length}
          <p class="tried meta">Tried: {#each tried as t, i}<span class="mono">{t}</span>{i < tried.length - 1 ? ', ' : ''}{/each}</p>
        {/if}
      </form>
    {/if}
  </section>

  {#if solved}
    <section class="writeup prose" aria-labelledby={`writeup-${id}`}>
      <h2 id={`writeup-${id}`}>How it works</h2>
      {@html renderWriteup(solved.writeup)}
      <p class="after">
        {#if next}
          <a class="btn" href={next.href}>Next puzzle: {next.title}</a>
        {:else}
          <a class="btn" href={lesson.href}>Back to {lesson.title}</a>
        {/if}
      </p>
    </section>
  {/if}

  <section class="hints" aria-labelledby={`hints-${id}`}>
    <h2 id={`hints-${id}`}>Hints</h2>
    {#if hintsShown > 0}
      <ol>
        {#each hints.slice(0, hintsShown) as hint}
          <li>{hint}</li>
        {/each}
      </ol>
    {:else}
      <p class="meta">Stuck? Hints go from a nudge to nearly the whole method. Each one is shown only when you ask.</p>
    {/if}
    {#if hintsShown < hints.length}
      <button type="button" class="btn quiet" onclick={showHint}>
        Show hint {hintsShown + 1} of {hints.length}
      </button>
    {:else}
      <p class="meta">That's every hint. The rest is up to you.</p>
    {/if}
  </section>
</div>

<style>
  .puzzle {
    display: grid;
    gap: 2.5rem;
  }

  label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .row {
    display: flex;
    gap: 0.75rem;
    align-items: end;
    flex-wrap: wrap;
  }
  .row .answer-input {
    flex: 1 1 14rem;
  }
  .feedback {
    min-height: 1.6em;
    margin-top: 0.6rem;
  }
  .feedback.wrong {
    color: var(--pencil);
  }
  .feedback.partial {
    color: var(--violet);
    font-weight: 600;
  }
  .tried {
    margin-top: 0.25rem;
  }
  .tried .mono {
    font-size: 0.8rem;
    text-decoration: line-through;
    text-decoration-color: var(--pencil);
  }

  .solved-line {
    font-size: var(--step-1);
    font-weight: 600;
  }
  .solved-line mark {
    font-size: 0.85em;
    letter-spacing: 0.04em;
  }
  .solved .meta {
    margin-top: 0.35rem;
  }
  .link {
    border: 0;
    background: none;
    padding: 0;
    margin-left: 0.5rem;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: var(--violet);
    text-underline-offset: 0.18em;
    color: inherit;
    font-size: inherit;
  }

  .writeup h2,
  .hints h2 {
    font-size: var(--step-1);
  }
  .after {
    margin-top: 1.5rem;
  }

  .hints {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
  }
  .hints ol {
    margin: 0;
    padding-left: 1.25rem;
    display: grid;
    gap: 0.5rem;
  }
  .hints li::marker {
    font-family: var(--mono);
    font-size: 0.8em;
    color: var(--ink-soft);
  }
</style>
