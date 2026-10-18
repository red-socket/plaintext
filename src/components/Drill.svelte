<script lang="ts">
  import { onMount } from 'svelte';
  import { pigpenDrawing, pigpenGlyph } from '../lib/classical';
  import { DRILL_TECHNIQUES, lookalikes, makeDrillRound, type DrillRound, type DrillTechnique } from '../lib/drill';
  import { isLessonDone, progress, type Progress } from '../lib/progress';

  type Entry = { name: string; tells: string[]; try: string; lesson?: { id: string; title: string } };

  interface Props {
    entries: Record<string, Entry>;
  }
  let { entries }: Props = $props();

  let p = $state<Progress>(progress.get());
  let onlyLearned = $state(false);
  let round = $state<DrillRound | null>(null);
  let picked = $state<DrillTechnique | null>(null);
  let right = $state(0);
  let total = $state(0);
  let nextBtn = $state<HTMLButtonElement | null>(null);

  const learned = $derived(DRILL_TECHNIQUES.filter((t) => entries[t]?.lesson && isLessonDone(p, entries[t].lesson!.id)));
  const pool = $derived(onlyLearned && learned.length ? learned : DRILL_TECHNIQUES);
  const entry = $derived(round ? entries[round.technique] : null);
  const similar = $derived(round ? lookalikes(round.technique).map((t) => entries[t]?.name).filter(Boolean) : []);

  const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];

  function next() {
    let r = makeDrillRound(seed(), pool);
    // Avoid the same technique twice in a row when there's a choice.
    while (round && pool.length > 1 && r.technique === round.technique) r = makeDrillRound(seed(), pool);
    round = r;
    picked = null;
  }

  function choose(t: DrillTechnique) {
    if (picked || !round) return;
    picked = t;
    total += 1;
    if (t === round.technique) right += 1;
    queueMicrotask(() => nextBtn?.focus());
  }

  function onKey(e: KeyboardEvent) {
    if (!round || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target instanceof Element && e.target.closest('input, textarea, select')) return;
    const n = Number(e.key);
    if (!picked && n >= 1 && n <= round.choices.length) choose(round.choices[n - 1]);
  }

  onMount(() => {
    const off = progress.subscribe((next) => (p = next));
    next();
    return off;
  });
</script>

<svelte:window onkeydown={onKey} />

