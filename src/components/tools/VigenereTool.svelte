<script lang="ts">
  import { ALPHABET } from '../../lib/caesar';
  import { bestShift, column, factorCounts, kasiski, vigenereDecrypt, vigenereEncrypt } from '../../lib/classical';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  let text = $state(initial);
  let key = $state('');
  let mode = $state<'decrypt' | 'encrypt'>(initial ? 'decrypt' : 'encrypt');
  let showBreak = $state(false);
  /** The length the player picked; until then, the strongest factor in the data. */
  let chosenLength = $state<number | null>(null);

  const output = $derived(key.replace(/[^A-Za-z]/g, '') ? (mode === 'encrypt' ? vigenereEncrypt(text, key) : vigenereDecrypt(text, key)) : '');
  const repeats = $derived(showBreak ? kasiski(text).slice(0, 12) : []);
  const factors = $derived(factorCounts(repeats.flatMap((r) => r.distances)));
  const maxFactor = $derived(Math.max(1, ...factors.map((f) => f.count)));
  // Small factors divide almost everything, so among the strongest counts prefer the largest length.
  const bestLength = $derived(factors.filter((f) => f.count === maxFactor && f.count > 0).at(-1)?.length ?? 3);
  const keyLength = $derived(chosenLength ?? bestLength);
  const columns = $derived(
    showBreak ? Array.from({ length: keyLength }, (_, i) => ({ col: column(text, keyLength, i), ...bestShift(column(text, keyLength, i)) })) : [],
  );
  const suggested = $derived(columns.map((c) => ALPHABET[c.shift]).join(''));
</script>

<div class="tool-panel">
  <fieldset class="tool-modes">
    <legend class="sr-only">Direction</legend>
    <label><input type="radio" name={`vg-${uid}`} value="decrypt" bind:group={mode} /> Decrypt</label>
    <label><input type="radio" name={`vg-${uid}`} value="encrypt" bind:group={mode} /> Encrypt</label>
  </fieldset>
  <div class="tool-grid two">
    <label class="tool-field">
      <span>{mode === 'decrypt' ? 'Ciphertext' : 'Plaintext'}</span>
      <textarea rows="4" spellcheck="false" bind:value={text}></textarea>
    </label>
    <div class="tool-grid">
      <label class="tool-field">
        <span>Key</span>
        <input type="text" bind:value={key} autocomplete="off" spellcheck="false" placeholder="LEMON" />
      </label>
      <div class="tool-field">
        <span>{mode === 'decrypt' ? 'Plaintext' : 'Ciphertext'}</span>
        <output class="out" aria-live="polite">{output || ' '}</output>
      </div>
    </div>
  </div>

  <label class="toggle"><input type="checkbox" bind:checked={showBreak} disabled={!text.trim()} /> Help me find the key</label>

  {#if showBreak}
    <section class="break">
      <h3>1. Repeated chunks</h3>
      {#if repeats.length}
        <p class="meta">The same plaintext under the same part of the key encrypts the same way. The gaps between repeats are usually multiples of the key length.</p>
        <ul class="repeats">
          {#each repeats as r}<li><code>{r.seq}</code> gap {r.distances.join(', ')}</li>{/each}
        </ul>
        <div class="factors" aria-label="How many gaps each key length divides">
          {#each factors as f}
            <button type="button" class:on={f.length === keyLength} onclick={() => (chosenLength = f.length)} title={`${f.count} gaps divide by ${f.length}`}>
              <span class="fill" style:height={`${(f.count / maxFactor) * 100}%`}></span>
              <b>{f.length}</b>
            </button>
          {/each}
        </div>
        <p class="meta">Tall bars are likely key lengths. Click one to try it. Small factors like 2 and 3 are tall for every text, so prefer the largest tall one.</p>
      {:else}
        <p class="meta">No repeats yet. Longer texts give more of them.</p>
      {/if}

      <h3>2. Solve each column as a Caesar shift</h3>
      <label class="len">Key length <input type="number" min="1" max="20" value={keyLength} oninput={(e) => (chosenLength = Math.max(1, Math.min(20, Number(e.currentTarget.value) || 1)))} /></label>
      <ol class="cols">
        {#each columns as c, i}
          <li><span class="mono">{i + 1}</span> <code>{c.col.slice(0, 24)}{c.col.length > 24 ? '…' : ''}</code> best shift <b class="mono">{ALPHABET[c.shift]}</b></li>
        {/each}
      </ol>
      <p>Suggested key: <code>{suggested}</code> <button type="button" class="btn quiet" onclick={() => { key = suggested; mode = 'decrypt'; }}>Use it</button></p>
      <p class="meta">The suggestion compares each column's letters with English. On short texts a letter or two can be off; fix them by eye.</p>
    </section>
  {/if}
</div>

<style>
  .out {
    display: block;
    min-height: 4.5rem;
    font-family: var(--mono);
    font-size: 0.9rem;
    line-height: 1.6;
    padding: 0.6rem 0.7rem;
    border-left: 3px solid var(--rule);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .toggle {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    cursor: pointer;
  }
  .break {
    display: grid;
    gap: 0.6rem;
    border-top: 1px solid var(--rule);
    padding-top: 1rem;
  }
  .break h3 {
    font-size: var(--step-0);
  }
  .repeats {
    margin: 0;
    padding-left: 1.1rem;
    columns: 14rem;
    font-size: var(--step--1);
  }
  .factors {
    display: grid;
    grid-template-columns: repeat(11, minmax(0, 1fr));
    gap: 3px;
    height: 5rem;
  }
  .factors button {
    display: grid;
    grid-template-rows: 1fr auto;
    align-items: end;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    font-family: var(--mono);
    font-size: 0.75rem;
  }
  .factors .fill {
    display: block;
    background: var(--rule);
    border-radius: 2px 2px 0 0;
    min-height: 1px;
  }
  .factors button.on .fill {
    background: var(--violet);
  }
  .len input {
    width: 4rem;
    font-family: var(--mono);
    padding: 0.2rem 0.4rem;
    margin-left: 0.4rem;
    border: 1px solid var(--rule);
    border-radius: 3px;
    background: var(--paper);
  }
  .cols {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.3rem;
    font-size: var(--step--1);
  }
  .cols .mono {
    display: inline-block;
    width: 1.5rem;
    color: var(--ink-soft);
  }
</style>
