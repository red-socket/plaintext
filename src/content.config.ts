import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { GUIDE_GROUPS, TOOLS, TRACKS, type GuideGroup } from './lib/catalog';
import { normalizeAnswer } from './lib/normalize';
import { applySteps } from './lib/steps';

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

/** One step in making a ciphertext. See src/lib/steps.ts. */
const step = z.discriminatedUnion('type', [
  z.object({ type: z.literal('caesar'), shift: z.number().int() }),
  z.object({ type: z.literal('a1z26'), start: z.number().int().optional() }),
  z.object({ type: z.literal('keypad') }),
  z.object({ type: z.literal('morse') }),
  z.object({ type: z.literal('binary') }),
  z.object({ type: z.literal('ascii') }),
  z.object({ type: z.literal('hex') }),
  z.object({ type: z.literal('base64') }),
  z.object({ type: z.literal('base32') }),
  z.object({ type: z.literal('reverse') }),
  z.object({ type: z.literal('map'), map: z.record(z.string(), z.string()) }),
]);

/** How the ciphertext was made, so the build can check the puzzle is solvable. */
const cipher = z.object({ plaintext: z.string(), steps: z.array(step).min(1) });

const puzzles = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/puzzles' }),
  schema: z
    .object({
      title: z.string(),
      lesson: reference('lessons'),
      order: z.number().int(),
      difficulty: z.number().int().min(1).max(5),
      ciphertext: z.string().optional(),
      display: z.enum(['text', 'morse-audio']).default('text'),
      cipher: cipher.optional(),
      answers: z.array(answer).min(1),
      partials: z.array(z.object({ answer, reply: z.string() })).default([]),
      hints: z.array(z.string()).min(1),
      writeup: z.string(),
    })
    .superRefine((p, ctx) => {
      if (p.cipher && p.ciphertext === undefined) {
        ctx.addIssue({ code: 'custom', path: ['ciphertext'], message: 'A puzzle with `cipher` needs `ciphertext`' });
      }
      if (p.cipher && p.ciphertext !== undefined) {
        const made = applySteps(p.cipher.plaintext, p.cipher.steps);
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

const fieldGuide = defineCollection({
  loader: file('./src/content/field-guide.yaml'),
  schema: z
    .object({
      name: z.string(),
      group: z.enum(Object.keys(GUIDE_GROUPS) as [GuideGroup, ...GuideGroup[]]),
      example: z.string(),
      tells: z.array(z.string()).min(1),
      try: z.string(),
      /** The lesson that teaches it, once written. Otherwise the track it will belong to. */
      lesson: reference('lessons').optional(),
      track: z.enum(TRACKS.map((t) => t.id) as [string, ...string[]]).optional(),
    })
    .refine((e) => e.lesson || e.track, 'Give a lesson or a track'),
});

export const collections = { lessons, puzzles, fieldGuide };
