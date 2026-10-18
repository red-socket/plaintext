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
  {
    id: 'text-reader',
    name: 'Text reader',
    description: 'Reads first, last or n-th letters of lines and words, every n-th letter, or only the capitals.',
    lesson: 'acrostics',
  },
  {
    id: 'invisible-ink',
    name: 'Invisible ink finder',
    description: 'Shows zero-width characters and trailing whitespace, and decodes messages made of them.',
    lesson: 'page-source',
  },
  {
    id: 'metadata',
    name: 'Metadata viewer',
    description: 'Reads EXIF, GPS and comments from JPEGs and text chunks from PNGs, in your browser.',
    lesson: 'metadata',
  },
  {
    id: 'image-inspector',
    name: 'Image inspector',
    description: 'Colour channels, bit planes, contrast stretching, and messages hidden in the lowest bits.',
    lesson: 'image-bits',
  },
  {
    id: 'spectrogram',
    name: 'Spectrogram viewer',
    description: 'Draws a sound as a picture of its pitches over time, to find what is hidden in it.',
    lesson: 'spectrograms',
  },
  {
    id: 'sstv',
    name: 'SSTV decoder',
    description: 'Turns a Martin M1 slow-scan television recording back into its picture.',
    lesson: 'sstv',
  },
  {
    id: 'char-inspector',
    name: 'Character inspector',
    description: 'Code points and UTF-8 bytes for every character, text from code points, and a fix for garbled accents.',
    lesson: 'unicode',
  },
  {
    id: 'hex-viewer',
    name: 'Hex viewer',
    description: 'Any file as bytes: what it really is, readable text inside it, and other files hidden in it.',
    lesson: 'file-signatures',
  },
  {
    id: 'hash-calculator',
    name: 'Hash calculator',
    description: 'MD5, SHA-1 and SHA-256 of any text, cracking a hash from a list of guesses, and check digits.',
    lesson: 'hashes',
  },
  {
    id: 'code-scanner',
    name: 'Code scanner',
    description: 'Reads QR codes, even damaged or inverted ones, and EAN-13 barcodes from a picture.',
    lesson: 'qr-codes',
  },
  {
    id: 'xor',
    name: 'XOR workbench',
    description: 'XOR text or hex with a key, and XOR two ciphertexts together to cancel a reused key.',
    lesson: 'xor',
  },
  {
    id: 'enigma',
    name: 'Enigma machine',
    description: 'A working Enigma I: five rotors, two reflectors, ring settings, start positions and plugboard.',
    lesson: 'enigma',
  },
  {
    id: 'key-exchange',
    name: 'Key exchange',
    description: 'Diffie–Hellman with small numbers: both sides of the exchange, and an eavesdropper trying every secret.',
    lesson: 'diffie-hellman',
  },
  {
    id: 'rsa',
    name: 'RSA workbench',
    description: 'Make a small RSA key, encrypt and decrypt numbers, and break a key by factoring it.',
    lesson: 'rsa',
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
  'plain-text': 'Ordinary text that seems too ordinary',
  files: 'Images, sounds and files',
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
