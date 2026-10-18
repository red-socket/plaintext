<script lang="ts">
  import { ALPHABET, allShifts, caesarDecrypt, caesarEncrypt, mod26 } from '../../lib/caesar';

  interface Props {
    shift?: number;
    text?: string;
    mode?: 'encrypt' | 'decrypt';
    /** Show the "Try all shifts" option. */
    bruteForce?: boolean;
    label?: string;
  }

  let { shift: initialShift = 3, text: initialText = '', mode: initialMode = 'encrypt', bruteForce = true, label = 'Caesar wheel' }: Props = $props();

  // `pos` is unbounded so the ring keeps turning the same way across Z→A.
  let pos = $state(initialShift);
  let text = $state(initialText);
  let mode = $state(initialMode);
  let showAll = $state(false);
  let dragging = $state(false);

  const uid = Math.random().toString(36).slice(2, 8);
  const STEP = 360 / 26;
  const shift = $derived(mod26(pos));
  const output = $derived(mode === 'encrypt' ? caesarEncrypt(text, shift) : caesarDecrypt(text, shift));
  const shifts = $derived(showAll ? allShifts(text) : []);

  // Highlight the pair for the last letter typed: outer is plain, inner is cipher.
  const lastLetter = $derived.by(() => {
    const m = text.toUpperCase().match(/[A-Z](?=[^A-Z]*$)/);
    return m ? m[0] : null;
  });
  const plainIndex = $derived.by(() => {
    if (!lastLetter) return -1;
    const i = ALPHABET.indexOf(lastLetter);
    return mode === 'encrypt' ? i : mod26(i - shift);
  });

  function polar(r: number, i: number) {
    const a = ((i * STEP - 90) * Math.PI) / 180;
    return { x: 160 + r * Math.cos(a), y: 160 + r * Math.sin(a) };
  }

  function nudge(d: number) {
    pos += d;
  }

  function onKey(e: KeyboardEvent) {
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    if (e.key in map) {
      e.preventDefault();
      nudge(map[e.key]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      pos -= shift;
    }
  }

  let svgEl: SVGSVGElement;
  let dragStartAngle = 0;
  let dragStartPos = 0;

  function angleOf(e: PointerEvent) {
    const r = svgEl.getBoundingClientRect();
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  }

  function onDown(e: PointerEvent) {
    dragging = true;
    dragStartAngle = angleOf(e);
    dragStartPos = pos;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }

  function onMove(e: PointerEvent) {
    if (!dragging) return;
    let d = angleOf(e) - dragStartAngle;
    d = ((d + 540) % 360) - 180;
    // Turning the inner ring clockwise brings earlier letters to the top: the shift goes down.
    const next = dragStartPos - Math.round(d / STEP);
    if (next !== pos) pos = next;
    if (Math.abs(d) > 150) {
      dragStartAngle = angleOf(e);
      dragStartPos = pos;
    }
  }

  function onUp() {
    dragging = false;
  }

  function useShift(s: number) {
    pos += s - shift;
    mode = 'decrypt';
    showAll = false;
  }
</script>

<div class="wheel-tool">
  <div class="dial">
    <svg
      bind:this={svgEl}
      viewBox="0 0 320 320"
      role="slider"
      tabindex="0"
      aria-label={`${label}: shift`}
      aria-valuemin={0}
      aria-valuemax={25}
      aria-valuenow={shift}
      aria-valuetext={`Shift ${shift}: A becomes ${ALPHABET[shift]}`}
      class:dragging
      onkeydown={onKey}
      onpointerdown={onDown}
      onpointermove={onMove}
      onpointerup={onUp}
      onpointercancel={onUp}
    >
      <circle class="outer-disk" cx="160" cy="160" r="156" />
      {#each ALPHABET as letter, i}
        {@const p = polar(134, i)}
        <text class="outer" class:hot={i === plainIndex} x={p.x} y={p.y} transform={`rotate(${i * STEP} ${p.x} ${p.y})`}>{letter}</text>
      {/each}

      <g class="inner-ring" style:transform={`rotate(${-pos * STEP}deg)`}>
        <circle class="inner-disk" cx="160" cy="160" r="112" />
        {#each ALPHABET as letter, j}
          {@const p = polar(93, j)}
          <text class="inner" class:hot={plainIndex >= 0 && j === mod26(plainIndex + shift)} x={p.x} y={p.y} transform={`rotate(${j * STEP} ${p.x} ${p.y})`}>{letter}</text>
        {/each}
        <circle class="grip" cx="160" cy="160" r="70" />
      </g>

      <!-- Pointer at the top: A on the outer ring, its cipher letter on the inner ring -->
      <path class="pointer" d="M152 6 L168 6 L160 16 Z" />
      <text class="shift-num" x="160" y="158">{shift}</text>
      <text class="shift-label" x="160" y="182">shift</text>
    </svg>
    <div class="nudges">
      <button type="button" class="btn quiet" onclick={() => nudge(-1)} aria-label="Shift down by one">−1</button>
      <button type="button" class="btn quiet" onclick={() => nudge(1)} aria-label="Shift up by one">+1</button>
    </div>
    <p class="dial-help meta">Drag the inner ring or use the arrow keys. Outer ring is plaintext, inner ring is ciphertext.</p>
  </div>

  <div class="work">
    <fieldset class="modes">
      <legend class="sr-only">Direction</legend>
      <label><input type="radio" name={`mode-${uid}`} value="encrypt" bind:group={mode} /> Encrypt</label>
      <label><input type="radio" name={`mode-${uid}`} value="decrypt" bind:group={mode} /> Decrypt</label>
    </fieldset>

    <label class="field">
      <span>{mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}</span>
      <textarea bind:value={text} rows="3" spellcheck="false" placeholder={mode === 'encrypt' ? 'Type a message' : 'Paste ciphertext'}></textarea>
    </label>

    <div class="field">
      <span>{mode === 'encrypt' ? 'Ciphertext' : 'Plaintext'}</span>
      <output class:ciphertext={mode === 'encrypt'} class="out" aria-live="polite">{output || ' '}</output>
    </div>

    {#if bruteForce}
      <label class="toggle">
        <input type="checkbox" bind:checked={showAll} disabled={!text.trim()} />
        Try all 25 shifts
      </label>
      {#if showAll}
        <ol class="all">
          {#each shifts as s (s.shift)}
            <li>
              <button type="button" onclick={() => useShift(s.shift)} aria-label={`Use shift ${s.shift}`}>
                <span class="n">{s.shift}</span>
                <span class="t">{s.text}</span>
              </button>
            </li>
          {/each}
        </ol>
      {/if}
    {/if}
  </div>
</div>

<style>
  .wheel-tool {
    display: grid;
    gap: 1.5rem;
    padding: 1.25rem;
    background: var(--paper-raised);
    border: 1px solid var(--rule);
    border-radius: 6px;
  }
  @media (min-width: 44rem) {
    .wheel-tool {
      grid-template-columns: minmax(14rem, 18rem) 1fr;
      align-items: start;
    }
  }

  .dial {
    display: grid;
    justify-items: center;
    gap: 0.75rem;
  }

  svg {
    width: 100%;
    max-width: 18rem;
    touch-action: none;
    cursor: grab;
    user-select: none;
    border-radius: 50%;
  }
  svg.dragging {
    cursor: grabbing;
  }

  .outer-disk {
    fill: var(--paper);
    stroke: var(--ink);
    stroke-width: 2;
  }
  .inner-disk {
    fill: var(--violet-faint);
    stroke: var(--violet);
    stroke-width: 2;
  }
  .grip {
    fill: var(--paper-raised);
    stroke: var(--violet);
    stroke-width: 1;
    stroke-dasharray: 2 4;
  }

  .inner-ring {
    transform-origin: 160px 160px;
    transition: transform 180ms cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  .dragging .inner-ring {
    transition-duration: 60ms;
  }

  text {
    font-family: var(--mono);
    text-anchor: middle;
    dominant-baseline: central;
  }
  .outer {
    font-size: 15px;
    font-weight: 600;
    fill: var(--ink);
  }
  .inner {
    font-size: 14px;
    font-weight: 500;
    fill: var(--violet);
  }
  .hot {
    fill: var(--pencil);
    font-weight: 800;
  }
  .pointer {
    fill: var(--pencil);
  }
  .shift-num {
    font-size: 40px;
    font-weight: 700;
    fill: var(--ink);
  }
  .shift-label {
    font-family: var(--serif);
    font-size: 13px;
    fill: var(--ink-soft);
  }

  .nudges {
    display: flex;
    gap: 0.5rem;
  }
  .nudges .btn {
    font-family: var(--mono);
    min-width: 3.25rem;
    justify-content: center;
  }
  .dial-help {
    text-align: center;
    max-width: 18rem;
  }

  .work {
    display: grid;
    gap: 1rem;
    min-width: 0;
  }

  .modes {
    display: flex;
    gap: 1.25rem;
    border: 0;
    margin: 0;
    padding: 0;
  }
  .modes label,
  .toggle {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    cursor: pointer;
  }
  input[type='radio'],
  input[type='checkbox'] {
    accent-color: var(--violet);
    width: 1.05rem;
    height: 1.05rem;
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
    font-size: 0.95rem;
    line-height: 1.6;
    padding: 0.6rem 0.7rem;
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 3px;
    resize: vertical;
  }
  textarea:focus-visible {
    outline: 2px solid var(--violet);
    outline-offset: 0;
  }
  .out {
    display: block;
    min-height: 3.2rem;
    font-family: var(--mono);
    font-size: 0.95rem;
    line-height: 1.6;
    letter-spacing: 0.03em;
    padding: 0.6rem 0.7rem;
    border-left: 3px solid var(--rule);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .out.ciphertext {
    font-size: 0.95rem;
    line-height: 1.6;
  }

  .all {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 22rem;
    overflow-y: auto;
    border: 1px solid var(--rule);
    border-radius: 3px;
  }
  .all li + li {
    border-top: 1px solid var(--rule);
  }
  .all button {
    display: grid;
    grid-template-columns: 2.25rem 1fr;
    width: 100%;
    text-align: left;
    padding: 0.35rem 0.6rem;
    border: 0;
    background: transparent;
    cursor: pointer;
    font-family: var(--mono);
    font-size: 0.82rem;
  }
  .all button:hover,
  .all button:focus-visible {
    background: var(--violet-faint);
  }
  .all .n {
    color: var(--ink-soft);
  }
  .all .t {
    overflow-wrap: anywhere;
  }
</style>
