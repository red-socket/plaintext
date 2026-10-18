import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Minimal PNG decoder for tests: 8-bit greyscale, RGB or RGBA, non-interlaced. Returns RGBA. */
export function readPng(path: string): { width: number; height: number; rgba: Uint8Array } {
  const buf = readFileSync(path);
  let i = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (i < buf.length) {
    const len = buf.readUInt32BE(i);
    const type = buf.toString('latin1', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error('Only 8-bit non-interlaced PNGs');
      colorType = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 6: 4 }[colorType as 0 | 2 | 6];
  if (!channels) throw new Error(`Unsupported colour type ${colorType}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      const p = a + b - c;
      const pr = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
      const pred = [0, a, b, (a + b) >> 1, pr][filter];
      out[y * stride + x] = (line[x] + pred) & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    for (let c = 0; c < 3; c++) rgba[p * 4 + c] = out[p * channels + (channels === 1 ? 0 : c)];
    rgba[p * 4 + 3] = channels === 4 ? out[p * channels + 3] : 255;
  }
  return { width, height, rgba };
}
