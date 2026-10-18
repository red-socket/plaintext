<script lang="ts">
  import { findEmbedded, hexdump, identify, imageEnd, readZip, strings, type ZipEntry } from '../../lib/files';

  interface Props {
    file?: string;
  }
  let { file }: Props = $props();

  let bytes = $state<Uint8Array | null>(null);
  let name = $state('');
  let page = $state(0);
  let tab = $state<'hex' | 'strings'>('hex');
  let minLen = $state(6);
  let preview = $state('');
  let zip = $state<{ offset: number; entries: ZipEntry[] } | null>(null);

  const LINES = 16;
  const sig = $derived(bytes ? identify(bytes) : null);
  const ext = $derived(name.includes('.') ? name.split('.').pop()!.toLowerCase() : '');
  const end = $derived(bytes ? imageEnd(bytes) : null);
  const embedded = $derived(bytes ? findEmbedded(bytes) : []);
  const dump = $derived(bytes ? hexdump(bytes, page * LINES * 16, LINES) : []);
  const found = $derived(bytes && tab === 'strings' ? strings(bytes, minLen).slice(0, 300) : []);
  const pages = $derived(bytes ? Math.ceil(bytes.length / (LINES * 16)) : 0);

  function load(b: Uint8Array, label: string) {
    bytes = b;
    name = label;
    page = 0;
    zip = null;
    if (preview) URL.revokeObjectURL(preview);
    preview = '';
  }

  async function onPick(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (f) load(new Uint8Array(await f.arrayBuffer()), f.name);
  }

  async function fromUrl(u: string) {
    const res = await fetch(u);
    load(new Uint8Array(await res.arrayBuffer()), u.split('/').pop() ?? u);
  }

  function showImage(from = 0) {
    if (!bytes) return;
    if (preview) URL.revokeObjectURL(preview);
    preview = URL.createObjectURL(new Blob([bytes.slice(from) as BlobPart]));
  }

  async function openZip(offset: number) {
    if (!bytes) return;
    zip = { offset, entries: await readZip(bytes, offset) };
  }

  const goTo = (offset: number) => {
    tab = 'hex';
    page = Math.floor(offset / (LINES * 16));
  };
  const isText = (d: Uint8Array) => d.every((b) => b === 9 || b === 10 || b === 13 || (b >= 0x20 && b < 0x7f) || b >= 0x80);
</script>

