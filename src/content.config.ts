import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { caesarEncrypt } from './lib/caesar';
import { TOOLS, TRACKS } from './lib/catalog';
import { normalizeAnswer } from './lib/normalize';

const answer = z.string().refine((a) => normalizeAnswer(a) !== '', 'Answer has no letters or digits');

const lessons = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    track: z.enum(TRACKS.map((t) => t.id) as [string, ...string[]]),
    order: z.number().int(),
    summary: z.string(),
    minutes: z.number().int().positive(),
    tool: z.enum(TOOLS.map((t) => t.id) as [string, ...string[]]).optional(),
  }),
});

/** How the ciphertext was made, so the build can check the puzzle is solvable. */
const cipher = z.discriminatedUnion('type', [
  z.object({ type: z.literal('caesar'), shift: z.number().int(), plaintext: z.string() }),
]);

const puzzles = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/puzzles' }),
  schema: z
    .object({
      title: z.string(),
      lesson: reference('lessons'),
      order: z.number().int(),
      difficulty: z.number().int().min(1).max(5),
      ciphertext: z.string().optional(),
      cipher: cipher.optional(),
      answers: z.array(answer).min(1),
      partials: z.array(z.object({ answer, reply: z.string() })).default([]),
      hints: z.array(z.string()).min(1),
      writeup: z.string(),
    })
    .superRefine((p, ctx) => {
      if (p.cipher && p.ciphertext !== undefined) {
        const made = caesarEncrypt(p.cipher.plaintext, p.cipher.shift);
        if (made !== p.ciphertext) {
          ctx.addIssue({ code: 'custom', path: ['ciphertext'], message: `Does not match cipher; expected "${made}"` });
        }
      }
      const solves = new Set(p.answers.map(normalizeAnswer));
      for (const partial of p.partials) {
        if (solves.has(normalizeAnswer(partial.answer))) {
          ctx.addIssue({ code: 'custom', path: ['partials'], message: `"${partial.answer}" is also an accepted answer` });
        }
      }
    }),
});

export const collections = { lessons, puzzles };
