/** Tracks and tools: the fixed structure that content files point into. */

export type Track = { id: string; number: number; title: string; blurb: string };

export const TRACKS: Track[] = [
  { id: 'looking', number: 0, title: 'How to look at a puzzle', blurb: 'Encodings, ciphers and hashes: what each one is, and how to tell them apart.' },
  { id: 'encodings', number: 1, title: 'Encodings', blurb: 'Morse, binary, hex, Base64 and the other ways to write letters without letters.' },
  { id: 'classical', number: 2, title: 'Classical ciphers', blurb: 'Caesar to Vigenère: hiding a message by shuffling its letters, and breaking it again.' },
  { id: 'hidden', number: 3, title: 'Hidden in plain sight', blurb: 'Acrostics, page source, metadata, image bits and sounds that are pictures.' },
  { id: 'computers', number: 4, title: 'How computers store things', blurb: 'Bits, bytes, UTF-8, file signatures and hashes.' },
  { id: 'modern', number: 5, title: 'Modern ideas, playable', blurb: 'XOR, one-time pads, Enigma and RSA with numbers small enough to do by hand.' },
];

export type Tool = { id: string; name: string; description: string; lesson: string };

export const TOOLS: Tool[] = [
  {
    id: 'caesar-wheel',
    name: 'Caesar wheel',
    description: 'Turn the inner ring to any shift, encrypt or decrypt text, and try all 25 shifts at once.',
    lesson: 'caesar',
  },
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

/** Field Guide sections, named by what the solver sees. Order is display order. */
export const GUIDE_GROUPS = {
  letters: 'Only letters, normal-looking words',
  'letters-odd': 'Only letters, but no words',
  digits: 'Numbers',
  'two-symbols': 'Two symbols only',
  mixed: 'Letters, digits and symbols',
  pictures: 'Shapes and pictures',
} as const;

export type GuideGroup = keyof typeof GUIDE_GROUPS;

/** Generated practice pages, by lesson. */
export const PRACTICE: Record<string, { href: string; title: string }> = {
  caesar: { href: '/practice/caesar', title: 'Caesar practice' },
};
