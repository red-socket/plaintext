<script lang="ts">
  import { readMetadata, type Metadata } from '../../lib/metadata';

  interface Props {
    file?: string;
  }
  let { file }: Props = $props();

  let meta = $state<Metadata | null>(null);
  let name = $state('');
  let error = $state('');

  async function load(bytes: Uint8Array, label: string) {
    name = label;
    error = '';
    try {
      meta = await readMetadata(bytes);
      if (meta.format === 'unknown') error = 'This file is not a JPEG or PNG, so there is nothing here to read.';
    } catch (e) {
      meta = null;
      error = `Couldn't read that file: ${(e as Error).message}`;
    }
  }

  async function fromUrl(url: string) {
    const res = await fetch(url);
    await load(new Uint8Array(await res.arrayBuffer()), url.split('/').pop() ?? url);
  }

  async function onPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) await load(new Uint8Array(await f.arrayBuffer()), f.name);
  }
</script>

<div class="tool-panel">
  <label class="tool-field">
    <span>Open a JPEG or PNG. Nothing is uploaded: the file is read in your browser.</span>
    <input type="file" accept="image/jpeg,image/png" onchange={onPick} />
  </label>
  {#if file && /\.(jpe?g|png)$/i.test(file) && !name}<button type="button" class="btn quiet" onclick={() => fromUrl(file)}>Read the file on this page</button>{/if}

  <p class="tool-error" aria-live="polite">{error}</p>
  {#if meta && meta.format !== 'unknown'}
    <p class="meta">{name}: {meta.format.toUpperCase()}, {meta.fields.length} field{meta.fields.length === 1 ? '' : 's'} found.</p>
    {#if meta.fields.length}
      <table>
        <thead><tr><th scope="col">Where</th><th scope="col">Field</th><th scope="col">Value</th></tr></thead>
        <tbody>
          {#each meta.fields as f}
            <tr><td>{f.group}</td><td>{f.name}</td><td class="v">{f.value}</td></tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p>No metadata in this file. Many sites strip it when you upload a photo.</p>
    {/if}
    {#if meta.gps}
      {@const lat = meta.gps.lat.toFixed(5)}
      {@const lon = meta.gps.lon.toFixed(5)}
      <p>
        Taken at {lat}, {lon}.
        <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`} target="_blank" rel="noopener">Show on OpenStreetMap</a>
      </p>
    {/if}
  {/if}
</div>

<style>
  input[type='file'] {
    font-size: var(--step--1);
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: var(--step--1);
  }
  th,
  td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--rule);
    vertical-align: top;
  }
  th {
    color: var(--ink-soft);
    font-weight: 600;
  }
  .v {
    font-family: var(--mono);
    font-size: 0.8rem;
    overflow-wrap: anywhere;
  }
</style>
