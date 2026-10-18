# Writing lessons and puzzles

Everything a player reads lives in `src/content/`. You don't need to touch code to add a puzzle. Start from the templates in [`docs/templates/`](templates/).

Run `npm run verify` before you open a pull request. It checks types, runs the tests and builds the site, which validates every content file and checks every cipher puzzle is solvable.

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
| `lesson` or `case` | one of them | The lesson this puzzle practises, or the case it's a file in. Never both. |
| `order` | yes | Position in the lesson's puzzle list. |
| `difficulty` | yes | 1–5. See below. |
| `ciphertext` | no | Shown in a boxed exhibit with a copy button; short all-capital letter ciphers get a worksheet with a box per letter. Leave it out if the puzzle is an image, a sound or prose. |
| `cipher` | no | How the ciphertext was made: `{ plaintext: "…", steps: [...] }`. The build applies the steps in order and fails unless the result is exactly `ciphertext`. Always include it when the puzzle has a ciphertext. See [Cipher steps](#cipher-steps). |
| `display` | no | `text` (default) shows the ciphertext. `morse-audio` hides it and gives a play button that sends it as sound. `pigpen` draws it as pigpen symbols. |
| `page` | no | A page of text shown with the puzzle, line breaks kept. The source for book ciphers; also passed to the book cipher helper and the text reader. |
| `files` | no | Files shown with the puzzle: `[{ path: files/<puzzle-id>/name.png, label: "…" }]`, relative to `public/`. Images and sounds get a preview and a download link; the first file is offered to the tools that open files. The build fails if a file is missing. |
| `extract` | no | For text hidden in text: `{ from: page, method: line-first, expect: BEACON }`. The build reads the `page` or `ciphertext` that way and fails unless it gives `expect`. Methods: `line-first`, `line-last`, `word-first`, `word-last`, `word-nth` (with `n`), `every-nth` (with `n` and optional `offset`), `capitals`. |
| `answers` | yes | Every answer you'll accept. Case, spaces, punctuation and accents are ignored, so `Lighthouse keeper!` and `LIGHTHOUSEKEEPER` are the same. Add real alternatives (`THE LIGHTHOUSE KEEPER`), not typos. |
| `partials` | no | Wrong turns you can predict, each with a reply. See below. |
| `hints` | yes | In order, from a nudge to nearly the whole method. Three is the norm. |
| `writeup` | yes | Shown after solving. Blank lines make paragraphs, backticks make `code`. Nothing else is formatted. |

The body of the file (after the frontmatter) is the prompt: the scene and the question. Markdown works there.

### Cipher steps

Each step is applied to the output of the one before. Available steps (from `src/lib/steps.ts`):

| Step | Output |
| --- | --- |
| `{ type: caesar, shift: 3 }` | Letters shifted forward by 3. |
| `{ type: a1z26 }` | `8-5-12-12-15 23-15-18-12-4`. Add `start: 0` for A0Z25. |
| `{ type: keypad }` | `44 33 555 555 666`, with `0` between words. |
| `{ type: morse }` | `.... . .-.. .-.. ---`, with ` / ` between words. |
| `{ type: binary }` | 8-bit groups: `01001000 01101001`. |
| `{ type: ascii }` | Decimal codes: `72 101 108 108 111`. |
| `{ type: hex }` | Uppercase byte pairs: `48 65 6C 6C 6F`. |
| `{ type: base64 }`, `{ type: base32 }` | Standard, with `=` padding. |
| `{ type: atbash }` | The alphabet reversed. |
| `{ type: substitution, key: QWERTY… }` | A full 26-letter cipher alphabet. |
| `{ type: keyword, keyword: ZEBRAS }` | Substitution with a keyword alphabet. |
| `{ type: polybius }` | `23 15 31 31 34`. Add `keyword:` for a keyed square, `tap: true` for tap code. |
| `{ type: vigenere, key: LEMON }` | Vigenère; only letters use up the key. |
| `{ type: railfence, rails: 3 }`, `{ type: columnar, key: ZEBRAS }` | Letters only, uppercase, no spaces. |
| `{ type: bacon }` | `AABBB AABAA …`. Add `variant: 24` for Bacon's original alphabet. |
| `{ type: bacon-case, cover: "…" }` | Hides the message in the capitals of a cover text, which needs exactly five letters per hidden letter. |
| `{ type: book, mode: line-word, source: *page }` | References to the first appearance of each word (or letter, with `word-letter`). Use a YAML anchor so `source` is the puzzle's `page`. |
| `{ type: upper }` | Uppercase. Useful with `display: pigpen`. |
| `{ type: zero-width, cover: "…" }` | Hides the text as invisible zero-width characters after the cover's first letter. |
| `{ type: mojibake }` | UTF-8 misread as Windows-1252: café becomes `cafÃ©`. Use twice for doubly garbled text. |
| `{ type: codepoints }` | Each character as `U+0041`. |
| `{ type: md5 }`, `{ type: sha256 }` | The hash of the text, in lowercase hex. |
| `{ type: xor, key: MOON }` or `{ type: xor, keyHex: "2A" }` | XOR with a repeating text or hex key; output is spaced hex. |
| `{ type: enigma, rotors: [I, II, III], reflector: B, rings: AAA, positions: AAA, plugs: "AB CD" }` | Enigma I, letters only, in groups of five (`group: 0` for none). |
| `{ type: rsa, n: 3233, e: 17 }` | Each letter's A1Z26 number raised to e mod n; words separated by ` / `. |
| `{ type: reverse }` | The whole string backwards. |
| `{ type: map, map: { "0": "□", "1": "■" } }` | Replaces single characters; anything else passes through. |

A layered puzzle is just several steps: `steps: [{ type: caesar, shift: 13 }, { type: hex }, { type: base64 }]`.

To get the ciphertext, write the `cipher` with `ciphertext: ""`, run `npm run build`, and copy the expected value from the error message.

### Hidden in the page

Two components put things in the page itself. Import them at the top of the puzzle's body:

```mdx
import SourceComment from '../../components/SourceComment.astro';
import InvisibleInk from '../../components/InvisibleInk.astro';

<SourceComment text="The answer is LANTERN" />  {/* an HTML comment, visible only in the source */}
<InvisibleInk>The answer is CHALK.</InvisibleInk>  {/* text in the background colour */}
```

### Images and sounds

Puzzle files are generated, never drawn by hand, so they can be rebuilt and checked. `scripts/make_assets.py` (Python with numpy, Pillow and segno) writes every image and sound to `public/files/`, and `tests/assets.test.ts` decodes each one with the same code the browser tools use. To add one:

1. Add a function to `scripts/make_assets.py` and run `python3 scripts/make_assets.py`.
2. Add a test to `tests/assets.test.ts` proving the file decodes to what the puzzle needs.
3. List the file under the puzzle's `files`.

Keep files small: PNG for anything with hidden pixels (JPEG destroys low bits), mono WAV at the lowest sample rate that works.

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

Never put the answer in a hint: hints are for getting unstuck, not for skipping.

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

## Cases

A case is a short story told through several puzzles, the *files*, in mixed techniques with nothing to say which. The last file is usually a *meta*: a puzzle built from the answers to the others.

- One file per case: `src/content/cases/<id>.mdx` with `title`, `number`, `summary` and `after` (who it's for, e.g. "Best after Tracks 1 and 2"). The body is the story.
- Each file is an ordinary puzzle with `case: <id>` instead of `lesson`. `order` sets the file order.
- Only use techniques that some lesson teaches. The challenge is spotting which one, not meeting something new.
- Hints for a file should start by pointing at what to notice, before naming a technique.
- A meta needs no ciphertext. Its prompt says how to combine the answers, indirectly; its writeup ends the story.

## Lessons

One file per lesson: `src/content/lessons/<id>.mdx`. Lessons are short steps, each with something to do.

- `title`, `track` (a track id from `src/lib/catalog.ts`), `order`, `summary` (one sentence), `minutes`, and optionally `tool` (the tool id it unlocks).
- Wrap each step in `<Step n={1} title="…">`. Aim for four to six steps.
- Put a `<QuickCheck>` in most steps. Finishing every quick check completes the lesson and unlocks its tool, so every lesson needs at least one.
- Embed the lesson's tool where it helps, e.g. `<CipherWheel client:visible shift={3} />`.
- End with a step on **how to spot it**: the signs that tell a solver to try this technique. Then add or update the matching entry in the Field Guide.
- Link to other pages and files from the site root, as Markdown links: `[field guide](/field-guide#letters)`. The site is served under `/plaintext` on GitHub Pages and the build adds that prefix to Markdown links. A tool's `file` prop (`file="/files/lessons/qr.png"`) is handled by the tool. A raw `<a href="/…">` in MDX is not, so use Markdown links.

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
