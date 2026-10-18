<script lang="ts">
  import { onMount } from 'svelte';
  import { exportCode, importCode, isLessonDone, isSolved, mergeProgress, progress, resetProgress, type Progress } from '../lib/progress';

  interface Props {
    lessons: { id: string; title: string; puzzles: { id: string; title: string }[] }[];
  }

  let { lessons }: Props = $props();

  let p = $state<Progress>(progress.get());
  let code = $state('');
  let copied = $state(false);
  let incoming = $state('');
  let importMsg = $state<{ ok: boolean; text: string } | null>(null);
  let confirmReset = $state(false);

  onMount(() => progress.subscribe((next) => (p = next)));

  const allPuzzles = $derived(lessons.flatMap((l) => l.puzzles));
  const solved = $derived(allPuzzles.filter((z) => isSolved(p, z.id)));
  const clean = $derived(solved.filter((z) => (p.puzzles[z.id]?.hints ?? 0) === 0));
  const lessonsDone = $derived(lessons.filter((l) => isLessonDone(p, l.id)));
  const empty = $derived(Object.keys(p.checks).length + Object.keys(p.lessons).length + Object.keys(p.puzzles).length === 0);

  function makeCode() {
    code = exportCode(p);
    copied = false;
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
    } catch {
      copied = false;
    }
  }

  function doImport(e: SubmitEvent) {
    e.preventDefault();
    try {
      const other = importCode(incoming);
      const before = Object.values(p.puzzles).filter((z) => z.solvedAt).length;
      const merged = mergeProgress(p, other);
      progress.update((d) => Object.assign(d, merged));
      const gained = Object.values(merged.puzzles).filter((z) => z.solvedAt).length - before;
      importMsg = { ok: true, text: gained > 0 ? `Progress added. ${gained} more puzzle${gained === 1 ? '' : 's'} solved on this device.` : 'Progress added. Nothing new: this device already had all of it.' };
      incoming = '';
    } catch (err) {
      importMsg = { ok: false, text: (err as Error).message };
    }
  }

  function erase() {
    resetProgress();
    confirmReset = false;
    code = '';
  }
</script>

<section class="block" aria-labelledby="summary-title">
  <h2 id="summary-title">So far</h2>
  {#if empty}
    <p>Nothing yet. <a href={`/learn/${lessons[0]?.id ?? ''}`}>Start the first lesson</a> and your progress will show up here.</p>
  {:else}
    <p class="summary">
      {lessonsDone.length} of {lessons.length} lesson{lessons.length === 1 ? '' : 's'} complete.
      {solved.length} of {allPuzzles.length} puzzles solved{solved.length ? `, ${clean.length} without hints` : ''}.
    </p>
    {#each lessons as lesson}
      <h3><a href={`/learn/${lesson.id}`}>{lesson.title}</a>{#if isLessonDone(p, lesson.id)}<span class="tag">Complete</span>{/if}</h3>
      <ul>
        {#each lesson.puzzles as z}
          {@const s = p.puzzles[z.id]}
          <li>
            <a href={`/puzzles/${z.id}`}>{z.title}</a>
            <span class="meta">
              {#if s?.solvedAt}<span class="tag">Solved</span>{s.hints === 0 ? ' No hints.' : ` ${s.hints} hint${s.hints === 1 ? '' : 's'}.`}{:else if s?.hints}Not solved, {s.hints} hint{s.hints === 1 ? '' : 's'} seen.{:else}Not started.{/if}
            </span>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>

<section class="block" aria-labelledby="move-title">
  <h2 id="move-title">Move to another device</h2>
  <p>Your progress lives only in this browser. To carry it over, make a code here and paste it on the other device. Nothing is sent anywhere.</p>
  <div class="row">
    <button type="button" class="btn" onclick={makeCode} disabled={empty}>Make a progress code</button>
  </div>
  {#if code}
    <label class="field">
      <span>Your code</span>
      <textarea readonly rows="3" value={code} onfocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()}></textarea>
    </label>
    <div class="row">
      <button type="button" class="btn quiet" onclick={copy}>{copied ? 'Copied' : 'Copy code'}</button>
    </div>
  {/if}

  <form onsubmit={doImport}>
    <label class="field">
      <span>Paste a code from another device</span>
      <textarea rows="3" bind:value={incoming} spellcheck="false" placeholder="PT1-…"></textarea>
    </label>
    <div class="row">
      <button type="submit" class="btn" disabled={!incoming.trim()}>Add to this device</button>
    </div>
    <p class="msg" class:bad={importMsg && !importMsg.ok} aria-live="polite">{importMsg?.text ?? ''}</p>
    <p class="meta">Adding never removes anything: a puzzle solved on either device counts as solved.</p>
  </form>
</section>

<section class="block" aria-labelledby="erase-title">
  <h2 id="erase-title">Start over</h2>
  {#if confirmReset}
    <p><strong>Erase all progress on this device?</strong> Lessons, solved puzzles and tools will be gone. Make a code first if you might want them back.</p>
    <div class="row">
      <button type="button" class="btn danger" onclick={erase}>Erase progress</button>
      <button type="button" class="btn quiet" onclick={() => (confirmReset = false)}>Keep it</button>
    </div>
  {:else}
    <p>Erasing clears this browser only. Other devices keep their own progress.</p>
    <div class="row">
      <button type="button" class="btn quiet" onclick={() => (confirmReset = true)} disabled={empty}>Erase progress…</button>
    </div>
  {/if}
</section>

<style>
  .block {
    display: grid;
    gap: 0.9rem;
    max-width: var(--measure);
    padding-top: 2rem;
    border-top: 1px solid var(--rule);
  }
  h2 {
    font-size: var(--step-1);
  }
  h3 {
    font-size: var(--step-0);
    margin-top: 0.5rem;
  }
  .summary {
    font-size: var(--step-1);
    line-height: 1.45;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0 1rem;
  }
  .tag {
    margin: 0 0.4rem;
    padding: 0 0.35em;
    font-size: var(--step--1);
    font-weight: 400;
    color: var(--on-highlight);
    background: var(--highlight);
  }
  .row {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  form {
    display: grid;
    gap: 0.75rem;
    margin-top: 1rem;
  }
  .field {
    display: grid;
    gap: 0.3rem;
  }
  .field > span {
    font-size: var(--step--1);
    color: var(--ink-soft);
  }
  textarea {
    font-family: var(--mono);
    font-size: 0.8rem;
    line-height: 1.5;
    padding: 0.6rem 0.7rem;
    background: var(--paper-raised);
    border: 1px solid var(--rule);
    border-radius: 3px;
    word-break: break-all;
    resize: vertical;
  }
  .msg {
    min-height: 1.5em;
  }
  .msg.bad {
    color: var(--pencil);
  }
  .btn.danger {
    background: var(--pencil);
    border-color: var(--pencil);
    color: var(--paper);
  }
</style>
