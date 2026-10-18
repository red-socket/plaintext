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
    back: { href: string; title: string };
  }

  let { id, entries, hints, next, back }: Props = $props();

  const scope = `puzzle/${id}`;

  let value = $state('');
  let busy = $state(false);
  let feedback = $state<{ kind: 'wrong' | 'partial'; text: string } | null>(null);
  let tried = $state<string[]>([]);
  let solved = $state<{ answer: string; writeup: string } | null>(null);
  let hintsShown = $state(0);
  let hintsAtSolve = $state(0);
  let lastGuess = $state('');
  // A fresh solve shows the bar lifting off the answer; a saved one shows it already lifted.
  let lifted = $state(false);

  onMount(() => {
    const saved = puzzleOf(progress.get(), id);
    hintsShown = saved.hints;
    if (saved.solvedAt && saved.answer) {
      hintsAtSolve = saved.hints;
      lifted = true;
      reveal(saved.answer);
    }
  });

  async function reveal(answer: string) {
    const payload = await open(scope, answer, entries);
    if (payload?.type === 'solve') solved = { answer: payload.display ?? normalizeAnswer(answer), writeup: payload.writeup ?? '' };
  }

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    const guess = normalizeAnswer(value);
    if (!guess || busy) return;
    busy = true;
    const payload = await open(scope, value, entries);
    busy = false;

    if (payload?.type === 'solve') {
      solved = { answer: payload.display ?? guess, writeup: payload.writeup ?? '' };
      hintsAtSolve = hintsShown;
      feedback = null;
      lifted = false;
      setTimeout(() => (lifted = true), 350);
      progress.update((p) => {
        p.puzzles[id] = { ...puzzleOf(p, id), solvedAt: Date.now(), answer: guess };
      });
      return;
    }

    if (!tried.includes(guess)) tried = [guess, ...tried];
    lastGuess = guess;
    feedback = payload?.type === 'partial' ? { kind: 'partial', text: payload.reply } : { kind: 'wrong', text: 'Not the answer.' };
  }

  function showHint() {
    hintsShown = Math.min(hints.length, hintsShown + 1);
    const n = hintsShown;
    progress.update((p) => {
      const cur = puzzleOf(p, id);
      p.puzzles[id] = { ...cur, hints: Math.max(cur.hints, n) };
    });
  }

  // Bars stand in for hints not yet shown, roughly as long as the hint they cover.
  const barWidth = (hint: string) => `${Math.min(96, 28 + hint.length * 0.6)}%`;

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
      <div class="cleared" role="status">
        <p class="solved"><span class="k">Solved:</span> <span class="lifted" class:off={lifted}>{solved.answer}</span></p>
        <p class="stamp" aria-hidden="true">Cleared</p>
        <p class="filing note-line">
          <span>{hintsAtSolve === 0 ? 'No hints used.' : `${hintsAtSolve} of ${hints.length} hints used.`} Recorded in Progress, in this browser.</span>
          <button type="button" class="link" onclick={solveAgain}>Solve again</button>
        </p>
      </div>
    {:else}
      <form onsubmit={submit}>
        <label class="filing" for={`guess-${id}`}>Your answer</label>
        <div class="row">
          <input id={`guess-${id}`} class="answer-input" bind:value autocomplete="off" spellcheck="false" placeholder="Spaces and case don't matter" />
          <button class="btn" type="submit" disabled={busy}>Check answer</button>
        </div>
        <div aria-live="polite">
          {#if feedback}
            <div class="reply" class:partial={feedback.kind === 'partial'}>
              <p class="tag">Reply to your answer</p>
              <p class="guess">{lastGuess}</p>
              <p class="msg">{feedback.text}</p>
            </div>
          {/if}
        </div>
        {#if tried.length > 1}
          <p class="tried filing">Tried: {#each tried as t, i}<span>{t}</span>{i < tried.length - 1 ? ', ' : ''}{/each}</p>
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
          <a class="btn" href={back.href}>Back to {back.title}</a>
        {/if}
      </p>
    </section>
  {/if}

  <section class="hints" aria-labelledby={`hints-${id}`}>
    <h2 id={`hints-${id}`}>Hints</h2>
    <p class="filing">
      {hintsShown === 0
        ? 'Stuck? Hints go from a nudge to nearly the whole method. Each one is shown only when you ask.'
        : hintsShown < hints.length
          ? `${hintsShown} of ${hints.length} shown. Each one gives away a little more.`
          : "That's every hint. The rest is up to you."}
    </p>
    <ol>
      {#each hints as hint, i}
        <li>
          <span class="n filing">Hint {i + 1}</span>
          {#if i < hintsShown}
            <p>{hint}</p>
          {:else}
            <div>
              <span class="redaction" style:--w={barWidth(hint)} aria-hidden="true"></span>
              <span class="sr-only">Not shown yet</span>
            </div>
          {/if}
        </li>
      {/each}
    </ol>
    {#if hintsShown < hints.length}
      <button type="button" class="btn quiet" onclick={showHint}>
        Show hint {hintsShown + 1} of {hints.length}
      </button>
    {/if}
  </section>
</div>

<style>
  .puzzle {
    display: grid;
    gap: 3rem;
  }

  label {
    display: block;
    margin-bottom: 0.4rem;
  }
  .row {
    display: flex;
    gap: 0.6rem;
    align-items: stretch;
    flex-wrap: wrap;
  }
  .row .answer-input {
    flex: 1 1 14rem;
  }

  .reply {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: baseline;
    gap: 0.25rem 1rem;
    margin-top: 1rem;
    padding: 0.8rem 1.1rem;
    border: 2px solid var(--teal);
    border-left-width: 6px;
    background: var(--field);
  }
  .reply .tag {
    grid-column: 1 / -1;
    font-family: var(--mono);
    font-weight: 500;
    font-size: 0.8125rem;
    color: var(--teal);
  }
  .reply .guess {
    font-family: var(--mono);
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--red);
    text-decoration: line-through 2px;
  }
  .reply.partial .guess {
    color: var(--ink);
    text-decoration: none;
  }
  .reply .msg {
    font-family: var(--mono);
    font-size: 1.0625rem;
    line-height: 1.5;
  }
  .tried {
    margin-top: 0.6rem;
  }
  .tried span {
    text-decoration: line-through;
    text-decoration-color: var(--red);
  }

  .cleared {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    gap: 1rem 2rem;
    padding: 2.5rem 0 1.1rem;
    border-block: 3px solid var(--ink);
  }
  .solved {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0 0.22em;
    font-weight: 800;
    font-size: clamp(2.75rem, 1.5rem + 5vw, 5.5rem);
    line-height: 0.95;
    font-stretch: 66%;
    overflow-wrap: anywhere;
  }
  .solved .k {
    font-size: 0.42em;
    font-weight: 700;
    font-stretch: 85%;
  }
  .solved .lifted {
    letter-spacing: 0.02em;
  }
  .cleared .stamp {
    transform: rotate(-7deg);
    margin-bottom: 0.5rem;
  }
  .note-line {
    grid-column: 1 / -1;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.4rem 1.5rem;
  }
  .note-line .link {
    color: var(--ink);
  }

  .writeup h2,
  .hints h2 {
    font-size: clamp(1.875rem, 1.5rem + 1.2vw, 2.25rem);
  }
  .after {
    margin-top: 1.75rem;
  }

  .hints {
    display: grid;
    gap: 0.9rem;
    justify-items: start;
  }
  .hints ol {
    list-style: none;
    margin: 0;
    padding: 0;
    width: 100%;
    border-top: 1px solid var(--ink);
  }
  .hints li {
    display: grid;
    grid-template-columns: 5.5rem minmax(0, 1fr);
    gap: 0 1rem;
    padding: 0.85rem 0;
    border-bottom: 1px solid var(--ink);
  }
  .hints .n {
    line-height: 1.9;
  }
  .hints .redaction {
    margin: 0.4rem 0;
  }
  @media (max-width: 40rem) {
    .cleared {
      grid-template-columns: minmax(0, 1fr);
    }
    .cleared .stamp {
      justify-self: start;
    }
    .hints li {
      grid-template-columns: minmax(0, 1fr);
      gap: 0.25rem;
    }
    .reply {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
