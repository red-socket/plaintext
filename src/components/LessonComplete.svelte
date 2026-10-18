<script lang="ts">
  import { url } from '../lib/url';
  import { onMount } from 'svelte';
  import { isLessonDone, progress, type Progress } from '../lib/progress';

  interface Props {
    lessonId: string;
    toolName?: string;
    firstPuzzle?: { href: string; title: string };
    next?: { href: string; title: string };
  }

  let { lessonId, toolName, firstPuzzle, next }: Props = $props();

  let checkIds = $state<string[]>([]);
  let p = $state<Progress>(progress.get());

  const done = $derived(checkIds.filter((c) => p.checks[c]).length);
  const complete = $derived(isLessonDone(p, lessonId));

  onMount(() => {
    checkIds = Array.from(document.querySelectorAll<HTMLElement>('[data-check-id]'), (el) => el.dataset.checkId!);
    return progress.subscribe((snap) => {
      p = snap;
      const allDone = checkIds.length > 0 && checkIds.every((c) => snap.checks[c]);
      if (allDone && !isLessonDone(snap, lessonId)) {
        progress.update((d) => (d.lessons[lessonId] = { completedAt: Date.now() }));
      }
    });
  });
</script>

<div class="lesson-complete" class:complete aria-live="polite">
  {#if complete}
    <div class="top">
      <h2>Lesson complete</h2>
      <p class="stamp" aria-hidden="true">Cleared</p>
    </div>
    {#if toolName}
      <p>The <strong>{toolName}</strong> is now in your <a href={url('/toolkit')}>toolkit</a>. It's there on every puzzle page from now on.</p>
    {/if}
    {#if firstPuzzle}
      <p><a class="btn" href={firstPuzzle.href}>Start the puzzles: {firstPuzzle.title}</a></p>
      {#if next}<p class="filing">Or go on to the next lesson: <a href={next.href}>{next.title}</a>.</p>{/if}
    {:else if next}
      <p><a class="btn" href={next.href}>Next lesson: {next.title}</a></p>
    {/if}
  {:else}
    <h2>Finish the lesson</h2>
    <p>
      Answer the {checkIds.length || ''} questions above to finish{toolName ? ` and add the ${toolName} to your toolkit` : ''}.
    </p>
    {#if checkIds.length}
      <p class="tally" aria-label={`${done} of ${checkIds.length} done`}>
        {#each checkIds as c}<span class="box" class:ticked={p.checks[c]}></span>{/each}
        <span class="filing">{done} of {checkIds.length} done</span>
      </p>
    {/if}
  {/if}
</div>

<style>
  .lesson-complete {
    display: grid;
    gap: 0.85rem;
    padding: 1.25rem 1.4rem 1.4rem;
    border: 2px dashed var(--ink);
  }
  .lesson-complete.complete {
    border-style: solid;
    background: var(--field);
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem 1rem;
  }
  h2 {
    font-size: 1.75rem;
  }
  .tally {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .box {
    position: relative;
    width: 15px;
    height: 15px;
    border: 2px solid var(--ink);
  }
  .box.ticked::after {
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
  .tally .filing {
    margin-left: 0.5rem;
    font-size: 0.875rem;
  }
</style>
