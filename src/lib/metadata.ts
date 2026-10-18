/**
 * Reads the metadata files carry about themselves: EXIF in JPEG (and PNG eXIf), JPEG comments,
 * and PNG text chunks. Works on raw bytes, so it runs the same in the browser and in tests.
 */

export type MetaField = { group: string; name: string; value: string };
export type Metadata = { format: 'jpeg' | 'png' | 'unknown'; fields: MetaField[]; gps?: { lat: number; lon: number } };

const TAGS: Record<number, string> = {
  0x010e: 'Image description',
  0x010f: 'Camera make',
  0x0110: 'Camera model',
  0x0112: 'Orientation',
  0x0131: 'Software',
  0x0132: 'Date and time',
  0x013b: 'Artist',
  0x8298: 'Copyright',
  0x9003: 'Date taken',
  0x9286: 'User comment',
  0x9c9b: 'Title (Windows)',
  0x9c9c: 'Comment (Windows)',
  0x9c9d: 'Author (Windows)',
  0x9c9f: 'Subject (Windows)',
  0xa430: 'Camera owner',
  0xa434: 'Lens model',
};

const GPS_TAGS: Record<number, string> = { 1: 'Latitude ref', 2: 'Latitude', 3: 'Longitude ref', 4: 'Longitude', 6: 'Altitude' };

const latin = (b: Uint8Array) => Array.from(b, (c) => String.fromCharCode(c)).join('');
const utf8 = (b: Uint8Array) => new TextDecoder().decode(b);

