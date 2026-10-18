<script lang="ts">
  import { ALPHABET } from '../../lib/caesar';
  import { pigpenDrawing, pigpenGlyph } from '../../lib/classical';

  let typed = $state('');
  let text = $state('');

  const glyphs = [...ALPHABET].map((l) => ({ l, ...pigpenDrawing(pigpenGlyph(l)!) }));
  const drawn = $derived(
    text
      .toUpperCase()
      .split(/[^A-Z]+/)
      .filter(Boolean)
      .map((w) => [...w].map((l) => ({ l, ...pigpenDrawing(pigpenGlyph(l)!) }))),
  );

  // The key: two # grids and two X's, as they're usually drawn.
  const GRID_A = 'ABCDEFGHI';
  const GRID_B = 'JKLMNOPQR';
</script>

<div class="tool-panel">
  <div class="key" aria-label="The pigpen key">
    {#each [GRID_A, GRID_B] as g, gi}
      <svg viewBox="0 0 90 90" class="keygrid" role="img" aria-label={`Grid ${gi + 1}: ${g.split('').join(' ')}${gi ? ', with dots' : ''}`}>
        <path d="M30 0V90M60 0V90M0 30H90M0 60H90" />
        {#each [...g] as l, i}
          <text x={(i % 3) * 30 + 15} y={Math.floor(i / 3) * 30 + 17}>{l}</text>
          {#if gi}<circle cx={(i % 3) * 30 + 15} cy={Math.floor(i / 3) * 30 + 26} r="2" />{/if}
        {/each}
      </svg>
    {/each}
    {#each ['STUV', 'WXYZ'] as x, xi}
      <svg viewBox="0 0 90 90" class="keygrid" role="img" aria-label={`X ${xi + 1}: ${x.split('').join(' ')} at top, left, right, bottom${xi ? ', with dots' : ''}`}>
        <path d="M5 5L85 85M85 5L5 85" />
        {#each [[45, 22], [20, 48], [70, 48], [45, 76]] as [cx, cy], i}
          <text x={cx} y={cy}>{x[i]}</text>
          {#if xi}<circle cx={cx} cy={cy + 9} r="2" />{/if}
        {/each}
      </svg>
    {/each}
  </div>
  <p class="meta">Each letter is drawn as the lines around its cell. Letters from the second grid and second X also get a dot.</p>

  <div class="tool-field">
    <span>Click symbols to spell out a message</span>
    <div class="board">
      {#each glyphs as g}
        <button type="button" onclick={() => (typed += g.l)} aria-label={`Symbol for ${g.l}`}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d={g.d} />{#if g.dot}<circle cx={g.dot[0]} cy={g.dot[1]} r="1.8" />{/if}</svg>
        </button>
      {/each}
    </div>
    <div class="typed">
      <output class="out">{typed || ' '}</output>
      <button type="button" class="btn quiet" onclick={() => (typed += ' ')}>Space</button>
      <button type="button" class="btn quiet" onclick={() => (typed = typed.slice(0, -1))}>Undo</button>
      <button type="button" class="btn quiet" onclick={() => (typed = '')}>Clear</button>
    </div>
  </div>

  <label class="tool-field">
    <span>Draw text as pigpen</span>
    <input type="text" bind:value={text} autocomplete="off" placeholder="Type a message" />
  </label>
  {#if drawn.length}
    <div class="drawn">
      {#each drawn as w}
        <span class="word">{#each w as g}<svg viewBox="0 0 20 20" aria-hidden="true"><path d={g.d} />{#if g.dot}<circle cx={g.dot[0]} cy={g.dot[1]} r="1.8" />{/if}</svg>{/each}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }
  .keygrid {
    width: 6.5rem;
    height: 6.5rem;
  }
  .keygrid path {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
  }
  .keygrid text {
    font-family: var(--mono);
    font-size: 13px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: middle;
    fill: var(--teal);
  }
  .keygrid circle {
    fill: var(--ink);
  }
  .board {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(2.6rem, 1fr));
    gap: 0.35rem;
  }
  .board button {
    padding: 0.3rem;
    border: 1px solid var(--rule);
    background: var(--paper);
    cursor: pointer;
  }
  .board button:hover {
    border-color: var(--ink);
    background: var(--tint);
  }
  .board svg,
  .drawn svg {
    width: 100%;
    max-width: 1.8rem;
    display: block;
    margin: auto;
  }
  .board path,
  .drawn path {
    fill: none;
    stroke: var(--teal);
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .board circle,
  .drawn circle {
    fill: var(--teal);
  }
  /* The board is the key you were given, in ink; what you spell out below is your working, in teal. */
  .board path {
    stroke: var(--ink);
  }
  .board circle {
    fill: var(--ink);
  }
  .typed {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.5rem;
  }
  .out {
    flex: 1 1 12rem;
    font-family: var(--mono);
    font-size: 1rem;
    letter-spacing: 0.05em;
    padding: 0.45rem 0.7rem;
    border-left: 3px solid var(--rule);
    min-height: 2.4rem;
    overflow-wrap: anywhere;
  }
  .drawn {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.4rem;
  }
  .drawn .word {
    display: inline-flex;
    gap: 0.3rem;
  }
  .drawn svg {
    width: 1.8rem;
  }
</style>
