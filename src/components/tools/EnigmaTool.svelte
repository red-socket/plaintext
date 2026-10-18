<script lang="ts">
  import { enigmaText, plugboard, ROTORS } from '../../lib/modern';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const NAMES = Object.keys(ROTORS);
  const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
  let rotors = $state<[string, string, string]>(['I', 'II', 'III']);
  let reflector = $state('B');
  let rings = $state(['A', 'A', 'A']);
  let positions = $state(['A', 'A', 'A']);
  let plugs = $state('');
  let text = $state(initial);

  const plugError = $derived.by(() => {
    try {
      plugboard(plugs);
      return '';
    } catch (e) {
      return (e as Error).message;
    }
  });
  const duplicate = $derived(new Set(rotors).size < 3);
  const output = $derived(
    plugError || duplicate || !text.trim() ? '' : enigmaText(text, { rotors, reflector, rings: rings.join(''), positions: positions.join(''), plugs }, 5),
  );
  const SLOTS = ['Left', 'Middle', 'Right'];
</script>

<div class="tool-panel">
  <div class="machine">
    <label class="slot">Reflector
      <select bind:value={reflector}><option>B</option><option>C</option></select>
    </label>
    {#each SLOTS as slot, i}
      <fieldset class="slot rotor">
        <legend>{slot} rotor</legend>
        <select bind:value={rotors[i]} aria-label={`${slot} rotor`}>{#each NAMES as n}<option>{n}</option>{/each}</select>
        <label>Ring <select bind:value={rings[i]}>{#each LETTERS as l}<option>{l}</option>{/each}</select></label>
        <label>Start <select bind:value={positions[i]}>{#each LETTERS as l}<option>{l}</option>{/each}</select></label>
      </fieldset>
    {/each}
  </div>
  {#if duplicate}<p class="tool-error">Each rotor can only be used once.</p>{/if}
  <label class="tool-field">
    <span>Plugboard pairs, e.g. AB CD EF (up to 10)</span>
    <input type="text" bind:value={plugs} spellcheck="false" autocomplete="off" />
  </label>
  {#if plugError}<p class="tool-error">{plugError}</p>{/if}

  <div class="tool-grid two">
    <label class="tool-field">
      <span>Type here (letters only; Enigma had no spaces)</span>
      <textarea rows="3" bind:value={text} spellcheck="false"></textarea>
    </label>
    <div class="tool-field"><span>Lamps</span><output class="out">{output || ' '}</output></div>
  </div>
  <p class="meta">Enigma undoes itself: with the same settings, typing the ciphertext gives back the plaintext. The rotors step before every letter.</p>
</div>

<style>
  .machine {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: stretch;
  }
  .slot {
    display: grid;
    gap: 0.35rem;
    align-content: start;
    padding: 0.6rem 0.75rem;
    border: 1px solid var(--rule);
    background: var(--paper);
    font-size: var(--step--1);
    margin: 0;
  }
  .rotor legend {
    font-weight: 600;
    padding: 0 0.25rem;
  }
  .rotor label {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    justify-content: space-between;
  }
  select {
    font-family: var(--mono);
    font-size: 0.85rem;
    padding: 0.2rem 0.3rem;
    border: 1px solid var(--rule);
    background: var(--field);
  }
  .out {
    display: block;
    min-height: 4.5rem;
    font-family: var(--mono);
    font-size: 0.95rem;
    letter-spacing: 0.06em;
    padding: 0.6rem 0.7rem;
    border-left: 3px solid var(--mark);
    overflow-wrap: anywhere;
  }
</style>
