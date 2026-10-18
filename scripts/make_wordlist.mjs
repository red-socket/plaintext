/**
 * Builds public/files/words.txt, the list the pattern search tool and regex puzzles use:
 * SCOWL levels 10, 20 and 35 (common English words), lowercase letters only, sorted.
 * Run: node scripts/make_wordlist.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const words = new Set();
for (const level of [10, 20, 35]) {
  for (const w of require(`wordlist-english/english-words-${level}.json`)) if (/^[a-z]+$/.test(w)) words.add(w);
}
const sorted = [...words].sort();
writeFileSync(new URL('../public/files/words.txt', import.meta.url), sorted.join('\n') + '\n');
// SCOWL's licence asks for its notice to travel with the list.
copyFileSync(require.resolve('wordlist-english/Copyright'), new URL('../public/files/words-COPYRIGHT.txt', import.meta.url));
console.log(`${sorted.length} words`);
