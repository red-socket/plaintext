<script lang="ts">
  import { base32Decode, base32Encode, base64Decode, base64Encode } from '../../lib/encodings';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  type Mode = 'base64' | 'base32';
  const uid = Math.random().toString(36).slice(2, 8);
  const codec = {
    base64: { encode: base64Encode, decode: base64Decode },
    base32: { encode: base32Encode, decode: base32Decode },
  };

  // Base32 is a subset of Base64's alphabet, so prefer it only when the text fits it.
  const t = initial.trim();
  let mode = $state<Mode>(t && /^[A-Z2-7=\s]+$/.test(t) && t.replace(/\s/g, '').length % 8 === 0 ? 'base32' : 'base64');
  let encoded = $state(t);
  let text = $state('');
  let error = $state('');
  let last = $state<'text' | 'encoded'>('encoded');

  function fromEncoded(v: string) {
    encoded = v;
    last = 'encoded';
    try {
      text = v.trim() ? codec[mode].decode(v) : '';
      error = '';
    } catch (e) {
      error = (e as Error).message;
    }
  }
  function fromText(v: string) {
    text = v;
    last = 'text';
    encoded = codec[mode].encode(v);
    error = '';
  }
  function setMode(m: Mode) {
    mode = m;
    if (last === 'text') fromText(text);
    else fromEncoded(encoded);
  }
  fromEncoded(encoded);
</script>

<div class="tool-panel">
  <fieldset class="tool-modes">
    <legend class="sr-only">Encoding</legend>
    <label><input type="radio" name={`b64-${uid}`} checked={mode === 'base64'} onchange={() => setMode('base64')} /> Base64</label>
    <label><input type="radio" name={`b64-${uid}`} checked={mode === 'base32'} onchange={() => setMode('base32')} /> Base32</label>
  </fieldset>
  <div class="tool-grid two">
    <label class="tool-field">
      <span>{mode === 'base64' ? 'Base64' : 'Base32'}</span>
      <textarea rows="3" spellcheck="false" value={encoded} oninput={(e) => fromEncoded(e.currentTarget.value)} placeholder={mode === 'base64' ? 'SGVsbG8gd29ybGQ=' : 'JBSWY3DPEE======'}></textarea>
    </label>
    <label class="tool-field">
      <span>Text</span>
      <textarea rows="3" spellcheck="false" value={text} oninput={(e) => fromText(e.currentTarget.value)} placeholder="Hello world"></textarea>
    </label>
  </div>
  <p class="tool-error" aria-live="polite">{error}</p>
  <p class="meta">If the text comes out as gibberish, it may be encoded more than once, or be hex or another encoding underneath. Paste it back in and look again.</p>
</div>
