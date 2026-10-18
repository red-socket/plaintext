/**
 * Image tricks on raw RGBA pixels (as from a canvas): channels, bit planes, and LSB messages.
 */

export type Channel = 'r' | 'g' | 'b' | 'a';
const OFFSET: Record<Channel, number> = { r: 0, g: 1, b: 2, a: 3 };

/** One bit of one channel as a black-and-white image: 255 where the bit is set. */
export function bitPlane(rgba: Uint8ClampedArray | Uint8Array, channel: Channel, bit: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const o = OFFSET[channel];
  for (let i = 0; i < rgba.length; i += 4) {
    const v = (rgba[i + o] >> bit) & 1 ? 255 : 0;
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}

/** One channel as greyscale, optionally stretched so its darkest value is black and brightest white. */
export function channelView(rgba: Uint8ClampedArray | Uint8Array, channel: Channel, stretch = false): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba.length);
  const o = OFFSET[channel];
  let lo = 255;
  let hi = 0;
  if (stretch) {
    for (let i = o; i < rgba.length; i += 4) {
      if (rgba[i] < lo) lo = rgba[i];
      if (rgba[i] > hi) hi = rgba[i];
    }
  }
  const span = Math.max(1, hi - lo);
  for (let i = 0; i < rgba.length; i += 4) {
    const v = stretch ? ((rgba[i + o] - lo) * 255) / span : rgba[i + o];
    out[i] = out[i + 1] = out[i + 2] = v;
    out[i + 3] = 255;
  }
  return out;
}

/**
 * Reads a message from the lowest bit of the chosen channels, pixel by pixel, left to right and
 * top to bottom, eight bits per byte, until a zero byte. This is the common simple LSB scheme.
 */
export function readLsb(rgba: Uint8ClampedArray | Uint8Array, channels: Channel[] = ['r', 'g', 'b'], bit = 0, maxBytes = 4096): string {
  const bytes: number[] = [];
  let cur = 0;
  let n = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    for (const c of channels) {
      cur = (cur << 1) | ((rgba[i + OFFSET[c]] >> bit) & 1);
      if (++n === 8) {
        if (cur === 0) return new TextDecoder().decode(new Uint8Array(bytes));
        bytes.push(cur);
        if (bytes.length >= maxBytes) return new TextDecoder().decode(new Uint8Array(bytes));
        cur = 0;
        n = 0;
      }
    }
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

/** Writes a zero-terminated message into the lowest bits, the same way `readLsb` reads it. */
export function writeLsb(rgba: Uint8ClampedArray | Uint8Array, message: string, channels: Channel[] = ['r', 'g', 'b']): void {
  const bits = [...new TextEncoder().encode(message), 0].flatMap((b) => [7, 6, 5, 4, 3, 2, 1, 0].map((k) => (b >> k) & 1));
  let k = 0;
  for (let i = 0; i < rgba.length && k < bits.length; i += 4) {
    for (const c of channels) {
      if (k >= bits.length) break;
      const j = i + OFFSET[c];
      rgba[j] = (rgba[j] & 0xfe) | bits[k++];
    }
  }
  if (k < bits.length) throw new Error('Image too small for the message');
}

/** How readable a decoded string looks: the share of printable ASCII. Used to flag likely messages. */
export function printableShare(s: string): number {
  if (!s) return 0;
  return [...s].filter((c) => /[\x20-\x7e\n]/.test(c)).length / [...s].length;
}
