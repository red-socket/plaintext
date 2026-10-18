<script lang="ts">
  import { discreteLog, modPow } from '../../lib/modern';

  let p = $state(23);
  let g = $state(5);
  let a = $state(6);
  let b = $state(15);
  let publicValue = $state(8);
  let found = $state<number | null | undefined>(undefined);

  const valid = $derived(p > 2 && g > 1 && g < p);
  const A = $derived(valid ? modPow(g, a, p) : 0);
  const B = $derived(valid ? modPow(g, b, p) : 0);
  const sharedA = $derived(valid ? modPow(B, a, p) : 0);
  const sharedB = $derived(valid ? modPow(A, b, p) : 0);

  function crack() {
    found = discreteLog(g, publicValue, p);
  }
</script>

<div class="tool-panel">
  <div class="row">
    <label class="tool-field n"><span>Prime p (public)</span><input type="number" min="3" bind:value={p} /></label>
    <label class="tool-field n"><span>Base g (public)</span><input type="number" min="2" bind:value={g} /></label>
  </div>
  {#if valid}
    <div class="sides">
      <div class="side">
        <h3>Alice</h3>
        <label class="tool-field n"><span>Secret a</span><input type="number" min="1" bind:value={a} /></label>
        <p>Sends A = g<sup>a</sup> mod p = <b class="mono">{A}</b></p>
        <p>Computes B<sup>a</sup> mod p = <mark class="mono">{sharedA}</mark></p>
      </div>
      <div class="side">
        <h3>Bob</h3>
        <label class="tool-field n"><span>Secret b</span><input type="number" min="1" bind:value={b} /></label>
        <p>Sends B = g<sup>b</sup> mod p = <b class="mono">{B}</b></p>
        <p>Computes A<sup>b</sup> mod p = <mark class="mono">{sharedB}</mark></p>
      </div>
    </div>
    <p class="meta">Same number on both sides, but only A, B, p and g ever crossed the wire.</p>

    <h3 class="sub">Be the eavesdropper</h3>
    <p class="meta">With a small p you can find a secret exponent by trying every one. With the huge primes used for real, there isn't time.</p>
    <div class="row">
      <label class="tool-field n"><span>A public value (A or B)</span><input type="number" min="1" bind:value={publicValue} /></label>
      <button type="button" class="btn quiet" onclick={crack}>Try every exponent</button>
    </div>
    {#if found !== undefined}
      <p>{found === null ? 'No exponent gives that value.' : `g to the power ${found} is ${publicValue} (mod ${p}).`}</p>
    {/if}
  {:else}
    <p class="tool-error">p must be a prime above 2, and g between 2 and p − 1.</p>
  {/if}
</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
  }
  .n input {
    width: 8rem;
    font-family: var(--mono);
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--rule);
    border-radius: 3px;
    background: var(--paper);
  }
  .sides {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  }
  .side {
    display: grid;
    gap: 0.4rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--rule);
    border-radius: 4px;
    background: var(--paper);
  }
  .side h3,
  .sub {
    font-size: var(--step-0);
  }
</style>
