<script lang="ts">
  import { onDestroy } from 'svelte';
  import { playMorse, SPEEDS } from '../lib/morseAudio';

  interface Props {
    code: string;
    /** Show the speed choice. */
    speeds?: boolean;
    label?: string;
  }
  let { code, speeds = true, label = 'Play' }: Props = $props();

  let speed = $state<keyof typeof SPEEDS>('slow');
  let playing = $state(false);
  let stopFn: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const uid = Math.random().toString(36).slice(2, 8);

  function stop() {
    stopFn?.();
    stopFn = null;
    clearTimeout(timer);
    playing = false;
  }

  function play() {
    if (playing) return stop();
    if (!code.trim()) return;
    const p = playMorse(code, SPEEDS[speed]);
    stopFn = p.stop;
    playing = true;
    timer = setTimeout(stop, p.duration * 1000 + 100);
  }

  onDestroy(stop);
</script>

<div class="player">
  <button type="button" class="btn" onclick={play} aria-pressed={playing}>
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      {#if playing}<rect x="3" y="3" width="10" height="10" fill="currentColor" />{:else}<path d="M4 2 L14 8 L4 14 Z" fill="currentColor" />{/if}
    </svg>
    {playing ? 'Stop' : label}
  </button>
  {#if speeds}
    <label class="speed">
      <span class="sr-only">Speed</span>
      <select bind:value={speed} id={`speed-${uid}`} disabled={playing}>
        <option value="slow">Slow</option>
        <option value="normal">Normal</option>
        <option value="fast">Fast</option>
      </select>
    </label>
  {/if}
</div>

<style>
  .player {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    flex-wrap: wrap;
  }
  select {
    font-size: var(--step--1);
    padding: 0.4rem 0.5rem;
    border: 2px solid var(--ink);
    background: var(--paper);
  }
</style>
