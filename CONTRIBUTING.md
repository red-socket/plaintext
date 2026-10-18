# Contributing

Puzzles, lessons, Field Guide entries, fixes and playtest notes are all welcome.

## Playtesting

The most useful thing you can do without writing anything: solve a lesson's puzzles and open an issue saying where you got stuck, which hints you needed, and what you guessed that didn't get a reply. Wrong guesses are how puzzles get better partial answers.

## Adding a puzzle or lesson

1. Read [docs/AUTHORING.md](docs/AUTHORING.md). It covers the fields, hints, partial answers and voice.
2. Copy a template from [docs/templates/](docs/templates/).
3. Have someone else solve it before you submit.
4. Run `npm run verify` and open a pull request.

Puzzles are reviewed for fairness first: can a player who has done the lesson get there with the hints? Tone and length come second.

## Working on the code

```bash
npm install
npm run dev       # http://localhost:4321
npm run verify    # types, tests and build: the same as CI
```

- Cipher and encoding logic goes in `src/lib/` with tests in `tests/`. Components only call it.
- Everything runs in the browser. Lessons and puzzles must work without a server.
- Colours and type sizes are tokens in `src/styles/global.css`. Use them rather than new values.

## Licence

By contributing you agree that your code is licensed under [AGPL-3.0-or-later](LICENSE) and your content (anything in `src/content/`) under [CC BY-SA 4.0](src/content/LICENSE).

## Spoilers

Puzzle answers are in this repository. If you're here to play, don't read `src/content/puzzles/`.
