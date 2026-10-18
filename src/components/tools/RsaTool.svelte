<script lang="ts">
  import { factor, rsaKeys, rsaNumbers } from '../../lib/modern';

  let p = $state(61);
  let q = $state(53);
  let e = $state(17);
  let numbers = $state('');
  let exp = $state(17);
  let n = $state(3233);
  let toFactor = $state(3233);
  let factored = $state<[number, number] | null | undefined>(undefined);

  const keys = $derived(p > 1 && q > 1 ? rsaKeys(p, q, e) : null);
  const list = $derived((numbers.match(/\d+/g) ?? []).map(Number));
  const result = $derived(list.length && n > 1 ? rsaNumbers(list, exp, n) : []);
  const asLetters = $derived(result.every((x) => x >= 1 && x <= 26) ? result.map((x) => String.fromCharCode(64 + x)).join('') : '');

  function useKey(which: 'public' | 'private') {
    if (!keys) return;
    n = keys.n;
    exp = which === 'public' ? keys.e : keys.d;
  }
</script>

<div class="tool-panel">
  <h3 class="sub">Make a key</h3>
  <div class="row">
    <label class="tool-field n"><span>Prime p</span><input type="number" min="2" bind:value={p} /></label>
    <label class="tool-field n"><span>Prime q</span><input type="number" min="2" bind:value={q} /></label>
    <label class="tool-field n"><span>Public exponent e</span><input type="number" min="2" bind:value={e} /></label>
  </div>
  {#if keys}
    <p>n = p × q = <b class="mono">{keys.n}</b>, φ = (p − 1)(q − 1) = <b class="mono">{keys.phi}</b>, private exponent d = <mark class="mono">{keys.d}</mark></p>
    <div class="row">
      <button type="button" class="btn quiet" onclick={() => useKey('public')}>Use the public key below</button>
      <button type="button" class="btn quiet" onclick={() => useKey('private')}>Use the private key below</button>
    </div>
  {:else}
    <p class="tool-error">e must share no factor with (p − 1)(q − 1). Try another e.</p>
  {/if}

  <h3 class="sub">Raise numbers to a power, mod n</h3>
  <div class="row">
    <label class="tool-field n"><span>Exponent (e to encrypt, d to decrypt)</span><input type="number" min="1" bind:value={exp} /></label>
    <label class="tool-field n"><span>Modulus n</span><input type="number" min="2" bind:value={n} /></label>
  </div>
  <label class="tool-field"><span>Numbers</span><textarea rows="2" bind:value={numbers} spellcheck="false"></textarea></label>
  {#if result.length}
    <div class="tool-field"><span>Result</span><output class="out">{result.join(' ')}</output></div>
    {#if asLetters}<p>As A1Z26 letters: <mark class="mono">{asLetters}</mark></p>{/if}
  {/if}

  <h3 class="sub">Break a small key</h3>
  <p class="meta">RSA is only as strong as n is hard to factor. Real keys have over 600 digits; these have four.</p>
  <div class="row">
    <label class="tool-field n"><span>n</span><input type="number" min="4" bind:value={toFactor} /></label>
    <button type="button" class="btn quiet" onclick={() => (factored = factor(toFactor))}>Find its factors</button>
  </div>
  {#if factored !== undefined}<p>{factored ? `${toFactor} = ${factored[0]} × ${factored[1]}` : `${toFactor} is prime.`}</p>{/if}
</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: end;
  }
  .n input {
    width: 9rem;
    font-family: var(--mono);
    padding: 0.4rem 0.5rem;
    border: 1px solid var(--rule);
    border-radius: 3px;
    background: var(--paper);
  }
  .sub {
    font-size: var(--step-0);
    margin-top: 0.4rem;
  }
  .out {
    display: block;
    min-height: 2.4rem;
    font-family: var(--mono);
    font-size: 0.85rem;
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--rule);
    overflow-wrap: anywhere;
  }
</style>
