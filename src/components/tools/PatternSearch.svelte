<script lang="ts">
  import { onMount } from 'svelte';
  interface Props {
    pattern?: string;
  }
  let { pattern: initial = '' }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  let words = $state<string[] | null>(null);
  let loading = $state(false);
  let mode = $state<'regex' | 'anagram'>('regex');
  let pattern = $state(initial);
  let whole = $state(true);

  async function load() {
    if (words || loading) return;
    loading = true;
    const text = await (await fetch('/files/words.txt')).text();
    words = text.trim().split('\n');
    loading = false;
  }

  const result = $derived.by((): { matches: string[]; error: string } => {
    if (!words || !pattern.trim()) return { matches: [], error: '' };
    if (mode === 'anagram') {
      const key = [...pattern.toLowerCase().replace(/[^a-z]/g, '')].sort().join('');
      return { matches: words.filter((w) => w.length === key.length && [...w].sort().join('') === key), error: '' };
    }
    try {
      const src = pattern.trim();
      const re = new RegExp(whole && !src.startsWith('^') && !src.endsWith('$') ? `^(?:${src})$` : src, 'i');
      return { matches: words.filter((w) => re.test(w)), error: '' };
    } catch (e) {
      return { matches: [], error: `That pattern has a mistake: ${(e as Error).message.replace(/^Invalid regular expression: /, '')}` };
    }
  });

  const SHOWN = 300;

  onMount(load);
</script>

<div class="tool-panel">
  <fieldset class="tool-modes">
    <legend class="sr-only">Search by</legend>
    <label><input type="radio" name={`ps-${uid}`} value="regex" bind:group={mode} /> Pattern</label>
    <label><input type="radio" name={`ps-${uid}`} value="anagram" bind:group={mode} /> Anagram of these letters</label>
  </fieldset>
  <div class="row">
    <label class="tool-field grow">
      <span>{mode === 'regex' ? 'Pattern, e.g. ^c.t$ or (.)\\1' : 'Letters, e.g. listen'}</span>
      <input type="text" bind:value={pattern} spellcheck="false" autocomplete="off" />
    </label>
    {#if mode === 'regex'}<label class="check"><input type="checkbox" bind:checked={whole} /> Whole words only</label>{/if}
  </div>
  {#if result.error}<p class="tool-error">{result.error}</p>{/if}

  {#if loading}
    <p class="meta">Loading the word list…</p>
  {:else if words && pattern.trim() && !result.error}
    <p class="meta"><b>{result.matches.length.toLocaleString()}</b> of {words.length.toLocaleString()} words match{result.matches.length > SHOWN ? `; showing the first ${SHOWN}` : ''}.</p>
    {#if result.matches.length}
      <ul class="matches">{#each result.matches.slice(0, SHOWN) as w}<li>{w}</li>{/each}</ul>
    {/if}
  {/if}
  <p class="meta">Searches 38,015 common English words from SCOWL by Kevin Atkinson (<a href="/files/words-COPYRIGHT.txt">licence</a>). "Whole words only" adds ^ and $ for you.</p>
</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.25rem;
    align-items: end;
  }
  .grow {
    flex: 1 1 16rem;
  }
  .check {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: var(--step--1);
  }
  .check input {
    accent-color: var(--ink);
  }
  .matches {
    list-style: none;
    margin: 0;
    padding: 0.6rem 0.75rem;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
    gap: 0.15rem 1rem;
    max-height: 16rem;
    overflow-y: auto;
    font-family: var(--mono);
    font-size: 0.85rem;
    background: var(--paper);
    border: 1px solid var(--rule);
  }
</style>
