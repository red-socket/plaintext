<script lang="ts">
  import { url } from '../../lib/url';
  import jsQR from 'jsqr';
  import { eanFromRow } from '../../lib/barcode';

  interface Props {
    file?: string;
  }
  let { file }: Props = $props();

  let preview = $state('');
  let result = $state<{ kind: string; text: string } | null>(null);
  let status = $state('');

  function scan(src: string) {
    preview = src;
    result = null;
    status = 'Reading…';
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
      const qr = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' });
      if (qr) {
        result = { kind: 'QR code', text: qr.data };
        status = '';
        return;
      }
      // Try a barcode along several rows, brightness only.
      for (const f of [0.5, 0.4, 0.6, 0.3, 0.7]) {
        const y = Math.floor(height * f);
        const row = Array.from({ length: width }, (_, x) => {
          const i = (y * width + x) * 4;
          return (data[i] + data[i + 1] + data[i + 2]) / 3;
        });
        const ean = eanFromRow(row);
        if (ean) {
          result = { kind: 'EAN-13 barcode', text: ean };
          status = '';
          return;
        }
      }
      status = 'No QR code or EAN-13 barcode found. Try a sharper, straighter picture.';
    };
    img.onerror = () => (status = 'That file could not be opened as an image.');
    img.src = src;
  }

  function onPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) scan(URL.createObjectURL(f));
  }
</script>

<div class="tool-panel">
  <div class="row">
    <label class="tool-field"><span>Open a picture of a QR code or barcode (read in your browser)</span><input type="file" accept="image/*" onchange={onPick} /></label>
    {#if file && /\.(png|jpe?g|gif|webp)$/i.test(file)}<button type="button" class="btn quiet" onclick={() => scan(url(file))}>Scan the image on this page</button>{/if}
  </div>
  {#if preview}<img class="preview" src={preview} alt="The picture being scanned" />{/if}
  {#if result}
    <p>{result.kind}: <mark class="mono">{result.text}</mark></p>
  {/if}
  <p class="meta" aria-live="polite">{status}</p>
  <p class="meta">Reads QR codes (normal or white-on-black) and EAN-13 barcodes. QR codes survive a surprising amount of damage.</p>
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
  .preview {
    max-width: 16rem;
    max-height: 16rem;
    border: 1px solid var(--rule);
    image-rendering: pixelated;
  }
</style>
