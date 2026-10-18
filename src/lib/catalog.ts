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
    id: 'letter-numbers',
    name: 'Letter numbers',
    description: 'Letters to numbers and back: A1Z26, A0Z25 and the phone keypad.',
    lesson: 'letters-as-numbers',
  },
  {
    id: 'morse-key',
    name: 'Morse key',
    description: 'Text to Morse and back, a chart, and playback at three speeds.',
    lesson: 'morse',
  },
  {
    id: 'base-converter',
    name: 'Base converter',
    description: 'Text, binary, decimal codes and hex side by side, plus one number in three bases.',
    lesson: 'binary',
  },
  {
    id: 'base64',
    name: 'Base64 decoder',
    description: 'Base64 and Base32 to text and back, with a clear message when the input is not valid.',
    lesson: 'hex-and-base64',
  },
  {
    id: 'caesar-wheel',
    name: 'Caesar wheel',
    description: 'Turn the inner ring to any shift, encrypt or decrypt text, and try all 25 shifts at once.',
    lesson: 'caesar',
  },
  {
    id: 'substitution',
    name: 'Substitution workbench',
    description: 'Letter counts, a grid for your guesses and a live preview. Fills in Atbash or a keyword alphabet.',
    lesson: 'substitution',
  },
  {
    id: 'polybius',
    name: 'Polybius square',
    description: 'The 5×5 square, with an optional keyword, for Polybius pairs and tap code.',
    lesson: 'polybius',
  },
  {
    id: 'vigenere',
    name: 'Vigenère workbench',
    description: 'Encrypt and decrypt with a key, and find an unknown key from repeats and letter counts.',
    lesson: 'vigenere',
  },
  {
    id: 'transposition',
    name: 'Transposition',
    description: 'Rail fence with any number of rails, and columns under a keyword, with the shape drawn out.',
    lesson: 'transposition',
  },
  {
    id: 'bacon',
    name: 'Bacon decoder',
    description: 'Reads A/B text, any two symbols, or capitals hidden in ordinary text.',
    lesson: 'bacon',
  },
  {
    id: 'pigpen',
    name: 'Pigpen key',
    description: 'The pigpen key, a board of symbols to click, and a way to draw your own messages.',
    lesson: 'pigpen',
  },
  {
    id: 'book',
    name: 'Book cipher helper',
    description: 'Numbers the lines, words and letters of a text and looks up the references.',
    lesson: 'book-ciphers',
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
export const PRACTICE: Record<string, { href: string; title: string; cipher: 'caesar' | 'vigenere'; tool: string; description: string }> = {
  caesar: {
    href: '/practice/caesar',
    title: 'Caesar practice',
    cipher: 'caesar',
    tool: 'caesar-wheel',
    description: 'Endless Caesar cipher messages to decode, with or without the key.',
  },
  vigenere: {
    href: '/practice/vigenere',
    title: 'Vigenère practice',
    cipher: 'vigenere',
    tool: 'vigenere',
    description: 'Endless Vigenère messages to decode, with the key or a choice of four.',
  },
};
