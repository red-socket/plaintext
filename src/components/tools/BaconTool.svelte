<script lang="ts">
  import { baconDecode, baconEncode, baconFromCase } from '../../lib/classical';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  type Read = 'symbols' | 'case';
  let read = $state<Read>('symbols');
  let variant = $state<24 | 26>(26);
  let input = $state(initial);
  let swap = $state(false);
  let toEncode = $state('');

  // The two symbols in use, in order of first appearance (ignoring spaces).
  const symbols = $derived([...new Set([...input.replace(/\s+/g, '')])].slice(0, 3));
  const ab = $derived.by(() => {
    if (read === 'case') return baconFromCase(input);
    if (symbols.length !== 2) return input.toUpperCase().replace(/[^AB]/g, '');
    const [first, second] = symbols;
    const a = swap ? second : first;
    return [...input.replace(/\s+/g, '')].map((c) => (c === a ? 'A' : 'B')).join('');
  });
  const decoded = $derived(ab ? baconDecode(ab, variant) : '');
  const groups = $derived(ab.match(/.{1,5}/g)?.join(' ') ?? '');
</script>

<div class="tool-panel">
  <div class="rows">
    <fieldset class="tool-modes">
      <legend class="sr-only">Read as</legend>
      <label><input type="radio" name={`br-${uid}`} value="symbols" bind:group={read} /> Two symbols</label>
      <label><input type="radio" name={`br-${uid}`} value="case" bind:group={read} /> Letter case (capitals are B)</label>
    </fieldset>
    <fieldset class="tool-modes">
      <legend class="sr-only">Alphabet</legend>
      <label><input type="radio" name={`bv-${uid}`} value={26} bind:group={variant} /> 26 letters</label>
      <label><input type="radio" name={`bv-${uid}`} value={24} bind:group={variant} /> 24 letters (I=J, U=V)</label>
    </fieldset>
  </div>

  <label class="tool-field">
    <span>{read === 'case' ? 'Text with odd capitals' : 'A/B text, or any two symbols'}</span>
    <textarea rows="3" spellcheck="false" bind:value={input} placeholder={read === 'case' ? 'quIET nIght' : 'AABBB AABAA ABABB'}></textarea>
  </label>

  {#if read === 'symbols' && symbols.length === 2 && !/^[AB]+$/i.test(symbols.join(''))}
    <p class="meta">
      Reading <code>{swap ? symbols[1] : symbols[0]}</code> as A and <code>{swap ? symbols[0] : symbols[1]}</code> as B.
      <button type="button" class="btn quiet" onclick={() => (swap = !swap)}>Swap them</button>
    </p>
  {:else if read === 'symbols' && symbols.length > 2 && !/^[AB]+$/i.test(input.replace(/\s+/g, ''))}
    <p class="tool-error">More than two symbols. Bacon's cipher uses exactly two.</p>
  {/if}

  <div class="tool-grid two">
    <div class="tool-field"><span>As groups of five</span><output class="out">{groups || ' '}</output></div>
    <div class="tool-field"><span>Decoded</span><output class="out" aria-live="polite">{decoded || ' '}</output></div>
  </div>

  <label class="tool-field">
    <span>Encode letters</span>
    <input type="text" bind:value={toEncode} autocomplete="off" placeholder="Hello" />
  </label>
  {#if toEncode}<p class="mono enc">{baconEncode(toEncode, variant)}</p>{/if}
</div>

<style>
  .rows {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 2rem;
  }
  .out {
    display: block;
    min-height: 2.6rem;
    font-family: var(--mono);
    font-size: 0.85rem;
    line-height: 1.6;
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--rule);
    overflow-wrap: anywhere;
  }
  .enc {
    color: var(--teal);
    overflow-wrap: anywhere;
  }
</style>
