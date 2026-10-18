<script lang="ts">
  import { columnarDecrypt, columnarEncrypt, railFenceDecrypt, railFenceEncrypt } from '../../lib/classical';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  let kind = $state<'rail' | 'columnar'>('rail');
  let mode = $state<'decrypt' | 'encrypt'>(initial ? 'decrypt' : 'encrypt');
  let text = $state(initial);
  let rails = $state(3);
  let key = $state('');

  const output = $derived.by(() => {
    if (kind === 'rail') return mode === 'encrypt' ? railFenceEncrypt(text, rails) : railFenceDecrypt(text, rails);
    if (key.replace(/[^A-Za-z]/g, '').length < 2) return '';
    return mode === 'encrypt' ? columnarEncrypt(text, key) : columnarDecrypt(text, key);
  });

  // The zigzag (rail fence) or grid (columnar) for the plaintext side, so you can see the shape.
  const plain = $derived((mode === 'encrypt' ? text : output).toUpperCase().replace(/[^A-Z]/g, ''));
  const zigzag = $derived.by(() => {
    const rows: string[][] = Array.from({ length: rails }, () => Array(plain.length).fill(''));
    let r = 0;
    let d = 1;
    [...plain].forEach((c, i) => {
      rows[r][i] = c;
      if (r === 0) d = 1;
      else if (r === rails - 1) d = -1;
      r += d;
    });
    return rows;
  });
  const keyLetters = $derived(key.toUpperCase().replace(/[^A-Z]/g, ''));
  const grid = $derived.by(() => {
    const n = keyLetters.length;
    if (n < 2) return [];
    const rows: string[][] = [];
    for (let i = 0; i < plain.length; i += n) rows.push([...plain.slice(i, i + n)]);
    return rows;
  });
  const keyRank = $derived.by(() => {
    const order = [...keyLetters].map((c, i) => ({ c, i })).sort((a, b) => a.c.localeCompare(b.c) || a.i - b.i);
    const rank = Array(keyLetters.length);
    order.forEach((o, k) => (rank[o.i] = k + 1));
    return rank;
  });
</script>

<div class="tool-panel">
  <div class="rows">
    <fieldset class="tool-modes">
      <legend class="sr-only">Method</legend>
      <label><input type="radio" name={`tk-${uid}`} value="rail" bind:group={kind} /> Rail fence</label>
      <label><input type="radio" name={`tk-${uid}`} value="columnar" bind:group={kind} /> Columns under a keyword</label>
    </fieldset>
    <fieldset class="tool-modes">
      <legend class="sr-only">Direction</legend>
      <label><input type="radio" name={`td-${uid}`} value="decrypt" bind:group={mode} /> Decrypt</label>
      <label><input type="radio" name={`td-${uid}`} value="encrypt" bind:group={mode} /> Encrypt</label>
    </fieldset>
  </div>

  <div class="tool-grid two">
    <label class="tool-field">
      <span>{mode === 'decrypt' ? 'Ciphertext' : 'Plaintext'}</span>
      <textarea rows="3" spellcheck="false" bind:value={text}></textarea>
    </label>
    <div class="tool-grid">
      {#if kind === 'rail'}
        <label class="tool-field">
          <span>Rails: {rails}</span>
          <input type="range" min="2" max="8" bind:value={rails} />
        </label>
      {:else}
        <label class="tool-field">
          <span>Keyword</span>
          <input type="text" bind:value={key} autocomplete="off" spellcheck="false" placeholder="ZEBRAS" />
        </label>
      {/if}
      <div class="tool-field">
        <span>{mode === 'decrypt' ? 'Plaintext' : 'Ciphertext'}</span>
        <output class="out" aria-live="polite">{output || ' '}</output>
      </div>
    </div>
  </div>

  {#if plain}
    <div class="shape" aria-hidden="true">
      {#if kind === 'rail'}
        {#each zigzag as row}<div class="zrow">{#each row as c}<span class:on={c}>{c || '·'}</span>{/each}</div>{/each}
      {:else if grid.length}
        <div class="grow head">{#each [...keyLetters] as k, i}<span>{k}<small>{keyRank[i]}</small></span>{/each}</div>
        {#each grid as row}<div class="grow">{#each row as c}<span class="on">{c}</span>{/each}</div>{/each}
      {/if}
    </div>
    <p class="meta">
      {kind === 'rail' ? 'The plaintext written in a zigzag. Read along each row to get the ciphertext.' : 'The plaintext in rows under the keyword. Read the columns in the numbered order to get the ciphertext.'}
    </p>
  {/if}
</div>

<style>
  .rows {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 2rem;
  }
  .out {
    display: block;
    min-height: 3rem;
    font-family: var(--mono);
    font-size: 0.9rem;
    line-height: 1.6;
    padding: 0.6rem 0.7rem;
    border-left: 3px solid var(--rule);
    overflow-wrap: anywhere;
  }
  input[type='range'] {
    accent-color: var(--violet);
  }
  .shape {
    overflow-x: auto;
    font-family: var(--mono);
    font-size: 0.8rem;
    line-height: 1.5;
    padding-bottom: 0.25rem;
  }
  .zrow,
  .grow {
    display: flex;
    white-space: nowrap;
  }
  .zrow span,
  .grow span {
    display: inline-block;
    width: 1.1rem;
    text-align: center;
    color: var(--rule);
  }
  .grow span {
    width: 1.6rem;
  }
  span.on {
    color: var(--ink);
    font-weight: 600;
  }
  .head span {
    color: var(--violet);
    font-weight: 700;
  }
  .head small {
    font-size: 0.6rem;
    vertical-align: super;
    color: var(--ink-soft);
  }
</style>
