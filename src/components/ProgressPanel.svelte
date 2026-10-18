<script lang="ts">
  import { url } from '../lib/url';
  import { onMount } from 'svelte';
  import { exportCode, importCode, isLessonDone, isSolved, mergeProgress, progress, resetProgress, type Progress } from '../lib/progress';

  interface Props {
    groups: { kind: 'lesson' | 'case'; id: string; title: string; href: string; puzzles: { id: string; title: string }[] }[];
  }

  let { groups }: Props = $props();
  const lessons = $derived(groups.filter((g) => g.kind === 'lesson'));

  let p = $state<Progress>(progress.get());
  let code = $state('');
  let copied = $state(false);
  let incoming = $state('');
  let importMsg = $state<{ ok: boolean; text: string } | null>(null);
  let confirmReset = $state(false);

  onMount(() => progress.subscribe((next) => (p = next)));

  const allPuzzles = $derived(groups.flatMap((g) => g.puzzles));
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
    <p>Nothing yet. <a href={url(`/learn/${lessons[0]?.id ?? ''}`)}>Start the first lesson</a> and your progress will show up here.</p>
  {:else}
    <p class="summary">
      {lessonsDone.length} of {lessons.length} lesson{lessons.length === 1 ? '' : 's'} complete.
      {solved.length} of {allPuzzles.length} puzzles solved{solved.length ? `, ${clean.length} without hints` : ''}.
    </p>
    {#each groups.filter((g) => g.puzzles.length || (g.kind === 'lesson' && isLessonDone(p, g.id))) as group}
      <h3><a href={group.href}>{group.title}</a>{#if group.kind === 'lesson' && isLessonDone(p, group.id)}<span class="tag">Complete</span>{/if}</h3>
      <ul>
        {#each group.puzzles as z}
          {@const s = p.puzzles[z.id]}
          <li class:done={s?.solvedAt}>
            <span class="box" aria-hidden="true"></span>
            <a href={url(`/puzzles/${z.id}`)}>{z.title}</a>
            <span class="dots" aria-hidden="true"></span>
            <span class="meta">
              {#if s?.solvedAt}Solved.{s.hints === 0 ? ' No hints.' : ` ${s.hints} hint${s.hints === 1 ? '' : 's'}.`}{:else if s?.hints}Not solved, {s.hints} hint{s.hints === 1 ? '' : 's'} seen.{:else}Not started.{/if}
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
    max-width: 44rem;
    margin-top: 2.5rem;
    padding-top: 1.75rem;
    border-top: 3px solid var(--ink);
  }
  h2 {
    font-size: clamp(1.75rem, 1.4rem + 1.2vw, 2.25rem);
  }
  h3 {
    font-size: 1.1875rem;
    margin-top: 0.9rem;
  }
  .summary {
    font-size: var(--step-1);
    line-height: 1.45;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0.35rem 0;
    border: 2px solid var(--ink);
    background: var(--field);
  }
  li {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    padding: 0.3rem 0.9rem;
  }
  .box {
    flex: none;
    position: relative;
    width: 15px;
    height: 15px;
    border: 2px solid var(--ink);
    align-self: center;
  }
  li.done .box::after {
    content: '';
    position: absolute;
    left: 3px;
    top: -6px;
    width: 7px;
    height: 14px;
    border: solid var(--teal);
    border-width: 0 3px 3px 0;
    transform: rotate(40deg);
  }
  .dots {
    flex: 1;
    min-width: 12px;
    border-bottom: 2px dotted var(--rule);
    transform: translateY(-0.3em);
  }
  li .meta {
    flex: none;
  }
  li.done .meta {
    color: var(--teal);
  }
  .tag {
    margin: 0 0.5rem;
    padding: 0.1em 0.45em;
    font-family: var(--mono);
    font-size: 0.75rem;
    font-weight: 600;
    vertical-align: 0.15em;
    color: var(--on-mark);
    background: var(--mark);
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
    font-family: var(--mono);
    font-size: 0.8125rem;
    color: var(--ink-soft);
  }
  textarea {
    font-family: var(--mono);
    font-size: 0.8125rem;
    line-height: 1.5;
    padding: 0.6rem 0.7rem;
    background: var(--field);
    border: 2px solid var(--ink);
    word-break: break-all;
    resize: vertical;
  }
  .msg {
    min-height: 1.5em;
    font-family: var(--mono);
    font-size: 0.875rem;
  }
  .msg.bad {
    color: var(--red);
  }
  .btn.danger {
    background: var(--red);
    border-color: var(--red);
    color: var(--field);
  }
  @media (max-width: 40rem) {
    li {
      flex-wrap: wrap;
    }
    .dots {
      display: none;
    }
    li .meta {
      flex-basis: 100%;
      padding-left: 1.6rem;
    }
  }
</style>
