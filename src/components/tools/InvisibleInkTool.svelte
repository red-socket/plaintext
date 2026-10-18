<script lang="ts">
  import { countInvisible, reveal, whitespaceReveal, zeroWidthReveal } from '../../lib/hidden';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  let text = $state(initial);
  const shown = $derived(reveal(text));
  const invisible = $derived(countInvisible(text));
  const zw = $derived(invisible ? zeroWidthReveal(text) : '');
  const ws = $derived(/[ \t]+\n|[ \t]+$/.test(text) ? whitespaceReveal(text) : '');
  const printable = (s: string) => s && /^[\x20-\x7e\n]+$/.test(s);
</script>

<div class="tool-panel">
  <label class="tool-field">
    <span>Paste text here (copying from the page keeps invisible characters)</span>
    <textarea rows="4" bind:value={text} spellcheck="false"></textarea>
  </label>

  {#if text}
    <div class="tool-field">
      <span>What's really there: <b>{invisible}</b> invisible character{invisible === 1 ? '' : 's'}; spaces shown as ·, tabs as →</span>
      <p class="shown">{#each shown as s}{#if s.kind === 'text'}{s.char}{:else}<span class={s.kind}>{s.char}</span>{/if}{/each}</p>
    </div>
    <div class="tool-grid two">
      <div class="tool-field">
        <span>Zero-width characters as binary (ZWSP = 0, ZWNJ = 1)</span>
        <output class="out" class:good={printable(zw)}>{zw || 'None found'}</output>
      </div>
      <div class="tool-field">
        <span>Trailing spaces and tabs as binary (space = 0, tab = 1)</span>
        <output class="out" class:good={printable(ws)}>{ws || 'None found'}</output>
      </div>
    </div>
  {/if}
  <p class="meta">Also try selecting all the text on a page (white text shows up), and viewing the page source for comments.</p>
</div>

<style>
  .shown {
    margin: 0;
    padding: 0.6rem 0.7rem;
    background: var(--paper);
    border: 1px solid var(--rule);
    font-family: var(--mono);
    font-size: 0.85rem;
    line-height: 1.9;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 14rem;
    overflow-y: auto;
  }
  .zw,
  .other {
    font-size: 0.6rem;
    padding: 0 0.15em;
    margin: 0 0.05em;
    color: var(--paper);
    background: var(--red);
    vertical-align: middle;
  }
  .space,
  .tab {
    color: var(--teal);
  }
  .out {
    display: block;
    min-height: 2.4rem;
    font-family: var(--mono);
    font-size: 0.9rem;
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--rule);
    overflow-wrap: anywhere;
    color: var(--ink-soft);
  }
  .out.good {
    color: var(--ink);
    border-left-color: var(--mark);
  }
</style>
