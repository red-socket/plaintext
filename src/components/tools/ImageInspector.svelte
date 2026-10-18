<script lang="ts">
  import { bitPlane, channelView, printableShare, readLsb, type Channel } from '../../lib/pixels';

  interface Props {
    file?: string;
  }
  let { file }: Props = $props();

  let canvas = $state<HTMLCanvasElement | null>(null);
  let pixels = $state<ImageData | null>(null);
  let name = $state('');
  let error = $state('');
  type View = 'original' | 'channel' | 'plane';
  let view = $state<View>('original');
  let channel = $state<Channel>('r');
  let bit = $state(0);
  let stretch = $state(true);
  let invert = $state(false);
  let zoom = $state(1);
  let lsbChannels = $state('rgb');
  let lsbText = $state<string | null>(null);

  function loadImage(src: string, label: string) {
    error = '';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      pixels = ctx.getImageData(0, 0, c.width, c.height);
      name = label;
      lsbText = null;
    };
    img.onerror = () => (error = 'That file could not be opened as an image.');
    img.src = src;
  }

  function onPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) loadImage(URL.createObjectURL(f), f.name);
  }

  // Redraw whenever the view settings change.
  $effect(() => {
    if (!canvas || !pixels) return;
    const src = pixels.data;
    let data: Uint8ClampedArray;
    if (view === 'original') data = new Uint8ClampedArray(src);
    else if (view === 'channel') data = channelView(src, channel, stretch);
    else data = bitPlane(src, channel, bit);
    if (invert) for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] = 255 - data[i + c];
    canvas.width = pixels.width;
    canvas.height = pixels.height;
    canvas.getContext('2d')!.putImageData(new ImageData(data, pixels.width, pixels.height), 0, 0);
  });

  function runLsb() {
    if (!pixels) return;
    lsbText = readLsb(pixels.data, [...lsbChannels] as Channel[], 0, 2000);
  }
</script>

<div class="tool-panel">
  <div class="row">
    <label class="tool-field"><span>Open an image (read in your browser, never uploaded)</span><input type="file" accept="image/*" onchange={onPick} /></label>
    {#if file && /\.(png|jpe?g|gif|webp)$/i.test(file)}<button type="button" class="btn quiet" onclick={() => loadImage(file, file.split('/').pop() ?? '')}>Open the image on this page</button>{/if}
  </div>
  <p class="tool-error" aria-live="polite">{error}</p>

  {#if pixels}
    <p class="meta">{name}: {pixels.width} × {pixels.height} pixels.</p>
    <div class="controls">
      <label>View
        <select bind:value={view}>
          <option value="original">Original</option>
          <option value="channel">One colour channel</option>
          <option value="plane">One bit plane</option>
        </select>
      </label>
      {#if view !== 'original'}
        <label>Channel
          <select bind:value={channel}>
            <option value="r">Red</option><option value="g">Green</option><option value="b">Blue</option><option value="a">Alpha</option>
          </select>
        </label>
      {/if}
      {#if view === 'plane'}
        <label>Bit <input type="range" min="0" max="7" bind:value={bit} /> <b class="mono">{bit}</b>{bit === 0 ? ' (lowest)' : bit === 7 ? ' (highest)' : ''}</label>
      {/if}
      {#if view === 'channel'}<label class="check"><input type="checkbox" bind:checked={stretch} /> Stretch contrast</label>{/if}
      <label class="check"><input type="checkbox" bind:checked={invert} /> Invert</label>
      <label>Zoom <select bind:value={zoom}><option value={0.5}>50%</option><option value={1}>100%</option><option value={2}>200%</option></select></label>
    </div>
    <div class="frame">
      <canvas bind:this={canvas} style:width={`${pixels.width * zoom}px`}></canvas>
    </div>

    <div class="lsb">
      <label>Read a hidden message from the lowest bits of
        <select bind:value={lsbChannels}>
          <option value="rgb">red, green and blue</option>
          <option value="r">red only</option><option value="g">green only</option><option value="b">blue only</option>
        </select>
      </label>
      <button type="button" class="btn quiet" onclick={runLsb}>Read hidden text</button>
    </div>
    {#if lsbText !== null}
      {#if lsbText && printableShare(lsbText) > 0.9}
        <p class="found">Found: <mark class="mono">{lsbText.slice(0, 300)}</mark></p>
      {:else}
        <p class="meta">Nothing readable there. The message may use other channels, other bits, or a scheme this tool doesn't read.</p>
      {/if}
    {/if}
  {/if}
</div>

<style>
  .row,
  .controls,
  .lsb {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.25rem;
    align-items: center;
  }
  .controls label,
  .lsb label {
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
  input[type='range'],
  input[type='checkbox'] {
    accent-color: var(--violet);
  }
  input[type='file'] {
    font-size: var(--step--1);
  }
  .frame {
    width: fit-content;
    max-width: 100%;
    overflow: auto;
    max-height: 32rem;
    background: repeating-conic-gradient(var(--rule) 0% 25%, var(--paper) 0% 50%) 50% / 16px 16px;
    border: 1px solid var(--rule);
    border-radius: 3px;
  }
  canvas {
    display: block;
    image-rendering: pixelated;
    max-width: none;
  }
  .found mark {
    font-size: 0.9rem;
  }
</style>
