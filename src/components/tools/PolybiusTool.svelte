<script lang="ts">
  import { polybiusDecode, polybiusEncode, polybiusSquare } from '../../lib/classical';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const numeric = /^[\d\s/|]+$/.test(initial.trim()) && initial.trim() !== '';
  let tap = $state(false);
  let keyword = $state('');
  let numbers = $state(numeric ? initial : '');
  let letters = $state('');
  let last = $state<'letters' | 'numbers'>(numeric ? 'numbers' : 'letters');
  if (numeric) letters = polybiusDecode(initial);
  else if (initial) {
    letters = initial;
    numbers = polybiusEncode(initial);
  }

  const square = $derived(polybiusSquare(keyword, tap));

  function refresh() {
    if (last === 'numbers') letters = polybiusDecode(numbers, keyword, tap);
    else numbers = polybiusEncode(letters, keyword, tap);
  }
</script>

<div class="tool-panel">
  <div class="top">
    <table class="square" aria-label="The square: row number, then column number">
      <thead>
        <tr><th></th>{#each [1, 2, 3, 4, 5] as c}<th scope="col">{c}</th>{/each}</tr>
      </thead>
      <tbody>
        {#each [0, 1, 2, 3, 4] as r}
          <tr>
            <th scope="row">{r + 1}</th>
            {#each [0, 1, 2, 3, 4] as c}
              {@const l = square[r * 5 + c]}
              <td>{l}{#if !tap && l === 'I'}<small>/J</small>{:else if tap && l === 'C'}<small>/K</small>{/if}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>

    <div class="opts">
      <fieldset class="tool-modes">
        <legend class="sr-only">Square</legend>
        <label><input type="radio" name={`pb-${uid}`} checked={!tap} onchange={() => { tap = false; refresh(); }} /> Polybius (I = J)</label>
        <label><input type="radio" name={`pb-${uid}`} checked={tap} onchange={() => { tap = true; refresh(); }} /> Tap code (C = K)</label>
      </fieldset>
      <label class="tool-field">
        <span>Keyword (optional, fills the square first)</span>
        <input type="text" bind:value={keyword} oninput={refresh} autocomplete="off" />
      </label>
    </div>
  </div>

  <div class="tool-grid two">
    <label class="tool-field">
      <span>Letters</span>
      <textarea rows="3" spellcheck="false" value={letters} oninput={(e) => { letters = e.currentTarget.value; last = 'letters'; numbers = polybiusEncode(letters, keyword, tap); }} placeholder="Hello"></textarea>
    </label>
    <label class="tool-field">
      <span>Row and column pairs</span>
      <textarea rows="3" spellcheck="false" value={numbers} oninput={(e) => { numbers = e.currentTarget.value; last = 'numbers'; letters = polybiusDecode(numbers, keyword, tap); }} placeholder="23 15 31 31 34"></textarea>
    </label>
  </div>
  <p class="meta">Each letter is its row, then its column. A slash separates words.</p>
</div>

<style>
  .top {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    align-items: start;
  }
  .square {
    border-collapse: collapse;
    font-family: var(--mono);
  }
  .square th {
    font-size: 0.75rem;
    color: var(--ink-soft);
    font-weight: 500;
    padding: 0.2rem 0.4rem;
  }
  .square td {
    width: 2.4rem;
    height: 2.2rem;
    text-align: center;
    border: 1px solid var(--rule);
    background: var(--paper);
    color: var(--violet);
    font-weight: 600;
  }
  .square small {
    font-size: 0.6rem;
    font-weight: 400;
  }
  .opts {
    display: grid;
    gap: 0.75rem;
    flex: 1 1 14rem;
  }
</style>