<div class="drill">
  <div class="bar">
    <fieldset class="pool">
      <legend class="sr-only">Which techniques</legend>
      <label class:on={!onlyLearned}><input type="radio" name="pool" checked={!onlyLearned} onchange={() => { onlyLearned = false; next(); }} /> Everything ({DRILL_TECHNIQUES.length})</label>
      <label class:on={onlyLearned} class:off={!learned.length}>
        <input type="radio" name="pool" checked={onlyLearned} disabled={!learned.length} onchange={() => { onlyLearned = true; next(); }} />
        What I've learned ({learned.length})
      </label>
    </fieldset>
    {#if total}<p class="score meta" aria-live="polite">{right} of {total} right this visit.</p>{/if}
  </div>

  {#if round}
    <figure class="cipher-block">
      {#if round.display === 'pigpen'}
        <div class="pigpen" role="img" aria-label="A message in symbols">
          {#each round.sample.split(' ') as w}
            <span class="word">{#each [...w] as c}{@const g = pigpenDrawing(pigpenGlyph(c)!)}<svg viewBox="0 0 20 20" aria-hidden="true"><path d={g.d} />{#if g.dot}<circle cx={g.dot[0]} cy={g.dot[1]} r="1.8" />{/if}</svg>{/each}</span>
          {/each}
        </div>
      {:else}
        <p class="ciphertext">{round.sample}</p>
      {/if}
    </figure>

    <fieldset class="choices">
      <legend>What is it?</legend>
      {#each round.choices as c, i}
        <button
          type="button"
          class="choice"
          class:correct={picked && c === round.technique}
          class:wrong={picked === c && c !== round.technique}
          disabled={!!picked}
          onclick={() => choose(c)}
        >
          <span class="key">{i + 1}</span>{entries[c]?.name ?? c}
        </button>
      {/each}
    </fieldset>

    {#if picked && entry}
      <section class="explain" aria-live="polite">
        <h2>{picked === round.technique ? 'Right.' : 'Not quite.'} The answer is {entry.name}.</h2>
        <ul>
          {#each entry.tells as t}<li>{t}</li>{/each}
        </ul>
        <p>
          Decoded{round.detail ? ` (${round.detail})` : ''}: <mark class="mono">{round.plaintext}</mark>
        </p>
        {#if similar.length}
          <p class="meta">From a short sample, it could also have been {similar.join(', ')}. From a short sample they look the same. In a real puzzle, try ROT13 and every Caesar shift first, then look for a keyword (Vigenère), then count letters (substitution).</p>
        {/if}
        <p class="links meta">
          <a href={`/field-guide#${round.technique}`}>Field guide entry</a>
          {#if entry.lesson}<a href={`/learn/${entry.lesson.id}`}>Lesson: {entry.lesson.title}</a>{/if}
        </p>
        <button type="button" class="btn" bind:this={nextBtn} onclick={next}>Next sample</button>
      </section>
    {/if}
  {/if}
</div>

<style>
  .drill {
    display: grid;
    gap: 1.5rem;
    max-width: 44rem;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }
  .pool {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    border: 0;
    margin: 0;
    padding: 0;
  }
  .pool label {
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.8rem;
    border: 2px solid var(--ink);
    cursor: pointer;
    font-size: var(--step--1);
    font-weight: 600;
  }
  .pool label.on {
    background: var(--ink);
    color: var(--paper);
  }
  .pool label.off {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .pool label:has(:focus-visible) {
    outline: 3px solid var(--red);
    outline-offset: 3px;
  }
  .pool input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .cipher-block {
    margin: 0;
    padding: 1.25rem;
    background: var(--field);
    border: 2px solid var(--ink);
  }
  .pigpen {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem 1.6rem;
  }
  .pigpen .word {
    display: inline-flex;
    gap: 0.35rem;
  }
  .pigpen svg {
    width: 2rem;
    height: 2rem;
  }
  .pigpen path {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .pigpen circle {
    fill: var(--ink);
  }
  .choices {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.6rem;
    border: 0;
    margin: 0;
    padding: 0;
  }
  @media (min-width: 36rem) {
    .choices {
      grid-template-columns: 1fr 1fr;
    }
  }
  .choices legend {
    font-weight: 600;
    font-size: var(--step-1);
    margin-bottom: 0.6rem;
  }
  .choice {
    display: flex;
    gap: 0.75rem;
    align-items: baseline;
    text-align: left;
    padding: 0.75rem 1rem;
    border: 2px solid var(--ink);
    background: var(--field);
    font-size: var(--step-0);
    font-weight: 600;
    cursor: pointer;
  }
  .choice:hover:not(:disabled) {
    background: var(--tint);
  }
  .choice:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .choice.correct {
    opacity: 1;
    background: var(--mark);
    color: var(--on-mark);
    border-color: var(--on-mark);
  }
  .choice.wrong {
    opacity: 1;
    border-color: var(--red);
    color: var(--red);
    text-decoration: line-through;
  }
  .key {
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.7;
  }
  .explain {
    display: grid;
    gap: 0.75rem;
    justify-items: start;
    padding-top: 1.25rem;
    border-top: 2px solid var(--ink);
  }
  .explain h2 {
    font-size: var(--step-1);
  }
  .explain ul {
    margin: 0;
    padding-left: 1.2rem;
    display: grid;
    gap: 0.3rem;
  }
  .links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 1.25rem;
  }
  .explain mark {
    font-size: 0.9rem;
    line-height: 1.8;
  }
</style>
