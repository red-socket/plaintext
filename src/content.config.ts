import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { GUIDE_GROUPS, TOOLS, TRACKS, type GuideGroup } from './lib/catalog';
import { normalizeAnswer } from './lib/normalize';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extract } from './lib/hidden';
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
  z.object({ type: z.literal('atbash') }),
  z.object({ type: z.literal('substitution'), key: z.string().regex(/^[A-Z]{26}$/, 'Key must be all 26 letters') }),
  z.object({ type: z.literal('keyword'), keyword: z.string() }),
  z.object({ type: z.literal('polybius'), keyword: z.string().optional(), tap: z.boolean().optional() }),
  z.object({ type: z.literal('vigenere'), key: z.string() }),
  z.object({ type: z.literal('railfence'), rails: z.number().int().min(2) }),
  z.object({ type: z.literal('columnar'), key: z.string() }),
  z.object({ type: z.literal('bacon'), variant: z.union([z.literal(24), z.literal(26)]).optional() }),
  z.object({ type: z.literal('bacon-case'), cover: z.string(), variant: z.union([z.literal(24), z.literal(26)]).optional() }),
  z.object({ type: z.literal('book'), source: z.string(), mode: z.enum(['line-word', 'word-letter']) }),
  z.object({ type: z.literal('upper') }),
  z.object({ type: z.literal('zero-width'), cover: z.string() }),
  z.object({ type: z.literal('reverse') }),
  z.object({ type: z.literal('map'), map: z.record(z.string(), z.string()) }),
]);

/** How the ciphertext was made, so the build can check the puzzle is solvable. */
const cipher = z.object({ plaintext: z.string(), steps: z.array(step).min(1) });

const cases = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/cases' }),
  schema: z.object({
    title: z.string(),
    number: z.number().int().positive(),
    summary: z.string(),
    /** Who it's for, e.g. "Best after Tracks 1 and 2". */
    after: z.string(),
  }),
});

const puzzles = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/puzzles' }),
  schema: z
    .object({
      title: z.string(),
      /** A puzzle belongs to a lesson or to a case, never both. */
      lesson: reference('lessons').optional(),
      case: reference('cases').optional(),
      order: z.number().int(),
      difficulty: z.number().int().min(1).max(5),
      ciphertext: z.string().optional(),
      display: z.enum(['text', 'morse-audio', 'pigpen']).default('text'),
      /** A page of text shown with the puzzle, e.g. the source for a book cipher. Line breaks are kept. */
      page: z.string().optional(),
      /** Files shown with the puzzle (images and sounds get a preview), relative to public/. */
      files: z.array(z.object({ path: z.string(), label: z.string() })).default([]),
      /** For hidden-in-text puzzles: reading `from` this way must give `expect`. Checked at build time. */
      extract: z
        .object({
          from: z.enum(['page', 'ciphertext']),
          method: z.enum(['line-first', 'line-last', 'word-first', 'word-last', 'word-nth', 'every-nth', 'capitals']),
          n: z.number().int().positive().optional(),
          offset: z.number().int().positive().optional(),
          expect: z.string(),
        })
        .optional(),
      cipher: cipher.optional(),
      answers: z.array(answer).min(1),
      partials: z.array(z.object({ answer, reply: z.string() })).default([]),
      hints: z.array(z.string()).min(1),
      writeup: z.string(),
    })
    .superRefine((p, ctx) => {
      if (!p.lesson === !p.case) {
        ctx.addIssue({ code: 'custom', path: ['lesson'], message: 'Give either `lesson` or `case`' });
      }
      if (p.cipher && p.ciphertext === undefined) {
        ctx.addIssue({ code: 'custom', path: ['ciphertext'], message: 'A puzzle with `cipher` needs `ciphertext`' });
      }
      if (p.cipher && p.ciphertext !== undefined) {
        let made: string;
        try {
          made = applySteps(p.cipher.plaintext, p.cipher.steps);
        } catch (e) {
          ctx.addIssue({ code: 'custom', path: ['cipher'], message: (e as Error).message });
          return;
        }
        if (made !== p.ciphertext) {
          ctx.addIssue({ code: 'custom', path: ['ciphertext'], message: `Does not match cipher; expected "${made}"` });
        }
      }
      if (p.extract) {
        const src = p.extract.from === 'page' ? p.page : p.ciphertext;
        const got = src ? extract(src, p.extract.method, p.extract.n, p.extract.offset) : '';
        if (normalizeAnswer(got) !== normalizeAnswer(p.extract.expect)) {
          ctx.addIssue({ code: 'custom', path: ['extract'], message: `Reading the ${p.extract.from} gives "${got}", not "${p.extract.expect}"` });
        }
      }
      for (const f of p.files) {
        // Relative to this file, not the working directory, which differs between dev and build.
        if (!existsSync(fileURLToPath(new URL(`../public/${f.path}`, import.meta.url)))) ctx.addIssue({ code: 'custom', path: ['files'], message: `No file at public/${f.path}` });
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

export const collections = { lessons, cases, puzzles, fieldGuide };
