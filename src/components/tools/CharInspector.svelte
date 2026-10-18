<script lang="ts">
  import { fromMojibake, inspect, looksLikeMojibake } from '../../lib/unicode';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const isCodePoints = (s: string) => /^\s*(U\+[0-9A-Fa-f]{2,6}[\s,]*)+$/.test(s);
  let text = $state(initial);

  const fromCodes = $derived(isCodePoints(text) ? String.fromCodePoint(...(text.match(/U\+[0-9A-Fa-f]+/g) ?? []).map((h) => parseInt(h.slice(2), 16))) : '');
  const shown = $derived(inspect(fromCodes || text).slice(0, 400));
  const garbled = $derived(looksLikeMojibake(text));
  const fixed = $derived(garbled ? fromMojibake(text) : null);

  function applyFix() {
    if (fixed) text = fixed;
  }
</script>

<div class="tool-panel">
  <label class="tool-field">
    <span>Text, or code points like U+0041 U+00E9</span>
    <textarea rows="3" bind:value={text} spellcheck="false"></textarea>
  </label>

  {#if fromCodes}
    <p>As text: <mark class="txt">{fromCodes}</mark></p>
  {/if}

  {#if garbled}
    <div class="fix">
      <p>This looks like <strong>mojibake</strong>: UTF-8 read as Windows-1252.</p>
      {#if fixed}
        <p>Fixed: <span class="fixed">{fixed}</span></p>
        <button type="button" class="btn quiet" onclick={applyFix}>Use the fixed text</button>
        <p class="meta">Still garbled after one fix? It was garbled twice. Fix it again.</p>
      {:else}
        <p class="meta">It can't be fixed by reading it back as Windows-1252.</p>
      {/if}
    </div>
  {/if}

  {#if shown.length}
    <div class="chars" aria-label="Characters">
      {#each shown as c}
        <div class={`c ${c.kind}`}>
          <b>{c.char === ' ' ? '␠' : c.char}</b>
          <span>{c.codePoint}</span>
          <small>{c.bytes}</small>
        </div>
      {/each}
    </div>
    <p class="meta">Each box: the character, its code point, and its bytes in UTF-8. ASCII is one byte; accents two; most other scripts three; emoji four.</p>
  {/if}
</div>

<style>
  .txt {
    font-size: 1.2rem;
  }
  .fix {
    display: grid;
    gap: 0.4rem;
    justify-items: start;
    padding: 0.75rem 1rem;
    border-left: 3px solid var(--highlight);
    background: var(--paper);
  }
  .fixed {
    font-family: var(--mono);
    font-size: 0.95rem;
  }
  .chars {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(4.75rem, 1fr));
    gap: 0.35rem;
    max-height: 18rem;
    overflow-y: auto;
  }
  .c {
    display: grid;
    justify-items: center;
    padding: 0.35rem 0.2rem;
    border: 1px solid var(--rule);
    border-radius: 3px;
    background: var(--paper);
    font-family: var(--mono);
  }
  .c b {
    font-size: 1.15rem;
    font-weight: 500;
  }
  .c span {
    font-size: 0.65rem;
    color: var(--violet);
  }
  .c small {
    font-size: 0.6rem;
    color: var(--ink-soft);
  }
  .c.latin {
    border-color: var(--violet);
  }
  .c.other {
    border-color: var(--pencil);
  }
</style>
