/**
 * Looking inside files: signatures ("magic bytes"), hex dumps, readable strings, data hidden after
 * a file's end, and a small ZIP reader. Works on raw bytes in the browser and in tests.
 */

export type Signature = { name: string; ext: string; hex: string; offset?: number; strong: boolean };

/** `strong` signatures are long enough to search for anywhere in a file without false alarms. */
export const SIGNATURES: Signature[] = [
  { name: 'PNG image', ext: 'png', hex: '89504E470D0A1A0A', strong: true },
  { name: 'JPEG image', ext: 'jpg', hex: 'FFD8FFE0', strong: true },
  { name: 'JPEG image', ext: 'jpg', hex: 'FFD8FFE1', strong: true },
  { name: 'JPEG image', ext: 'jpg', hex: 'FFD8FFDB', strong: true },
  { name: 'JPEG image', ext: 'jpg', hex: 'FFD8FF', strong: false },
  { name: 'GIF image', ext: 'gif', hex: '474946383961', strong: true },
  { name: 'GIF image', ext: 'gif', hex: '474946383761', strong: true },
  { name: 'PDF document', ext: 'pdf', hex: '255044462D', strong: true },
  { name: 'ZIP archive (also .docx, .xlsx, .jar, .apk)', ext: 'zip', hex: '504B0304', strong: true },
  { name: 'WAV audio', ext: 'wav', hex: '52494646', strong: false },
  { name: 'MP3 audio with ID3 tags', ext: 'mp3', hex: '494433', strong: false },
  { name: 'Ogg audio', ext: 'ogg', hex: '4F676753', strong: true },
  { name: 'MIDI music', ext: 'mid', hex: '4D546864', strong: true },
  { name: '7-Zip archive', ext: '7z', hex: '377ABCAF271C', strong: true },
  { name: 'RAR archive', ext: 'rar', hex: '526172211A07', strong: true },
  { name: 'gzip archive', ext: 'gz', hex: '1F8B08', strong: false },
  { name: 'SQLite database', ext: 'sqlite', hex: '53514C69746520666F726D61742033', strong: true },
  { name: 'Windows program', ext: 'exe', hex: '4D5A', strong: false },
  { name: 'Linux program (ELF)', ext: 'elf', hex: '7F454C46', strong: true },
  { name: 'BMP image', ext: 'bmp', hex: '424D', strong: false },
];

const fromHex = (h: string) => Uint8Array.from(h.match(/../g)!.map((x) => parseInt(x, 16)));
const at = (bytes: Uint8Array, sig: Uint8Array, i: number) => sig.every((b, k) => bytes[i + k] === b);

/** What the first bytes say the file is. Most specific match first. */
export function identify(bytes: Uint8Array): Signature | null {
  for (const s of SIGNATURES) {
    if (!at(bytes, fromHex(s.hex), s.offset ?? 0)) continue;
    if (s.ext === 'wav' && String.fromCharCode(...bytes.subarray(8, 12)) !== 'WAVE') continue;
    return s;
  }
  return null;
}

/** Strong signatures found anywhere after the start: files inside files. */
export function findEmbedded(bytes: Uint8Array): { offset: number; sig: Signature }[] {
  const out: { offset: number; sig: Signature }[] = [];
  const strong = SIGNATURES.filter((s) => s.strong).map((s) => ({ s, b: fromHex(s.hex) }));
  for (let i = 1; i < bytes.length; i++) {
    for (const { s, b } of strong) {
      if (bytes[i] === b[0] && at(bytes, b, i)) {
        // A ZIP holds one local header per file; only report the first of a run.
        if (s.ext === 'zip' && out.some((o) => o.sig.ext === 'zip')) continue;
        out.push({ offset: i, sig: s });
        break;
      }
    }
  }
  return out;
}

/**
 * Where a PNG or JPEG really ends. Anything after that is extra data a viewer ignores:
 * a favourite hiding place.
 */
export function imageEnd(bytes: Uint8Array): number | null {
  const sig = identify(bytes);
  if (sig?.ext === 'png') {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let i = 8;
    while (i + 12 <= bytes.length) {
      const len = dv.getUint32(i);
      const type = String.fromCharCode(...bytes.subarray(i + 4, i + 8));
      i += 12 + len;
      if (type === 'IEND') return i;
    }
    return null;
  }
  if (sig?.ext === 'jpg') {
    // Walk the segments to the start of the image data, then find the end-of-image marker.
    let i = 2;
    while (i + 4 <= bytes.length && bytes[i] === 0xff) {
      const m = bytes[i + 1];
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      i += 2 + len;
      if (m === 0xda) break;
    }
    for (; i + 1 < bytes.length; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) return i + 2;
    }
    return null;
  }
  return null;
}

/** Runs of printable ASCII at least `min` long, like the Unix `strings` command. */
export function strings(bytes: Uint8Array, min = 5): { offset: number; text: string }[] {
  const out: { offset: number; text: string }[] = [];
  let start = -1;
  for (let i = 0; i <= bytes.length; i++) {
    const printable = i < bytes.length && bytes[i] >= 0x20 && bytes[i] < 0x7f;
    if (printable && start < 0) start = i;
    if (!printable && start >= 0) {
      if (i - start >= min) out.push({ offset: start, text: String.fromCharCode(...bytes.subarray(start, i)) });
      start = -1;
    }
  }
  return out;
}

/** Classic hex dump lines: offset, 16 bytes in hex, and the printable characters. */
export function hexdump(bytes: Uint8Array, from = 0, lines = 16): { offset: string; hex: string; ascii: string }[] {
  const out = [];
  for (let l = 0; l < lines; l++) {
    const o = from + l * 16;
    if (o >= bytes.length) break;
    const row = bytes.subarray(o, o + 16);
    out.push({
      offset: o.toString(16).toUpperCase().padStart(8, '0'),
      hex: Array.from(row, (b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' '),
      ascii: Array.from(row, (b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join(''),
    });
  }
  return out;
}

export type ZipEntry = { name: string; size: number; data: Uint8Array };

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Reads a ZIP starting at `offset` by walking its local file headers. Stored and deflated files only. */
export async function readZip(bytes: Uint8Array, offset = 0): Promise<ZipEntry[]> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out: ZipEntry[] = [];
  let i = offset;
  while (i + 30 <= bytes.length && dv.getUint32(i, true) === 0x04034b50) {
    const method = dv.getUint16(i + 8, true);
    const compSize = dv.getUint32(i + 18, true);
    const size = dv.getUint32(i + 22, true);
    const nameLen = dv.getUint16(i + 26, true);
    const extraLen = dv.getUint16(i + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(i + 30, i + 30 + nameLen));
    const start = i + 30 + nameLen + extraLen;
    const raw = bytes.subarray(start, start + compSize);
    const data = method === 0 ? raw : method === 8 ? await inflateRaw(raw) : new Uint8Array();
    out.push({ name, size, data });
    i = start + compSize;
  }
  return out;
}
