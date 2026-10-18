<script lang="ts">
  import { bookDecode, type BookMode } from '../../lib/classical';

  interface Props {
    text?: string;
    source?: string;
  }
  let { text: initial = '', source: initialSource = '' }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  let source = $state(initialSource);
  let code = $state(initial);
  let mode = $state<BookMode>('line-word');

  const decoded = $derived(source.trim() && code.trim() ? bookDecode(code, source, mode) : '');
  // Numbered view: line numbers, and word numbers (per line, or running through the text).
  const numbered = $derived.by(() => {
    let running = 0;
    return source
      .trim()
      .split('\n')
      .filter((l) => l.trim())
      .map((line, li) => ({
        n: li + 1,
        words: line
          .trim()
          .split(/\s+/)
          .map((w, wi) => ({ w, n: mode === 'line-word' ? wi + 1 : ++running })),
      }));
  });
</script>

<div class="tool-panel">
  <fieldset class="tool-modes">
    <legend class="sr-only">Numbers mean</legend>
    <label><input type="radio" name={`bk-${uid}`} value="line-word" bind:group={mode} /> line . word</label>
    <label><input type="radio" name={`bk-${uid}`} value="word-letter" bind:group={mode} /> word . letter</label>
  </fieldset>

  <div class="tool-grid two">
    <label class="tool-field">
      <span>Source text (the book, page or letter)</span>
      <textarea rows="5" spellcheck="false" bind:value={source} placeholder="Paste the text the numbers point into"></textarea>
    </label>
    <div class="tool-grid">
      <label class="tool-field">
        <span>Numbers</span>
        <textarea rows="2" spellcheck="false" bind:value={code} placeholder="1.1 3.5"></textarea>
      </label>
      <div class="tool-field"><span>Decoded</span><output class="out" aria-live="polite">{decoded || ' '}</output></div>
    </div>
  </div>

  {#if numbered.length}
    <div class="numbered" aria-label="The source, numbered">
      {#each numbered as line}
        <p><span class="ln">{line.n}</span>{#each line.words as w}<span class="w"><sup>{w.n}</sup>{w.w}</span> {/each}</p>
      {/each}
    </div>
    <p class="meta">{mode === 'line-word' ? 'Small numbers count words within each line.' : 'Small numbers count words through the whole text. Then count letters within the word.'}</p>
  {/if}
</div>

<style>
  .out {
    display: block;
    min-height: 2.6rem;
    font-family: var(--mono);
    font-size: 0.9rem;
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--rule);
    overflow-wrap: anywhere;
  }
  .numbered {
    max-height: 18rem;
    overflow-y: auto;
    padding: 0.75rem 1rem;
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 3px;
    font-size: var(--step--1);
    line-height: 2;
  }
  .numbered p {
    margin: 0;
  }
  .ln {
    display: inline-block;
    width: 2rem;
    font-family: var(--mono);
    font-size: 0.75rem;
    color: var(--ink-soft);
  }
  .w sup {
    font-family: var(--mono);
    font-size: 0.6rem;
    color: var(--violet);
    margin-right: 0.1rem;
  }
</style>