/** Parses a TIFF structure (the body of an EXIF block). */
function parseTiff(buf: Uint8Array, group = 'EXIF'): { fields: MetaField[]; gps?: { lat: number; lon: number } } {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const le = latin(buf.subarray(0, 2)) === 'II';
  const u16 = (o: number) => dv.getUint16(o, le);
  const u32 = (o: number) => dv.getUint32(o, le);
  const fields: MetaField[] = [];
  const gpsRaw: Record<number, unknown> = {};
  const SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

  function value(type: number, count: number, at: number): unknown {
    const size = (SIZES[type] ?? 1) * count;
    const off = size <= 4 ? at : u32(at);
    if (off + size > buf.length) return undefined;
    const bytes = buf.subarray(off, off + size);
    if (type === 2) return latin(bytes).replace(/\0+$/, '');
    if (type === 7 || type === 1) return bytes;
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      const o = off + i * (SIZES[type] ?? 1);
      if (type === 3) out.push(u16(o));
      else if (type === 4) out.push(u32(o));
      else if (type === 9) out.push(dv.getInt32(o, le));
      else if (type === 5) out.push(u32(o) / (u32(o + 4) || 1));
      else if (type === 10) out.push(dv.getInt32(o, le) / (dv.getInt32(o + 4, le) || 1));
    }
    return out;
  }

  function readIfd(start: number, kind: 'main' | 'exif' | 'gps', seen = new Set<number>()) {
    if (start <= 0 || start + 2 > buf.length || seen.has(start)) return;
    seen.add(start);
    const n = u16(start);
    for (let i = 0; i < n; i++) {
      const e = start + 2 + i * 12;
      if (e + 12 > buf.length) return;
      const tag = u16(e);
      const type = u16(e + 2);
      const count = u32(e + 4);
      if (kind !== 'gps' && tag === 0x8769) readIfd(u32(e + 8), 'exif', seen);
      else if (kind !== 'gps' && tag === 0x8825) readIfd(u32(e + 8), 'gps', seen);
      else if (kind === 'gps') gpsRaw[tag] = value(type, count, e + 8);
      else if (TAGS[tag]) {
        const v = value(type, count, e + 8);
        let text: string;
        if (v instanceof Uint8Array) {
          // User comments start with an 8-byte charset id; Windows XP tags are UTF-16LE.
          if (tag === 0x9286) text = utf8(v.subarray(8)).replace(/\0+$/, '');
          else if (tag >= 0x9c9b && tag <= 0x9c9f) text = new TextDecoder('utf-16le').decode(v).replace(/\0+$/, '');
          else text = utf8(v);
        } else text = Array.isArray(v) ? v.join(', ') : String(v ?? '');
        fields.push({ group, name: TAGS[tag], value: text });
      }
    }
  }

  readIfd(u32(4), 'main');

  let gps: { lat: number; lon: number } | undefined;
  const dms = (v: unknown) => (Array.isArray(v) && v.length === 3 ? v[0] + v[1] / 60 + v[2] / 3600 : undefined);
  const lat = dms(gpsRaw[2]);
  const lon = dms(gpsRaw[4]);
  if (lat !== undefined && lon !== undefined) {
    gps = { lat: gpsRaw[1] === 'S' ? -lat : lat, lon: gpsRaw[3] === 'W' ? -lon : lon };
    fields.push({ group: 'GPS', name: 'Latitude', value: gps.lat.toFixed(5) });
    fields.push({ group: 'GPS', name: 'Longitude', value: gps.lon.toFixed(5) });
  }
  if (Array.isArray(gpsRaw[6])) fields.push({ group: 'GPS', name: 'Altitude', value: `${(gpsRaw[6] as number[])[0]} m` });
  return { fields, gps };
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function readMetadata(bytes: Uint8Array): Promise<Metadata> {
  // JPEG: FF D8, then segments of FF xx + 2-byte length.
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const fields: MetaField[] = [];
    let gps: Metadata['gps'];
    let i = 2;
    while (i + 4 <= bytes.length && bytes[i] === 0xff) {
      const marker = bytes[i + 1];
      if (marker === 0xda || marker === 0xd9) break; // image data starts
      const len = (bytes[i + 2] << 8) | bytes[i + 3];
      const body = bytes.subarray(i + 4, i + 2 + len);
      if (marker === 0xe1 && latin(body.subarray(0, 6)) === 'Exif\0\0') {
        const r = parseTiff(body.subarray(6));
        fields.push(...r.fields);
        gps = r.gps;
      } else if (marker === 0xfe) fields.push({ group: 'JPEG', name: 'Comment', value: utf8(body) });
      i += 2 + len;
    }
    return { format: 'jpeg', fields, gps };
  }

  // PNG: 8-byte signature, then chunks of length, type, data, CRC.
  if (latin(bytes.subarray(1, 4)) === 'PNG') {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const fields: MetaField[] = [];
    let gps: Metadata['gps'];
    let i = 8;
    while (i + 8 <= bytes.length) {
      const len = dv.getUint32(i);
      const type = latin(bytes.subarray(i + 4, i + 8));
      const data = bytes.subarray(i + 8, i + 8 + len);
      if (type === 'tEXt') {
        const z = data.indexOf(0);
        fields.push({ group: 'PNG text', name: latin(data.subarray(0, z)), value: latin(data.subarray(z + 1)) });
      } else if (type === 'zTXt') {
        const z = data.indexOf(0);
        fields.push({ group: 'PNG text', name: latin(data.subarray(0, z)), value: utf8(await inflate(data.subarray(z + 2))) });
      } else if (type === 'iTXt') {
        const z = data.indexOf(0);
        const compressed = data[z + 1] === 1;
        let p = z + 3;
        p = data.indexOf(0, p) + 1; // language tag
        p = data.indexOf(0, p) + 1; // translated keyword
        const text = data.subarray(p);
        fields.push({ group: 'PNG text', name: latin(data.subarray(0, z)), value: utf8(compressed ? await inflate(text) : text) });
      } else if (type === 'eXIf') {
        const r = parseTiff(data);
        fields.push(...r.fields);
        gps = r.gps;
      } else if (type === 'IEND') break;
      i += 12 + len;
    }
    return { format: 'png', fields, gps };
  }

  return { format: 'unknown', fields: [] };
}