<div class="tool-panel">
  <div class="row">
    <label class="tool-field"><span>Open any file (read in your browser, never uploaded)</span><input type="file" onchange={onPick} /></label>
    {#if file}<button type="button" class="btn quiet" onclick={() => fromUrl(file)}>Open the file on this page</button>{/if}
  </div>

  {#if bytes}
    <section class="facts">
      <p><b>{name}</b>, {bytes.length.toLocaleString()} bytes.</p>
      <p>
        First bytes say: <strong>{sig ? `${sig.name}` : 'nothing recognisable (maybe text, or raw data)'}</strong>.
        {#if sig && ext && ext !== sig.ext && !(sig.ext === 'jpg' && ext === 'jpeg')}<span class="warn">The name says .{ext}, but the contents say .{sig.ext}.</span>{/if}
      </p>
      {#if sig && ['png', 'jpg', 'gif', 'bmp'].includes(sig.ext)}<button type="button" class="btn quiet" onclick={() => showImage()}>Show it as an image</button>{/if}
      {#if end !== null && end < bytes.length}
        <p class="warn">The image ends at byte {end.toLocaleString()}, but the file goes on for {(bytes.length - end).toLocaleString()} more. Something is attached.</p>
      {/if}
      {#if embedded.length}
        <p>Other files start inside this one:</p>
        <ul>
          {#each embedded as e}
            <li>
              {e.sig.name} at byte {e.offset.toLocaleString()}
              <button type="button" class="link" onclick={() => goTo(e.offset)}>view bytes</button>
              {#if e.sig.ext === 'zip'}<button type="button" class="link" onclick={() => openZip(e.offset)}>open the ZIP</button>{/if}
              {#if ['png', 'jpg', 'gif'].includes(e.sig.ext)}<button type="button" class="link" onclick={() => showImage(e.offset)}>show the image</button>{/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    {#if preview}<img class="preview" src={preview} alt={`Contents of ${name} shown as an image`} />{/if}

    {#if zip}
      <section class="zip">
        <p>The ZIP at byte {zip.offset.toLocaleString()} holds {zip.entries.length} file{zip.entries.length === 1 ? '' : 's'}:</p>
        {#each zip.entries as z}
          <div class="entry">
            <b class="mono">{z.name}</b> <span class="meta">{z.size} bytes</span>
            {#if isText(z.data)}<pre>{new TextDecoder().decode(z.data)}</pre>{/if}
          </div>
        {/each}
      </section>
    {/if}

    <div class="tabs" role="tablist">
      <button type="button" role="tab" aria-selected={tab === 'hex'} class:on={tab === 'hex'} onclick={() => (tab = 'hex')}>Bytes</button>
      <button type="button" role="tab" aria-selected={tab === 'strings'} class:on={tab === 'strings'} onclick={() => (tab = 'strings')}>Readable text</button>
    </div>

    {#if tab === 'hex'}
      <div class="dump" role="tabpanel">
        {#each dump as l}<div><span class="o">{l.offset}</span><span class="h">{l.hex}</span><span class="a">{l.ascii}</span></div>{/each}
      </div>
      <div class="pager">
        <button type="button" class="btn quiet" disabled={page === 0} onclick={() => page--}>Previous</button>
        <span class="meta">Page {page + 1} of {pages}</span>
        <button type="button" class="btn quiet" disabled={page >= pages - 1} onclick={() => page++}>Next</button>
      </div>
    {:else}
      <div role="tabpanel">
        <label class="len">At least <input type="number" min="3" max="40" bind:value={minLen} /> characters long</label>
        <ul class="strings">
          {#each found as s}<li><button type="button" class="link o" onclick={() => goTo(s.offset)}>{s.offset.toString(16).toUpperCase().padStart(8, '0')}</button> <code>{s.text}</code></li>{/each}
        </ul>
        {#if !found.length}<p class="meta">No runs of readable text that long.</p>{/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .row,
  .pager,
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    align-items: center;
  }
  input[type='file'] {
    font-size: var(--step--1);
  }
  .facts {
    display: grid;
    gap: 0.4rem;
    justify-items: start;
  }
  .facts ul {
    margin: 0;
    padding-left: 1.2rem;
  }
  .warn {
    color: var(--red);
    font-weight: 600;
  }
  .link {
    border: 0;
    background: none;
    padding: 0;
    margin-left: 0.5rem;
    color: inherit;
    font-size: inherit;
    text-decoration: underline;
    text-decoration-color: var(--teal);
    cursor: pointer;
  }
  .preview {
    max-width: 100%;
    max-height: 22rem;
    border: 1px solid var(--rule);
    justify-self: start;
  }
  .zip {
    padding: 0.75rem 1rem;
    border-left: 3px solid var(--mark);
    background: var(--paper);
  }
  .zip pre {
    margin: 0.4rem 0 0;
    white-space: pre-wrap;
    font-size: 0.85rem;
  }
  .tabs button {
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    padding: 0.3rem 0;
    font-weight: 600;
    cursor: pointer;
    color: var(--ink-soft);
  }
  .tabs button.on {
    color: var(--ink);
    border-bottom-color: var(--teal);
  }
  .dump {
    font-family: var(--mono);
    font-size: 0.72rem;
    line-height: 1.7;
    overflow-x: auto;
    padding: 0.5rem 0.75rem;
    background: var(--paper);
    border: 1px solid var(--rule);
    white-space: pre;
  }
  .dump .o {
    color: var(--ink-soft);
    margin-right: 1.25rem;
  }
  .dump .h {
    color: var(--teal);
    margin-right: 1.25rem;
    display: inline-block;
    min-width: 47ch;
  }
  .strings {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    max-height: 18rem;
    overflow-y: auto;
    font-size: var(--step--1);
  }
  .strings .o {
    margin: 0 0.5rem 0 0;
    font-family: var(--mono);
    font-size: 0.72rem;
    color: var(--ink-soft);
  }
  .len input {
    width: 4rem;
    margin: 0 0.3rem;
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--rule);
    background: var(--paper);
    font-family: var(--mono);
  }
</style>
