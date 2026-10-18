<script lang="ts">
  import { extract, type ExtractMethod } from '../../lib/hidden';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  let text = $state(initial);
  let method = $state<ExtractMethod>('line-first');
  let n = $state(2);
  let offset = $state(1);

  const METHODS: { id: ExtractMethod; label: string }[] = [
    { id: 'line-first', label: 'First letter of each line' },
    { id: 'line-last', label: 'Last letter of each line' },
    { id: 'word-first', label: 'First letter of each word' },
    { id: 'word-last', label: 'Last letter of each word' },
    { id: 'word-nth', label: 'n-th letter of each word' },
    { id: 'every-nth', label: 'Every n-th letter' },
    { id: 'capitals', label: 'Capital letters only' },
  ];

  const result = $derived(text.trim() ? extract(text, method, n, offset) : '');
</script>

<div class="tool-panel">
  <label class="tool-field">
    <span>Text</span>
    <textarea rows="6" bind:value={text} placeholder="Paste a poem, a letter, anything"></textarea>
  </label>
  <div class="row">
    <label class="tool-field grow">
      <span>Read</span>
      <select bind:value={method}>
        {#each METHODS as m}<option value={m.id}>{m.label}</option>{/each}
      </select>
    </label>
    {#if method === 'word-nth' || method === 'every-nth'}
      <label class="tool-field small"><span>n</span><input type="number" min="1" max="50" bind:value={n} /></label>
    {/if}
    {#if method === 'every-nth'}
      <label class="tool-field small"><span>Start at letter</span><input type="number" min="1" max="50" bind:value={offset} /></label>
    {/if}
  </div>
  <div class="tool-field">
    <span>Letters read</span>
    <output class="out" aria-live="polite">{result || ' '}</output>
  </div>
  <p class="meta">Try every option: it takes seconds. Messages also hide in second letters, last words, or every fifth letter.</p>
</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .grow {
    flex: 1 1 14rem;
  }
  .small input {
    width: 6rem;
  }
  select,
  .small input {
    font: inherit;
    font-size: var(--step--1);
    padding: 0.45rem 0.5rem;
    border: 1px solid var(--rule);
    background: var(--paper);
  }
  .out {
    display: block;
    min-height: 2.6rem;
    font-family: var(--mono);
    font-size: 1rem;
    letter-spacing: 0.06em;
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--rule);
    overflow-wrap: anywhere;
  }
</style>
