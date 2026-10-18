<script lang="ts">
  import { asciiDecode, asciiEncode, binaryDecode, binaryEncode, hexDecode, hexEncode } from '../../lib/encodings';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  type Field = 'text' | 'binary' | 'decimal' | 'hex';
  const decoders: Record<Exclude<Field, 'text'>, (s: string) => string> = { binary: binaryDecode, decimal: asciiDecode, hex: hexDecode };

  // Guess what the puzzle text is, so the tool opens already decoded.
  function guess(s: string): Field {
    const t = s.trim();
    if (!t) return 'text';
    if (/^[01\s]+$/.test(t)) return 'binary';
    const tokens = t.replace(/0x/gi, '').split(/[\s,]+/);
    if (!tokens.every((x) => /^[0-9a-f]+$/i.test(x))) return 'text';
    // Letters A–F, or every group exactly two characters: hex. Otherwise decimal codes.
    if (/[a-f]/i.test(t) || tokens.every((x) => x.length === 2)) return 'hex';
    return 'decimal';
  }

  let values = $state<Record<Field, string>>({ text: '', binary: '', decimal: '', hex: '' });

  function set(field: Field, v: string) {
    const text = field === 'text' ? v : decoders[field](v);
    values = {
      text,
      binary: field === 'binary' ? v : binaryEncode(text),
      decimal: field === 'decimal' ? v : asciiEncode(text),
      hex: field === 'hex' ? v : hexEncode(text),
    };
  }
  set(guess(initial), initial);

  // One number in three bases.
  let num = $state('65');
  const n = $derived(/^\d+$/.test(num.trim()) ? BigInt(num.trim()) : null);
  let numBin = $derived(n === null ? '' : n.toString(2));
  let numHex = $derived(n === null ? '' : n.toString(16).toUpperCase());

  function setFrom(base: 2 | 16, v: string) {
    const clean = v.trim().replace(/^0x/i, '');
    const ok = base === 2 ? /^[01]+$/.test(clean) : /^[0-9a-f]+$/i.test(clean);
    if (ok) num = BigInt((base === 2 ? '0b' : '0x') + clean).toString(10);
  }

  const FIELDS: { id: Field; label: string; hint: string }[] = [
    { id: 'text', label: 'Text', hint: 'Hello' },
    { id: 'binary', label: 'Binary (8 bits per character)', hint: '01001000 01101001' },
    { id: 'decimal', label: 'Decimal (ASCII codes)', hint: '72 101 108 108 111' },
    { id: 'hex', label: 'Hex', hint: '48 65 6C 6C 6F' },
  ];
</script>

<div class="tool-panel">
  <div class="tool-grid two">
    {#each FIELDS as f}
      <label class="tool-field">
        <span>{f.label}</span>
        <textarea rows="2" spellcheck="false" value={values[f.id]} oninput={(e) => set(f.id, e.currentTarget.value)} placeholder={f.hint}></textarea>
      </label>
    {/each}
  </div>
  <p class="meta">Type in any box and the others follow. A ? at the end means a group was cut short.</p>

  <h3 class="sub">One number</h3>
  <div class="numbers">
    <label class="tool-field"><span>Decimal</span><input type="text" inputmode="numeric" bind:value={num} /></label>
    <label class="tool-field"><span>Binary</span><input type="text" value={numBin} oninput={(e) => setFrom(2, e.currentTarget.value)} /></label>
    <label class="tool-field"><span>Hex</span><input type="text" value={numHex} oninput={(e) => setFrom(16, e.currentTarget.value)} /></label>
  </div>
  {#if n !== null && n < 256n}
    <p class="meta">As a character: <code>{n >= 32n && n !== 127n ? String.fromCharCode(Number(n)) : 'not printable'}</code></p>
  {/if}
</div>

<style>
  .sub {
    font-size: var(--step-0);
    margin-top: 0.5rem;
  }
  .numbers {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  }
</style>
