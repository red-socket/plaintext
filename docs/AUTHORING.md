# Writing lessons and puzzles

Everything a player reads lives in `src/content/`. You don't need to touch code to add a puzzle. Start from the templates in [`docs/templates/`](templates/).

Run `npm run verify` before you open a pull request. It checks types, runs the tests, builds the site (which validates every content file and checks every cipher puzzle is solvable) and makes sure no answer reached the built pages.

## The voice

- Plain and dry. Write for a smart adult who has never seen a cipher.
- Short sentences. One idea per paragraph.
- Name things by what the player sees: "the inner ring", not "the cipher alphabet array".
- No exclamation marks, no "Great job!", no "Let's dive in". A correct answer is its own reward.
- Stories can be dark (it's an adults-only site) but keep them short. The puzzle is the point, not the plot.

## Puzzles

One file per puzzle: `src/content/puzzles/<id>.mdx`. The file name is the puzzle's id.

> **Never rename a published puzzle file.** Saved progress and sealed answers are keyed by the id. Renaming it wipes everyone's progress on that puzzle.

### Fields

| Field | Required | What it is |
| --- | --- | --- |
| `title` | yes | Short and concrete: "Postcard from Gaul", not "Caesar Challenge 1". |
| `lesson` | yes | The lesson id this puzzle practises. |
| `order` | yes | Position in the lesson's puzzle list. |
| `difficulty` | yes | 1–5. See below. |
| `ciphertext` | no | Shown in a large violet block with a copy button. Leave it out if the puzzle is an image, a sound or prose. |
| `cipher` | no | How the ciphertext was made, e.g. `{ type: caesar, shift: 3, plaintext: "…" }`. If present, the build fails unless it reproduces `ciphertext` exactly. Always include it for cipher puzzles. |
| `answers` | yes | Every answer you'll accept. Case, spaces, punctuation and accents are ignored, so `Lighthouse keeper!` and `LIGHTHOUSEKEEPER` are the same. Add real alternatives (`THE LIGHTHOUSE KEEPER`), not typos. |
| `partials` | no | Wrong turns you can predict, each with a reply. See below. |
| `hints` | yes | In order, from a nudge to nearly the whole method. Three is the norm. |
| `writeup` | yes | Shown after solving. Blank lines make paragraphs, backticks make `code`. Nothing else is formatted. |

The body of the file (after the frontmatter) is the prompt: the scene and the question. Markdown works there.

### Difficulty

| | Means |
| --- | --- |
| 1 | The method is named or obvious, the key is given. |
| 2 | One step to work out: the key or the method, not both. |
| 3 | The key is hidden in the puzzle and needs outside knowledge (a date, a name). |
| 4 | Two techniques chained, or one technique with no help at all. |
| 5 | Several steps, and nothing says which technique comes next. |

### Partial answers

A partial answer is a guess you expect, that isn't the answer, with a reply that moves the player on. They're what makes a puzzle feel like someone is on the other side.

Good candidates:

- **The key or method** instead of the answer: `15` → "That's the key. Now use it."
- **The whole decoded message** when the answer is one word in it → "Decoded. The answer is the password."
- **The obvious wrong guess** the theme invites: `BRUTUS` → "Everyone guesses that. Decode the letter."
- **A half-step**: `IDES` → "Right idea. Which day of the month were the Ides of March?"

Replies say what to do next. They never say "wrong", and never give the answer. A partial answer can't also be an accepted answer; the build checks this.

### Hints

- **Hint 1** points at the right idea without naming it: "J.C. is a famous Roman."
- **Hint 2** names it: "III is a Roman numeral, and it tells you the shift."
- **Hint 3** is nearly the method: "Shift every letter back by 3: D becomes A."

Hints are in the page source (only answers and writeups are sealed), so never put the answer in a hint.

### Writeups

The writeup explains the intended path in two to four short paragraphs:

1. What the clue was and how you were meant to read it.
2. The decoding step, with a short example in backticks.
3. One sentence of transferable lesson: what to look for next time.

### Before you submit

- Someone else solved it without help, or with hints only.
- Every hint helps a little more than the last.
- You've added partials for the two or three most likely wrong turns.
- The ciphertext has no typos. (`cipher` catches this for supported ciphers.)

## Lessons

One file per lesson: `src/content/lessons/<id>.mdx`. Lessons are short steps, each with something to do.

- `title`, `track` (a track id from `src/lib/catalog.ts`), `order`, `summary` (one sentence), `minutes`, and optionally `tool` (the tool id it unlocks).
- Wrap each step in `<Step n={1} title="…">`. Aim for four to six steps.
- Put a `<QuickCheck>` in most steps. Finishing every quick check completes the lesson and unlocks its tool, so every lesson needs at least one.
- Embed the lesson's tool where it helps, e.g. `<CipherWheel client:visible shift={3} />`.
- End with a step on **how to spot it**: the signs that tell a solver to try this technique. Then add or update the matching entry in the Field Guide.

### Quick checks

```mdx
<QuickCheck id="caesar-encode-cat" answer="FDW" note="C moves to F, A to D, T to W.">
  Encrypt the word CAT with a shift of 3.
</QuickCheck>
```

- `id` must be unique across the whole site and, like puzzle ids, never change once published.
- `answer` takes a string or a list (`answer={["16", "SIXTEEN"]}`).
- `note` is shown after a correct answer. It's sealed like a writeup, so it can explain the answer.

## Field Guide entries

`src/content/field-guide.yaml` lists how to recognise each cipher or encoding. Entries are grouped by what the solver sees (`letters`, `letters-odd`, `digits`, `two-symbols`, `mixed`, `pictures`), because that's where a solver starts.

- `example` must be real output of the method. Generate it with code, never type it by hand.
- `tells` are observable: things you can see or count, not things you'd know after solving.
- `try` is the cheapest first move.
- Point `lesson` at the lesson once it exists. Until then, set `track`.

## Tools

A tool is built only when a lesson needs it. Logic goes in `src/lib/` as plain tested TypeScript; the component in `src/components/tools/` only calls it. Register the tool in `TOOLS` in `src/lib/catalog.ts` with the lesson that unlocks it.
