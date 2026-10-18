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
  // The bar over a fresh answer lifts after it renders; a saved answer shows uncovered.
  let lifted = $state(false);

  const scope = `check/${id}`;

  async function check(answer: string, silent = false) {
    const payload = await open(scope, answer, entries);
    if (payload?.type === 'solve') {
      status = 'solved';
      message = payload.note ?? '';
      value = payload.display ?? normalizeAnswer(answer);
      if (silent) lifted = true;
      else {
        progress.update((p) => (p.checks[id] = normalizeAnswer(answer)));
        setTimeout(() => (lifted = true), 60);
      }
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
    <p class="done"><span class="lifted mono" class:off={lifted}>{value}</span> <span class="ok">Correct.</span> {message}</p>
  {:else}
    <div class="row">
      <label class="sr-only" for={`qc-${id}`}>Your answer</label>
      <input id={`qc-${id}`} class="answer-input" bind:value autocomplete="off" spellcheck="false" placeholder="Your answer" />
      <button class="btn" type="submit" disabled={busy}>Check</button>
    </div>
    <p class="msg" class:wrong={status === 'wrong'} class:partial={status === 'partial'} aria-live="polite">{message}</p>
  {/if}
</form>

<style>
  .row {
    display: flex;
    gap: 0.6rem;
    align-items: stretch;
  }
  .row .answer-input {
    max-width: 20rem;
  }
  .msg {
    min-height: 1.5em;
    margin-top: 0.5rem;
    font-family: var(--mono);
    font-size: 0.875rem;
  }
  .msg.wrong {
    color: var(--red);
  }
  .msg.partial {
    color: var(--teal);
  }
  .done {
    padding-bottom: 0.4rem;
    line-height: 1.7;
  }
  .done .lifted {
    font-size: 1.125rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--teal);
    margin-right: 0.35rem;
  }
  .ok {
    font-weight: 700;
  }
</style>
