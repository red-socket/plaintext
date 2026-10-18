<script lang="ts">
  import { MARTIN_M1, sstvDecode } from '../../lib/audio';
  import { loadAudio } from './audioLoad';

  interface Props {
    file?: string;
  }
  let { file }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let status = $state('');
  let lines = $state(0);
  let busy = $state(false);

  async function decode(bytes: ArrayBuffer, label: string) {
    busy = true;
    lines = 0;
    status = `Decoding ${label}…`;
    // Let the message paint before the heavy work starts.
    await new Promise((r) => setTimeout(r, 30));
    try {
      const { samples, sampleRate } = await loadAudio(bytes, 11025);
      const out = sstvDecode(samples, sampleRate);
      lines = out.lines;
      if (!out.lines) {
        status = 'No Martin M1 picture found in that sound.';
      } else {
        const W = MARTIN_M1.width;
        canvas!.width = W;
        canvas!.height = out.lines;
        const ctx = canvas!.getContext('2d')!;
        const img = ctx.createImageData(W, out.lines);
        for (let p = 0; p < W * out.lines; p++) {
          img.data[p * 4] = out.rgb[p * 3];
          img.data[p * 4 + 1] = out.rgb[p * 3 + 1];
          img.data[p * 4 + 2] = out.rgb[p * 3 + 2];
          img.data[p * 4 + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        status = `${label}: ${out.lines} of ${MARTIN_M1.height} lines decoded.`;
      }
    } catch {
      status = 'That file could not be read as audio.';
    }
    busy = false;
  }

  async function onPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) await decode(await f.arrayBuffer(), f.name);
  }

  async function fromUrl(u: string) {
    const res = await fetch(u);
    await decode(await res.arrayBuffer(), u.split('/').pop() ?? u);
  }
</script>

<div class="tool-panel">
  <div class="row">
    <label class="tool-field"><span>Open an SSTV recording (read in your browser)</span><input type="file" accept="audio/*,.wav" onchange={onPick} disabled={busy} /></label>
    {#if file && /\.(wav|mp3|ogg|flac)$/i.test(file)}<button type="button" class="btn quiet" onclick={() => fromUrl(file)} disabled={busy}>Decode this puzzle's sound</button>{/if}
  </div>
  <p class="meta" aria-live="polite">{status}</p>
  <canvas bind:this={canvas} class:empty={!lines} aria-label="Decoded picture"></canvas>
  <p class="meta">Reads Martin M1, the most common amateur mode. Other modes (Robot, Scottie, PD) will come out as noise.</p>
</div>

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.25rem;
    align-items: center;
  }
  input[type='file'] {
    font-size: var(--step--1);
  }
  canvas {
    width: 100%;
    max-width: 40rem;
    image-rendering: pixelated;
    border-radius: 3px;
    background: #16151f;
  }
  canvas.empty {
    display: none;
  }
</style>
