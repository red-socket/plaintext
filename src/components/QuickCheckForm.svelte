<script lang="ts">
  import { onMount } from 'svelte';
  import { normalizeAnswer } from '../lib/normalize';
  import { progress } from '../lib/progress';
  import { open, type SealedEntry } from '../lib/seal';

  interface Props {
    id: string;
    entries: SealedEntry[];
  }

  let { id, entries }: Props = $props();

  let value = $state('');
  let status = $state<'idle' | 'wrong' | 'partial' | 'solved'>('idle');
  let message = $state('');
  let busy = $state(false);

  const scope = `check/${id}`;

  async function check(answer: string, silent = false) {
    const payload = await open(scope, answer, entries);
    if (payload?.type === 'solve') {
      status = 'solved';
      message = payload.note ?? '';
      value = normalizeAnswer(answer);
      if (!silent) progress.update((p) => (p.checks[id] = normalizeAnswer(answer)));
    } else if (payload?.type === 'partial') {
      status = 'partial';
      message = payload.reply;
    } else if (!silent) {
      status = 'wrong';
      message = `Not ${normalizeAnswer(answer) || 'that'}. Try again.`;
    }
  }

  onMount(() => {
    const saved = progress.get().checks[id];
    if (saved) check(saved, true);
  });

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!value.trim() || busy) return;
    busy = true;
    await check(value);
    busy = false;
  }
</script>

<form class="qc" class:solved={status === 'solved'} onsubmit={submit}>
  {#if status === 'solved'}
    <p class="done"><mark class="mono">{value}</mark> <span>Correct.</span> {message}</p>
  {:else}
    <div class="row">
      <label class="sr-only" for={`qc-${id}`}>Your answer</label>
      <input id={`qc-${id}`} class="answer-input" bind:value autocomplete="off" spellcheck="false" placeholder="Your answer" />
      <button class="btn" type="submit" disabled={busy}>Check</button>
    </div>
    <p class="msg" class:wrong={status === 'wrong'} aria-live="polite">{message}</p>
  {/if}
</form>

<style>
  .row {
    display: flex;
    gap: 0.75rem;
    align-items: end;
  }
  .row .answer-input {
    max-width: 16rem;
  }
  .msg {
    min-height: 1.5em;
    margin-top: 0.4rem;
    font-size: var(--step--1);
  }
  .msg.wrong {
    color: var(--pencil);
  }
  .done {
    font-size: var(--step--1);
  }
  .done mark {
    font-size: 0.95rem;
  }
  .done span {
    font-weight: 600;
  }
</style>
