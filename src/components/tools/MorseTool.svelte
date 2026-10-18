<script lang="ts">
  import { MORSE, morseDecode, morseEncode } from '../../lib/encodings';
  import MorsePlayer from '../MorsePlayer.svelte';

  interface Props {
    text?: string;
  }
  let { text: initial = '' }: Props = $props();

  const looksMorse = /^[.\-·•_—–\s/|]+$/.test(initial.trim()) && initial.trim() !== '';
  let code = $state(looksMorse ? initial : morseEncode(initial));
  let text = $state(looksMorse ? morseDecode(initial) : initial);

  const LETTERS = Object.entries(MORSE).filter(([k]) => /[A-Z0-9]/.test(k));
</script>

<div class="tool-panel">
  <div class="tool-grid two">
    <label class="tool-field">
      <span>Text</span>
      <textarea
        rows="3"
        spellcheck="false"
        value={text}
        oninput={(e) => {
          text = e.currentTarget.value;
          code = morseEncode(text);
        }}
        placeholder="Type a message"></textarea>
    </label>
    <label class="tool-field">
      <span>Morse</span>
      <textarea
        rows="3"
        spellcheck="false"
        value={code}
        oninput={(e) => {
          code = e.currentTarget.value;
          text = morseDecode(code);
        }}
        placeholder=".... . .-.. .-.. ---"></textarea>
    </label>
  </div>
  <MorsePlayer {code} label="Play the Morse" />
  <p class="meta">Spaces separate letters and a slash separates words. A ? in the text means a code that isn't a letter.</p>
  <div class="chart" aria-label="Morse chart">
    {#each LETTERS as [letter, morse]}
      <div><b>{letter}</b><span>{morse}</span></div>
    {/each}
  </div>
</div>
