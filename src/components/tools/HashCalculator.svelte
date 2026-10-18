<script lang="ts">
  import { allHashes, ean13Check, hashKind, isbn10Check, md5, sha } from '../../lib/digest';

  interface Props {
    text?: string;
    source?: string;
  }
  let { text: initial = '', source = '' }: Props = $props();

  // A puzzle's text might be the hash to crack rather than something to hash.
  const startsAsHash = !!hashKind(initial);
  let input = $state(startsAsHash ? '' : initial);
  let target = $state(startsAsHash ? initial.trim() : '');
  let hashes = $state<{ md5: string; sha1: string; sha256: string } | null>(null);
  let candidates = $state(source);
  let result = $state<string | null>(null);
  let searching = $state(false);
  let digits = $state('');

  $effect(() => {
    const v = input;
    allHashes(v).then((h) => {
      if (v === input) hashes = h;
    });
  });

  const kind = $derived(hashKind(target));
  const t = $derived(target.trim().toLowerCase());

  async function hashOf(word: string) {
    if (kind === 'MD5') return md5(word);
    if (kind === 'SHA-1') return sha('SHA-1', word);
    return sha('SHA-256', word);
  }

  async function search() {
    searching = true;
    result = null;
    const words = [...new Set(candidates.split(/[^A-Za-z0-9'-]+/).filter(Boolean))];
    // Try each word as written, lowercase and uppercase: hashes care about case.
    for (const w of words) {
      for (const v of new Set([w, w.toLowerCase(), w.toUpperCase()])) {
        if ((await hashOf(v)) === t) {
          result = v;
          searching = false;
          return;
        }
      }
    }
    result = '';
    searching = false;
  }

  const clean = $derived(digits.replace(/[^0-9X]/gi, '').toUpperCase());
  const check = $derived.by(() => {
    try {
      if (clean.length === 9) return { label: 'ISBN-10 check digit', value: isbn10Check(clean) };
      if (clean.length === 12) return { label: 'ISBN-13 / EAN-13 check digit', value: ean13Check(clean) };
      if (clean.length === 10) return { label: 'ISBN-10 is', value: isbn10Check(clean.slice(0, 9)) === clean[9] ? 'valid' : 'not valid' };
      if (clean.length === 13) return { label: 'ISBN-13 / EAN-13 is', value: ean13Check(clean.slice(0, 12)) === clean[12] ? 'valid' : 'not valid' };
    } catch {
      return null;
    }
    return null;
  });
</script>

<div class="tool-panel">
  <label class="tool-field">
    <span>Text to hash (case and spaces matter)</span>
    <input type="text" bind:value={input} spellcheck="false" />
  </label>
  {#if hashes}
    <dl class="hashes">
      {#each [['MD5', hashes.md5], ['SHA-1', hashes.sha1], ['SHA-256', hashes.sha256]] as [n, h]}
        <dt>{n}</dt><dd class:match={t && h === t}>{h}</dd>
      {/each}
    </dl>
  {/if}

  <h3 class="sub">Crack a hash by guessing</h3>
  <label class="tool-field">
    <span>The hash you want to match {kind ? `(looks like ${kind})` : target.trim() ? '(not a hash length I know)' : ''}</span>
    <input type="text" bind:value={target} spellcheck="false" placeholder="5d41402abc4b2a76b9719d911017c592" />
  </label>
  <label class="tool-field">
    <span>Candidate words: paste a list, or a whole text</span>
    <textarea rows="3" bind:value={candidates} spellcheck="false"></textarea>
  </label>
  <div class="row">
    <button type="button" class="btn" disabled={!kind || !candidates.trim() || searching} onclick={search}>Try every word</button>
    {#if result}<p>Match: <mark class="mono">{result}</mark></p>{:else if result === ''}<p class="meta">No word matched. Try other words, or other capitalisation.</p>{/if}
  </div>

  <h3 class="sub">Check digits</h3>
  <label class="tool-field">
    <span>ISBN or barcode digits: 9 or 12 to get the check digit, 10 or 13 to test one</span>
    <input type="text" bind:value={digits} inputmode="numeric" />
  </label>
  {#if check}<p>{check.label}: <b class="mono">{check.value}</b></p>{/if}
</div>

<style>
  .hashes {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.25rem 0.75rem;
    margin: 0;
    font-size: var(--step--1);
  }
  .hashes dt {
    color: var(--ink-soft);
  }
  .hashes dd {
    margin: 0;
    font-family: var(--mono);
    font-size: 0.75rem;
    overflow-wrap: anywhere;
  }
  .hashes dd.match {
    background: var(--mark);
    color: var(--on-mark);
  }
  .sub {
    font-size: var(--step-0);
    margin-top: 0.5rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }
</style>
