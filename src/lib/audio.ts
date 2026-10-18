/**
 * Sound as data: WAV files, spectrograms, and SSTV (Martin M1) images.
 */

// ── WAV ────────────────────────────────────────────────────────────────

/** Reads a PCM (8/16/24/32-bit) or float WAV and mixes it to mono. */
export function readWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (o: number) => String.fromCharCode(...bytes.subarray(o, o + 4));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('Not a WAV file');
  let fmt: { format: number; channels: number; rate: number; bits: number } | null = null;
  let i = 12;
  while (i + 8 <= bytes.length) {
    const id = tag(i);
    const len = dv.getUint32(i + 4, true);
    const body = i + 8;
    if (id === 'fmt ') {
      fmt = { format: dv.getUint16(body, true), channels: dv.getUint16(body + 2, true), rate: dv.getUint32(body + 4, true), bits: dv.getUint16(body + 14, true) };
    } else if (id === 'data' && fmt) {
      const bps = fmt.bits / 8;
      const frames = Math.floor(Math.min(len, bytes.length - body) / (bps * fmt.channels));
      const out = new Float32Array(frames);
      for (let f = 0; f < frames; f++) {
        let sum = 0;
        for (let c = 0; c < fmt.channels; c++) {
          const o = body + (f * fmt.channels + c) * bps;
          if (fmt.format === 3) sum += bps === 4 ? dv.getFloat32(o, true) : dv.getFloat64(o, true);
          else if (bps === 1) sum += (bytes[o] - 128) / 128;
          else if (bps === 2) sum += dv.getInt16(o, true) / 32768;
          else if (bps === 3) sum += ((bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16)) << 8 >> 8) / 8388608;
          else sum += dv.getInt32(o, true) / 2147483648;
        }
        out[f] = sum / fmt.channels;
      }
      return { samples: out, sampleRate: fmt.rate };
    }
    i = body + len + (len % 2);
  }
  throw new Error('WAV file has no audio data');
}

/** 16-bit mono WAV. */
export function writeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const out = new Uint8Array(44 + samples.length * 2);
  const dv = new DataView(out.buffer);
  const str = (o: number, s: string) => [...s].forEach((c, k) => (out[o + k] = c.charCodeAt(0)));
  str(0, 'RIFF');
  dv.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true);
  dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true);
  dv.setUint16(34, 16, true);
  str(36, 'data');
  dv.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 32767, true);
  return out;
}

// ── Spectrogram ────────────────────────────────────────────────────────

/** In-place radix-2 FFT. `re` and `im` must have the same power-of-two length. */
export function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

/**
 * Short-time Fourier transform: one column per `hop` samples, `size / 2` rows from 0 Hz up.
 * Values are decibels relative to the loudest point (0 is loudest, negative is quieter).
 */
export function spectrogram(samples: Float32Array, size = 1024, hop = 256): { columns: Float32Array[]; binHz: (rate: number) => number } {
  const win = new Float32Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
  const columns: Float32Array[] = [];
  let peak = 1e-12;
  for (let start = 0; start + size <= samples.length; start += hop) {
    const re = new Float32Array(size);
    const im = new Float32Array(size);
    for (let i = 0; i < size; i++) re[i] = samples[start + i] * win[i];
    fft(re, im);
    const col = new Float32Array(size / 2);
    for (let k = 0; k < size / 2; k++) {
      col[k] = re[k] * re[k] + im[k] * im[k];
      if (col[k] > peak) peak = col[k];
    }
    columns.push(col);
  }
  for (const col of columns) for (let k = 0; k < col.length; k++) col[k] = 10 * Math.log10(col[k] / peak + 1e-12);
  return { columns, binHz: (rate) => rate / size };
}

// ── SSTV, Martin M1 ────────────────────────────────────────────────────

/** Martin M1: 320×256, each line sent green, blue, red. Times in seconds. */
export const MARTIN_M1 = { width: 320, height: 256, sync: 0.004862, porch: 0.000572, scan: 0.146432, sep: 0.000572, vis: 44 };
const LINE = MARTIN_M1.sync + MARTIN_M1.porch + 3 * (MARTIN_M1.scan + MARTIN_M1.sep);

const freqOf = (v: number) => 1500 + (v / 255) * 800;

/** Encodes an RGB image (row-major, 3 bytes per pixel, 320 wide) as Martin M1, with the VIS header. */
export function sstvEncode(rgb: Uint8Array, lines: number, sampleRate: number): Float32Array {
  const out: number[] = [];
  let phase = 0;
  let t = 0; // exact time so rounding doesn't drift
  const tone = (freq: number, dur: number) => {
    const end = Math.round((t + dur) * sampleRate);
    for (let n = Math.round(t * sampleRate); n < end; n++) {
      phase += (2 * Math.PI * freq) / sampleRate;
      out.push(0.5 * Math.sin(phase));
    }
    t += dur;
  };
  // VIS: leader, break, leader, start bit, 7 data bits LSB first (1100 Hz = 1), even parity, stop bit.
  tone(1900, 0.3);
  tone(1200, 0.01);
  tone(1900, 0.3);
  tone(1200, 0.03);
  let ones = 0;
  for (let b = 0; b < 7; b++) {
    const bit = (MARTIN_M1.vis >> b) & 1;
    ones += bit;
    tone(bit ? 1100 : 1300, 0.03);
  }
  tone(ones % 2 ? 1100 : 1300, 0.03);
  tone(1200, 0.03);
  const W = MARTIN_M1.width;
  const px = MARTIN_M1.scan / W;
  for (let y = 0; y < lines; y++) {
    tone(1200, MARTIN_M1.sync);
    tone(1500, MARTIN_M1.porch);
    for (const c of [1, 2, 0]) {
      for (let x = 0; x < W; x++) tone(freqOf(rgb[(y * W + x) * 3 + c]), px);
      tone(1500, MARTIN_M1.sep);
    }
  }
  return Float32Array.from(out);
}

