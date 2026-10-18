<script lang="ts">
  import { spectrogram } from '../../lib/audio';
  import { loadAudio } from './audioLoad';

  interface Props {
    file?: string;
  }
  let { file }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let audio = $state<{ samples: Float32Array; sampleRate: number } | null>(null);
  let url = $state('');
  let name = $state('');
  let error = $state('');
  let busy = $state(false);
  let size = $state(1024);
  let maxHz = $state(0);
  let range = $state(60);

  async function load(bytes: ArrayBuffer, label: string, src: string) {
    busy = true;
    error = '';
    try {
      audio = await loadAudio(bytes);
      maxHz = audio.sampleRate / 2;
      name = label;
      url = src;
    } catch {
      error = 'That file could not be read as audio.';
    }
    busy = false;
  }

  async function fromUrl(u: string) {
    const res = await fetch(u);
    await load(await res.arrayBuffer(), u.split('/').pop() ?? u, u);
  }

  async function onPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) await load(await f.arrayBuffer(), f.name, URL.createObjectURL(f));
  }

  // Dark to violet to highlighter yellow: loud is bright.
  function colour(t: number): [number, number, number] {
    const stops: [number, number, number][] = [
      [22, 21, 31],
      [90, 54, 176],
      [242, 221, 74],
    ];
    const x = Math.max(0, Math.min(1, t)) * 2;
    const i = Math.min(1, Math.floor(x));
    const f = x - i;
    return [0, 1, 2].map((k) => stops[i][k] + (stops[i + 1][k] - stops[i][k]) * f) as [number, number, number];
  }

  $effect(() => {
    if (!canvas || !audio) return;
    // Aim for about 1200 columns whatever the length.
    const hop = Math.max(64, Math.floor(audio.samples.length / 1200));
    const { columns, binHz } = spectrogram(audio.samples, size, hop);
    const hz = binHz(audio.sampleRate);
    const rows = Math.min(size / 2, Math.ceil(maxHz / hz));
    canvas.width = columns.length;
    canvas.height = rows;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(columns.length, rows);
    for (let x = 0; x < columns.length; x++) {
      for (let y = 0; y < rows; y++) {
        const db = columns[x][rows - 1 - y];
        const [r, g, b] = colour(1 + db / range);
        const i = (y * columns.length + x) * 4;
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  });

  const ticks = $derived(maxHz ? [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round((maxHz * (1 - t)) / 100) / 10) : []);
</script>

<div class="tool-panel">
  <div class="row">
    <label class="tool-field"><span>Open a sound file (read in your browser)</span><input type="file" accept="audio/*,.wav" onchange={onPick} /></label>
    {#if file && /\.(wav|mp3|ogg|flac)$/i.test(file)}<button type="button" class="btn quiet" onclick={() => fromUrl(file)} disabled={busy}>Open the sound on this page</button>{/if}
  </div>
  <p class="tool-error" aria-live="polite">{error}</p>
  {#if busy}<p class="meta">Reading the sound…</p>{/if}

  {#if audio}
    <p class="meta">{name}: {(audio.samples.length / audio.sampleRate).toFixed(1)} seconds, {audio.sampleRate} samples per second.</p>
    {#if url}<audio controls src={url}></audio>{/if}
    <div class="controls">
      <label>Detail
        <select bind:value={size}>
          <option value={512}>Fast changes (512)</option>
          <option value={1024}>Balanced (1024)</option>
          <option value={2048}>Fine pitch (2048)</option>
        </select>
      </label>
      <label>Top frequency
        <select bind:value={maxHz}>
          {#each [2000, 4000, 8000, 11025, 16000, 22050].filter((f) => f <= audio!.sampleRate / 2) as f}<option value={f}>{f / 1000} kHz</option>{/each}
          <option value={audio.sampleRate / 2}>All ({audio.sampleRate / 2000} kHz)</option>
        </select>
      </label>
      <label>Show quiet sounds <input type="range" min="20" max="100" bind:value={range} /></label>
    </div>
    <div class="plot">
      <div class="axis" aria-hidden="true">{#each ticks as t}<span>{t} kHz</span>{/each}</div>
      <canvas bind:this={canvas} aria-label="Spectrogram: time left to right, pitch bottom to top"></canvas>
    </div>
    <p class="meta">Time runs left to right, pitch bottom to top, and brightness is loudness. Raise the top frequency if the picture is cut off.</p>
  {/if}
</div>

<style>
  .row,
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.25rem;
    align-items: center;
  }
  .controls label {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: var(--step--1);
  }
  select {
    font: inherit;
    font-size: var(--step--1);
    padding: 0.3rem 0.4rem;
    border: 1px solid var(--rule);
    border-radius: 3px;
    background: var(--paper);
  }
  input[type='range'] {
    accent-color: var(--violet);
  }
  input[type='file'] {
    font-size: var(--step--1);
  }
  audio {
    width: 100%;
  }
  .plot {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem;
  }
  .axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-family: var(--mono);
    font-size: 0.65rem;
    color: var(--ink-soft);
    text-align: right;
  }
  canvas {
    width: 100%;
    height: 18rem;
    image-rendering: auto;
    border-radius: 3px;
    background: #16151f;
  }
</style>
