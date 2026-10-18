<script lang="ts">
  import { bytesAsText, fromHex, toHex, xorBytes } from '../../lib/modern';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const uid = Math.random().toString(36).slice(2, 8);
  const looksHex = (s: string) => /^[\s0-9a-f]+$/i.test(s.trim()) && s.replace(/\s/g, '').length % 2 === 0 && s.trim() !== '';
  let input = $state(initial);
  let inputKind = $state<'text' | 'hex'>(looksHex(initial) ? 'hex' : 'text');
  let key = $state('');
  let keyKind = $state<'text' | 'hex'>('text');
  let a = $state('');
  let b = $state('');

  const bytesOf = (s: string, kind: 'text' | 'hex') => (kind === 'hex' ? fromHex(s) : new TextEncoder().encode(s));
  const result = $derived(input && key ? xorBytes(bytesOf(input, inputKind), bytesOf(key, keyKind)) : null);
  const both = $derived(a.trim() && b.trim() ? xorBytes(fromHex(a), fromHex(b).slice(0, fromHex(a).length)) : null);
</script>

<div class="tool-panel">
  <div class="tool-grid two">
    <div class="tool-field">
      <span>Input</span>
      <textarea rows="3" bind:value={input} spellcheck="false"></textarea>
      <fieldset class="tool-modes">
        <legend class="sr-only">Input is</legend>
        <label><input type="radio" name={`xi-${uid}`} value="text" bind:group={inputKind} /> Text</label>
        <label><input type="radio" name={`xi-${uid}`} value="hex" bind:group={inputKind} /> Hex</label>
      </fieldset>
    </div>
    <div class="tool-field">
      <span>Key (repeated as needed)</span>
      <input type="text" bind:value={key} spellcheck="false" />
      <fieldset class="tool-modes">
        <legend class="sr-only">Key is</legend>
        <label><input type="radio" name={`xk-${uid}`} value="text" bind:group={keyKind} /> Text</label>
        <label><input type="radio" name={`xk-${uid}`} value="hex" bind:group={keyKind} /> Hex</label>
      </fieldset>
    </div>
  </div>
  {#if result}
    <div class="tool-grid two">
      <div class="tool-field"><span>Result as hex</span><output class="out">{toHex(result)}</output></div>
      <div class="tool-field"><span>Result as text (· is unprintable)</span><output class="out">{bytesAsText(result)}</output></div>
    </div>
  {/if}

  <h3 class="sub">XOR two hex strings together</h3>
  <p class="meta">Two messages sent with the same key cancel it out: ciphertext one XOR ciphertext two is plaintext one XOR plaintext two.</p>
  <div class="tool-grid two">
    <label class="tool-field"><span>First (hex)</span><textarea rows="2" bind:value={a} spellcheck="false"></textarea></label>
    <label class="tool-field"><span>Second (hex)</span><textarea rows="2" bind:value={b} spellcheck="false"></textarea></label>
  </div>
  {#if both}<div class="tool-field"><span>XOR of the two</span><output class="out">{toHex(both)}</output></div>{/if}
</div>

<style>
  .out {
    display: block;
    min-height: 2.4rem;
    font-family: var(--mono);
    font-size: 0.85rem;
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--rule);
    overflow-wrap: anywhere;
  }
  .sub {
    font-size: var(--step-0);
    margin-top: 0.5rem;
  }
</style>