/**
 * Instantaneous frequency, from the analytic signal: FFT, drop negative frequencies, inverse FFT,
 * then measure how fast the phase turns from one sample to the next. Lightly smoothed.
 */
function instantFrequency(samples: Float32Array, rate: number): Float32Array {
  let size = 1;
  while (size < samples.length) size <<= 1;
  const re = new Float32Array(size);
  const im = new Float32Array(size);
  re.set(samples);
  fft(re, im);
  // Keep DC and Nyquist, double positive frequencies, zero negative ones.
  for (let k = 1; k < size / 2; k++) {
    re[k] *= 2;
    im[k] *= 2;
  }
  for (let k = size / 2 + 1; k < size; k++) re[k] = im[k] = 0;
  // Inverse FFT by conjugating, transforming and conjugating again.
  for (let k = 0; k < size; k++) im[k] = -im[k];
  fft(re, im);
  for (let k = 0; k < size; k++) {
    re[k] /= size;
    im[k] = -im[k] / size;
  }
  const n = samples.length;
  const raw = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    const d = Math.atan2(im[i] * re[i - 1] - re[i] * im[i - 1], re[i] * re[i - 1] + im[i] * im[i - 1]);
    raw[i] = (d * rate) / (2 * Math.PI);
  }
  raw[0] = raw[1];
  const k = Math.max(1, Math.round(rate * 0.00025));
  const f = new Float32Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += raw[i] - (i >= k ? raw[i - k] : 0);
    f[Math.max(0, i - Math.floor(k / 2))] = acc / Math.min(k, i + 1);
  }
  return f;
}

/**
 * Decodes Martin M1. Finds each line's sync pulse (re-syncing every line, so slow drift in a
 * recording is tolerated) and reads the three colour scans. Returns as many lines as it finds.
 */
export function sstvDecode(samples: Float32Array, rate: number): { rgb: Uint8Array; lines: number } {
  const f = instantFrequency(samples, rate);
  const W = MARTIN_M1.width;
  const syncLen = Math.round(MARTIN_M1.sync * rate);
  const lineLen = LINE * rate;
  // Narrow enough that the VIS data bits (1100 and 1300 Hz) don't count as sync.
  const isSync = (i: number) => f[i] > 1140 && f[i] < 1260;

  // First line sync: a run of ~1200 Hz at least 3/4 of a sync pulse long, after the VIS header.
  const runAt = (i: number) => {
    let r = 0;
    while (i + r < f.length && isSync(i + r)) r++;
    return r;
  };
  let start = -1;
  for (let i = 0; i < f.length; i++) {
    const r = runAt(i);
    // VIS bits are 30 ms; a line sync is about 5 ms. The VIS stop bit runs straight into the
    // first sync, so a ~35 ms run means the sync is its last 5 ms.
    if (r >= syncLen * 0.75 && r <= syncLen * 1.6) {
      start = i;
      break;
    }
    const merged = (0.03 + MARTIN_M1.sync) * rate;
    // Tight bounds: the VIS start bit alone is 30 ms and must not match.
    if (r >= merged * 0.94 && r <= merged * 1.1) {
      start = i + r - syncLen;
      break;
    }
    i += Math.max(0, r - 1);
  }
  const rgb = new Uint8Array(W * MARTIN_M1.height * 3);
  if (start < 0) return { rgb, lines: 0 };

  let lines = 0;
  let expected = start;
  for (let y = 0; y < MARTIN_M1.height; y++) {
    // Look for the sync near where it should be, and snap to its start.
    let best = Math.round(expected);
    const window = Math.round(rate * 0.004);
    for (let i = Math.max(0, best - window); i < best + window && i < f.length; i++) {
      if (isSync(i) && !isSync(i - 1) && runAt(i) >= syncLen * 0.6) {
        best = i;
        break;
      }
    }
    const lineStart = best;
    // Allow the very last line to end a few samples early.
    if (lineStart + lineLen - MARTIN_M1.sep * rate * 2 > f.length) break;
    let t = MARTIN_M1.sync + MARTIN_M1.porch;
    for (const c of [1, 2, 0]) {
      for (let x = 0; x < W; x++) {
        const a = lineStart + Math.floor((t + (x * MARTIN_M1.scan) / W) * rate);
        const b = Math.max(a + 1, lineStart + Math.floor((t + ((x + 1) * MARTIN_M1.scan) / W) * rate));
        let sum = 0;
        let cnt = 0;
        for (let i = a; i < b && i < f.length; i++, cnt++) sum += f[i];
        const v = cnt ? ((sum / cnt - 1500) / 800) * 255 : 0;
        rgb[(y * W + x) * 3 + c] = Math.max(0, Math.min(255, Math.round(v)));
      }
      t += MARTIN_M1.scan + MARTIN_M1.sep;
    }
    lines++;
    expected = lineStart + lineLen;
  }
  return { rgb, lines };
}
