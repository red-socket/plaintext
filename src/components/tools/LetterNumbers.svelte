<script lang="ts">
  import { a1z26Decode, a1z26Encode, KEYPAD, keypadDecode, keypadEncode } from '../../lib/encodings';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  type Mode = 'a1z26' | 'a0z25' | 'keypad';
  const uid = Math.random().toString(36).slice(2, 8);
  let mode = $state<Mode>('a1z26');

  // Puzzle text usually arrives as numbers; decode it straight away.
  const looksNumeric = /^[\d\s\-.,/|]+$/.test(initial.trim()) && initial.trim() !== '';
  let numbers = $state(looksNumeric ? initial : '');
  let letters = $state(looksNumeric ? a1z26Decode(initial) : initial);
  if (!looksNumeric && initial) numbers = a1z26Encode(initial);

  const encode = (t: string, m: Mode) => (m === 'keypad' ? keypadEncode(t) : a1z26Encode(t, m === 'a0z25' ? 0 : 1));
  const decode = (t: string, m: Mode) => (m === 'keypad' ? keypadDecode(t) : a1z26Decode(t, m === 'a0z25' ? 0 : 1));

  let lastEdited = $state<'letters' | 'numbers'>(looksNumeric ? 'numbers' : 'letters');

  function onLetters(v: string) {
    letters = v;
    lastEdited = 'letters';
    numbers = encode(v, mode);
  }
  function onNumbers(v: string) {
    numbers = v;
    lastEdited = 'numbers';
    letters = decode(v, mode);
  }
  function setMode(m: Mode) {
    mode = m;
    if (lastEdited === 'numbers') letters = decode(numbers, m);
    else numbers = encode(letters, m);
  }

  const ALPHA = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
</script>

<div class="tool-panel">
  <fieldset class="tool-modes">
    <legend class="sr-only">Scheme</legend>
    <label><input type="radio" name={`ln-${uid}`} checked={mode === 'a1z26'} onchange={() => setMode('a1z26')} /> A1Z26</label>
    <label><input type="radio" name={`ln-${uid}`} checked={mode === 'a0z25'} onchange={() => setMode('a0z25')} /> A0Z25</label>
    <label><input type="radio" name={`ln-${uid}`} checked={mode === 'keypad'} onchange={() => setMode('keypad')} /> Phone keypad</label>
  </fieldset>

  <div class="tool-grid two">
    <label class="tool-field">
      <span>Letters</span>
      <textarea rows="3" spellcheck="false" value={letters} oninput={(e) => onLetters(e.currentTarget.value)} placeholder="Type letters"></textarea>
    </label>
    <label class="tool-field">
      <span>Numbers</span>
      <textarea rows="3" spellcheck="false" value={numbers} oninput={(e) => onNumbers(e.currentTarget.value)} placeholder={mode === 'keypad' ? '44 33 555 555 666' : '8-5-12-12-15'}></textarea>
    </label>
  </div>

  {#if mode === 'keypad'}
    <div class="keypad" aria-label="Phone keypad">
      {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'] as k}
        <div class="key"><b>{k}</b><span>{k === '0' ? 'space' : (KEYPAD[k] ?? '')}</span></div>
      {/each}
    </div>
    <p class="meta">Press a key once for its first letter, twice for the second: 7777 is S. Spaces separate letters.</p>
  {:else}
    <div class="chart" aria-label="Letter numbers">
      {#each ALPHA as l, i}
        <div><b>{l}</b><span>{i + (mode === 'a0z25' ? 0 : 1)}</span></div>
      {/each}
    </div>
    <p class="meta">Dashes separate letters, spaces separate words.</p>
  {/if}
</div>

<style>
  .keypad {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 6rem));
    gap: 0.4rem;
  }
  .key {
    display: grid;
    justify-items: center;
    padding: 0.4rem 0.2rem;
    border: 1px solid var(--rule);
    background: var(--paper);
    font-family: var(--mono);
  }
  .key b {
    font-size: 1.1rem;
  }
  .key span {
    font-size: 0.7rem;
    color: var(--teal);
    min-height: 1em;
  }
</style>
