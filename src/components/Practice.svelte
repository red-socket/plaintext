<script lang="ts">
  import { onMount } from 'svelte';
  import { judge, makeRound, type PracticeMode, type Round, type Verdict } from '../lib/practice';

  const MODES: { id: PracticeMode; label: string; help: string }[] = [
    { id: 'given', label: 'Shift given', help: 'You get the shift. Practise decoding quickly and accurately.' },
    { id: 'unknown', label: 'Unknown shift', help: 'No key. Find the shift from the shape of the words, or try them all.' },
    { id: 'rot13', label: 'ROT13', help: 'Always 13. Learn to read GUR as THE on sight.' },
  ];

  let mode = $state<PracticeMode>('given');
  let round = $state<Round | null>(null);
  let value = $state('');
  let verdict = $state<Verdict | null>(null);
  let revealed = $state(false);
  let solvedCount = $state(0);
  let input: HTMLInputElement;

  const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];

  function next() {
    let r = makeRound(newSeed(), mode);
    // Never the same message twice in a row.
    while (round && r.plaintext === round.plaintext) r = makeRound(newSeed(), mode);
    round = r;
    value = '';
    verdict = null;
    revealed = false;
    input?.focus();
  }

  onMount(next);

  function setMode(m: PracticeMode) {
    mode = m;
    next();
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!round || !value.trim()) return;
    verdict = judge(round, value);
    if (verdict.kind === 'solved' && !revealed) solvedCount += 1;
  }
</script>

<div class="practice">
  <fieldset class="modes">
    <legend>Mode</legend>
    {#each MODES as m}
      <label class:on={mode === m.id}>
        <input type="radio" name="practice-mode" value={m.id} checked={mode === m.id} onchange={() => setMode(m.id)} />
        {m.label}
      </label>
    {/each}
  </fieldset>
  <p class="meta">{MODES.find((m) => m.id === mode)?.help}</p>

  {#if round}
    <figure class="cipher-block">
      <p class="ciphertext">{round.ciphertext}</p>
      <figcaption class="meta">
        {#if mode === 'given'}Shift: <strong class="mono">{round.shift}</strong>{:else if mode === 'rot13'}Shift: <strong class="mono">13</strong>{:else}Shift: unknown{/if}
      </figcaption>
    </figure>

    {#if verdict?.kind === 'solved'}
      <div class="solved" role="status">
        <p><mark class="mono">{round.plaintext}</mark></p>
        <p class="meta">{revealed ? 'Shown, not solved.' : `Solved. That's ${solvedCount} this visit.`}</p>
        <button type="button" class="btn" onclick={next}>Next message</button>
      </div>
    {:else}
      <form onsubmit={submit}>
        <label for="practice-guess">The message</label>
        <div class="row">
          <input id="practice-guess" bind:this={input} class="answer-input" bind:value autocomplete="off" spellcheck="false" placeholder="Type the decoded message" />
          <button class="btn" type="submit">Check</button>
        </div>
        <p class="msg" class:wrong={verdict?.kind === 'wrong'} class:close={verdict?.kind === 'close'} aria-live="polite">
          {verdict && verdict.kind !== 'solved' ? verdict.text : ''}
        </p>
        <div class="row">
          <button type="button" class="btn quiet" onclick={next}>Skip</button>
          <button
            type="button"
            class="btn quiet"
            onclick={() => {
              revealed = true;
              verdict = { kind: 'solved' };
            }}>Show the answer</button
          >
        </div>
      </form>
    {/if}
  {/if}
</div>

<style>
  .practice {
    display: grid;
    gap: 1.25rem;
    max-width: 44rem;
  }
  .modes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    border: 0;
    margin: 0;
    padding: 0;
  }
  .modes legend {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  .modes label {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 0.8rem;
    border: 2px solid var(--rule);
    border-radius: 3px;
    cursor: pointer;
    font-size: var(--step--1);
    font-weight: 600;
  }
  .modes label.on {
    border-color: var(--ink);
  }
  .modes label:has(:focus-visible) {
    outline: 3px solid var(--violet);
    outline-offset: 2px;
  }
  .modes input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }
  .cipher-block {
    margin: 0;
    padding: 1.25rem 1.25rem 0.75rem;
    background: var(--paper-raised);
    border: 1px solid var(--rule);
    border-radius: 6px;
  }
  figcaption {
    margin-top: 0.4rem;
  }
  form {
    display: grid;
    gap: 0.25rem;
  }
  label[for] {
    font-weight: 600;
  }
  .row {
    display: flex;
    gap: 0.75rem;
    align-items: end;
    flex-wrap: wrap;
  }
  .row .answer-input {
    flex: 1 1 16rem;
  }
  .msg {
    min-height: 1.6em;
    margin: 0.4rem 0 0.5rem;
  }
  .msg.wrong {
    color: var(--pencil);
  }
  .msg.close {
    color: var(--violet);
    font-weight: 600;
  }
  .solved {
    display: grid;
    gap: 0.6rem;
    justify-items: start;
  }
  .solved mark {
    font-size: 1rem;
    line-height: 1.8;
  }
</style>
