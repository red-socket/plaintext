import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fft, readWav, spectrogram, sstvDecode, sstvEncode, writeWav, MARTIN_M1 } from '../src/lib/audio';
import { extract, reveal, whitespaceReveal, zeroWidthHide, zeroWidthReveal, countInvisible } from '../src/lib/hidden';
import { readMetadata } from '../src/lib/metadata';
import { bitPlane, channelView, readLsb, writeLsb } from '../src/lib/pixels';

describe('acrostics and null ciphers', () => {
  const poem = `Bright the lamp on the far stone,
Every night it burns alone;
Across the bay the sailors steer,
Calm or storm, they find it here.
Old as the cliffs, it does not tire,
Night on night, a patient fire.`;

  it('reads first and last letters', () => {
    expect(extract(poem, 'line-first')).toBe('BEACON');
    expect(extract('cat dog', 'word-last')).toBe('TG');
    expect(extract('Send every vessel east now', 'word-first')).toBe('SEVEN');
  });

  it('reads the n-th letter of words and every n-th letter', () => {
    expect(extract('aXb cYd', 'word-nth', 2)).toBe('XY');
    expect(extract('abcdef', 'every-nth', 2)).toBe('ACE');
    expect(extract('abcdef', 'every-nth', 2, 2)).toBe('BDF');
    expect(extract('the Cat Ate Bread', 'capitals')).toBe('CAB');
  });
});

describe('invisible text', () => {
  it('hides and reveals with zero-width characters', () => {
    const hidden = zeroWidthHide('Hi', 'Nothing to see here.');
    expect(hidden.replace(/[​‌]/g, '')).toBe('Nothing to see here.');
    expect(countInvisible(hidden)).toBe(16);
    expect(zeroWidthReveal(hidden)).toBe('Hi');
  });

  it('reads trailing spaces and tabs', () => {
    const bits = '01001000'; // H
    const text = `line one${bits.slice(0, 4).replace(/0/g, ' ').replace(/1/g, '\t')}\nline two${bits.slice(4).replace(/0/g, ' ').replace(/1/g, '\t')}`;
    expect(whitespaceReveal(text)).toBe('H');
  });

  it('marks what you cannot see', () => {
    const shown = reveal('a​b\tc d');
    expect(shown.map((s) => s.kind)).toEqual(['text', 'zw', 'text', 'tab', 'text', 'space', 'text']);
    expect(reveal('​​​').every((s) => s.kind === 'zw')).toBe(true);
  });
});

describe('metadata', () => {
  it('reads EXIF, GPS and the comment from a JPEG', async () => {
    const m = await readMetadata(new Uint8Array(readFileSync('tests/fixtures/meta.jpg')));
    const get = (name: string) => m.fields.find((f) => f.name === name)?.value;
    expect(m.format).toBe('jpeg');
    expect(get('Image description')).toBe('A test description');
    expect(get('Artist')).toBe('Plaintext');
    expect(get('User comment')).toBe('hidden comment');
    expect(get('Comment')).toBe('jpeg comment here');
    expect(m.gps!.lat).toBeCloseTo(51.9977, 3);
    expect(m.gps!.lon).toBeCloseTo(-0.7407, 3);
  });

  it('reads plain, compressed and international PNG text chunks', async () => {
    const m = await readMetadata(new Uint8Array(readFileSync('tests/fixtures/meta.png')));
    const get = (name: string) => m.fields.find((f) => f.name === name)?.value;
    expect(m.format).toBe('png');
    expect(get('Comment')).toBe('plain text chunk');
    expect(get('Secret')).toBe('compressed chunk');
    expect(get('Note')).toBe('international chunk é');
  });

  it('says unknown for other files', async () => {
    expect((await readMetadata(new TextEncoder().encode('hello'))).format).toBe('unknown');
  });
});

describe('pixels', () => {
  const img = () => {
    const a = new Uint8ClampedArray(64 * 64 * 4);
    for (let i = 0; i < a.length; i++) a[i] = (i * 37) % 256;
    return a;
  };

  it('writes and reads an LSB message', () => {
    const a = img();
    writeLsb(a, 'THE ANSWER IS QUARTZ');
    expect(readLsb(a)).toBe('THE ANSWER IS QUARTZ');
  });

  it('refuses a message too long for the image', () => {
    expect(() => writeLsb(new Uint8ClampedArray(16), 'too long for four pixels')).toThrow(/too small/);
  });

  it('shows bit planes and channels', () => {
    const a = new Uint8ClampedArray([3, 0, 0, 255, 2, 0, 0, 255]);
    expect([...bitPlane(a, 'r', 0)].filter((_, i) => i % 4 === 0)).toEqual([255, 0]);
    expect([...channelView(a, 'r', true)].filter((_, i) => i % 4 === 0)).toEqual([255, 0]);
  });
});

describe('audio', () => {
  it('round-trips WAV', () => {
    const s = Float32Array.from({ length: 100 }, (_, i) => Math.sin(i / 5) * 0.5);
    const back = readWav(writeWav(s, 8000));
    expect(back.sampleRate).toBe(8000);
    expect(back.samples).toHaveLength(100);
    expect(Math.abs(back.samples[10] - s[10])).toBeLessThan(0.001);
  });

  it('FFT finds a tone', () => {
    const n = 1024;
    const re = Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 64 * i) / n));
    const im = new Float32Array(n);
    fft(re, im);
    const mags = Array.from({ length: n / 2 }, (_, k) => Math.hypot(re[k], im[k]));
    expect(mags.indexOf(Math.max(...mags))).toBe(64);
  });

  it('spectrogram puts a 2 kHz tone in the right row', () => {
    const rate = 8000;
    const s = Float32Array.from({ length: rate }, (_, i) => Math.sin((2 * Math.PI * 2000 * i) / rate));
    const { columns, binHz } = spectrogram(s, 512, 256);
    const col = columns[5];
    const peak = col.indexOf(Math.max(...col));
    expect(peak * binHz(rate)).toBeCloseTo(2000, -2);
  });

  for (const rate of [8000, 11025]) {
    it(`SSTV Martin M1 survives a round trip at ${rate} Hz`, () => {
      const W = MARTIN_M1.width;
      const lines = 24;
      const rgb = new Uint8Array(W * lines * 3);
      for (let y = 0; y < lines; y++)
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 3;
          rgb[i] = x < 160 ? 230 : 20;
          rgb[i + 1] = (x * 255) / W;
          rgb[i + 2] = y % 8 < 4 ? 200 : 40;
        }
      const audio = sstvEncode(rgb, lines, rate);
      const out = sstvDecode(audio, rate);
      expect(out.lines).toBe(lines);
      let err = 0;
      let count = 0;
      for (let y = 0; y < lines; y++)
        for (let x = 4; x < W - 4; x++)
          for (let c = 0; c < 3; c++) {
            err += Math.abs(out.rgb[(y * W + x) * 3 + c] - rgb[(y * W + x) * 3 + c]);
            count++;
          }
      expect(err / count).toBeLessThan(18);
    });
  }
});
