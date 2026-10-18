<script lang="ts">
  import { ALPHABET } from '../../lib/caesar';
  import { ATBASH_KEY, ENGLISH_ORDER, frequencies, invertKey, keywordAlphabet } from '../../lib/classical';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  let text = $state(initial);
  /** cipher letter → plaintext guess ('' = unknown) */
  let map = $state<Record<string, string>>(Object.fromEntries([...ALPHABET].map((c) => [c, ''])));
  let keyword = $state('');

  const freqs = $derived(frequencies(text));
  const maxCount = $derived(Math.max(1, ...freqs.map((f) => f.count)));
  const used = $derived(Object.values(map).filter(Boolean));
  const clashes = $derived(new Set(used.filter((v, i) => used.indexOf(v) !== i)));

  // Decoded preview: known letters in ink, unknown letters left as violet ciphertext.
  const preview = $derived(
    [...text].map((c) => {
      const up = c.toUpperCase();
      if (!/[A-Z]/.test(up)) return { c, known: true, plain: true };
      const g = map[up];
      return g ? { c: c === up ? g : g.toLowerCase(), known: true, plain: false } : { c, known: false, plain: false };
    }),
  );

  function setGuess(cipher: string, v: string) {
    map[cipher] = v.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
  }

  /** Fill the map from a cipher alphabet (plain A → key[0]): the decode map is its inverse. */
  function fromKey(key: string) {
    const inv = invertKey(key);
    map = Object.fromEntries([...ALPHABET].map((c, i) => [c, inv[i] === '?' ? '' : inv[i]]));
  }

  const clear = () => (map = Object.fromEntries([...ALPHABET].map((c) => [c, ''])));
</script>

<div class="tool-panel">
  <label class="tool-field">
    <span>Ciphertext</span>
    <textarea rows="4" spellcheck="false" bind:value={text} placeholder="Paste a substitution cipher"></textarea>
  </label>

  <div class="freq" aria-label="Letter counts, most common first">
    {#each freqs as f}
      <div class="bar" title={`${f.letter}: ${f.count}`}>
        <span class="fill" style:height={`${(f.count / maxCount) * 100}%`}></span>
        <b>{f.letter}</b>
        <small>{f.count}</small>
      </div>
    {/each}
  </div>
  <p class="meta">Most common first. In English the order is roughly <code>{ENGLISH_ORDER}</code>.</p>

  <div class="map" aria-label="Your guesses: ciphertext letter to plaintext letter">
    {#each ALPHABET as c}
      <label class="cell" class:clash={map[c] && clashes.has(map[c])}>
        <span>{c}</span>
        <input type="text" maxlength="2" value={map[c]} oninput={(e) => setGuess(c, e.currentTarget.value)} aria-label={`Ciphertext ${c} means`} autocomplete="off" />
      </label>
    {/each}
  </div>

  <div class="actions">
    <button type="button" class="btn quiet" onclick={() => fromKey(ATBASH_KEY)}>Fill as Atbash</button>
    <span class="kw">
      <label class="sr-only" for="kw">Keyword</label>
      <input id="kw" type="text" bind:value={keyword} placeholder="Keyword" autocomplete="off" />
      <button type="button" class="btn quiet" disabled={!keyword.trim()} onclick={() => fromKey(keywordAlphabet(keyword))}>Fill from keyword</button>
    </span>
    <button type="button" class="btn quiet" onclick={clear}>Clear</button>
  </div>

  <div class="tool-field">
    <span>Decoded so far (violet letters are still unknown)</span>
    <output class="preview" aria-live="polite">{#each preview as p}{#if p.known}<span>{p.c}</span>{:else}<span class="unk">{p.c}</span>{/if}{/each}</output>
  </div>
</div>

<style>
  .freq {
    display: grid;
    grid-template-columns: repeat(26, minmax(0, 1fr));
    gap: 2px;
    height: 7rem;
    align-items: end;
  }
  .bar {
    position: relative;
    display: grid;
    grid-template-rows: 1fr auto auto;
    height: 100%;
    align-items: end;
    text-align: center;
    font-family: var(--mono);
  }
  .fill {
    display: block;
    background: var(--violet);
    border-radius: 2px 2px 0 0;
    min-height: 1px;
    align-self: end;
  }
  .bar b {
    font-size: 0.7rem;
  }
  .bar small {
    font-size: 0.6rem;
    color: var(--ink-soft);
  }
  .map {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2.6rem, 1fr));
    gap: 0.35rem;
  }
  .cell {
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    font-family: var(--mono);
    font-size: 0.8rem;
    color: var(--violet);
  }
  .cell input {
    width: 2.2rem;
    text-align: center;
    font-family: var(--mono);
    font-size: 0.95rem;
    text-transform: uppercase;
    padding: 0.2rem 0;
    border: 1px solid var(--rule);
    border-radius: 3px;
    background: var(--paper);
  }
  .cell.clash input {
    border-color: var(--pencil);
    color: var(--pencil);
  }
  .actions,
  .kw {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .kw input {
    font-family: var(--mono);
    font-size: 0.9rem;
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--rule);
    border-radius: 3px;
    background: var(--paper);
    width: 9rem;
  }
  .preview {
    display: block;
    font-family: var(--mono);
    font-size: 0.95rem;
    line-height: 1.8;
    padding: 0.6rem 0.7rem;
    border-left: 3px solid var(--rule);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    min-height: 3rem;
  }
  .unk {
    color: var(--violet);
  }
</style>
