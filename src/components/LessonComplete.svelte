<script lang="ts">
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
    <h2>Lesson complete</h2>
    {#if toolName}
      <p>The <strong>{toolName}</strong> is now in your <a href="/toolkit">toolkit</a>. It's there on every puzzle page from now on.</p>
    {/if}
    {#if firstPuzzle}
      <p><a class="btn" href={firstPuzzle.href}>Start the puzzles: {firstPuzzle.title}</a></p>
      {#if next}<p class="meta">Or go on to the next lesson: <a href={next.href}>{next.title}</a>.</p>{/if}
    {:else if next}
      <p><a class="btn" href={next.href}>Next lesson: {next.title}</a></p>
    {/if}
  {:else}
    <h2>Finish the lesson</h2>
    <p>
      Answer the {checkIds.length || ''} questions above to finish{toolName ? ` and add the ${toolName} to your toolkit` : ''}.
      {#if checkIds.length}<span class="meta">{done} of {checkIds.length} done.</span>{/if}
    </p>
  {/if}
</div>

<style>
  .lesson-complete {
    display: grid;
    gap: 0.75rem;
    padding: 1.25rem;
    border: 2px dashed var(--rule);
    border-radius: 6px;
  }
  .lesson-complete.complete {
    border-style: solid;
    border-color: var(--ink);
  }
  h2 {
    font-size: var(--step-1);
  }
</style>
