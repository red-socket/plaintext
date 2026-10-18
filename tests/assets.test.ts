/**
 * Every generated puzzle file decodes, with the same code the browser tools use, to what its puzzle needs.
 * Regenerate the files with `python3 scripts/make_assets.py`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readWav, spectrogram, sstvDecode, MARTIN_M1 } from '../src/lib/audio';
import { base64Decode } from '../src/lib/encodings';
import { readMetadata } from '../src/lib/metadata';
import { bitPlane, readLsb } from '../src/lib/pixels';
import { readPng } from './helpers/png';

const file = (p: string) => new Uint8Array(readFileSync(`public/files/${p}`));

describe('metadata puzzles', () => {
  it('holiday snap: the answer is in the user comment', async () => {
    const m = await readMetadata(file('metadata-1-snap/beach.jpg'));
    expect(m.fields.find((f) => f.name === 'User comment')?.value).toBe('The answer is SANDCASTLE');
  });

  it('huts: GPS points at Bletchley Park', async () => {
    const m = await readMetadata(file('metadata-2-where/huts.jpg'));
    expect(m.gps!.lat).toBeCloseTo(51.9977, 3);
    expect(m.gps!.lon).toBeCloseTo(-0.7407, 3);
  });

  it('screenshot: a compressed text chunk holds Base64', async () => {
    const m = await readMetadata(file('metadata-3-screenshot/notes.png'));
    const comment = m.fields.find((f) => f.name === 'Comment')!.value;
    expect(base64Decode(comment)).toBe('THE ANSWER IS MAGPIE');
  });
});

describe('pixel puzzles', () => {
  it('fog: the lowest bit draws the word', () => {
    const { rgba } = readPng('public/files/pixels-1-fog/fog.png');
    const mask = readPng('tests/fixtures/pixels-fog-mask.png').rgba;
    const plane = bitPlane(rgba, 'r', 0);
    let diff = 0;
    for (let i = 0; i < plane.length; i += 4) if ((plane[i] > 0) !== (mask[i] > 0)) diff++;
    expect(diff).toBe(0);
  });

  it('channels: red, green and blue low bits draw three different words', () => {
    const { rgba } = readPng('public/files/pixels-2-channels/harbour.png');
    const lit = (c: 'r' | 'g' | 'b') => [...bitPlane(rgba, c, 0)].filter((v, i) => i % 4 === 0 && v).length;
    const counts = [lit('r'), lit('g'), lit('b')];
    for (const n of counts) expect(n).toBeGreaterThan(500);
    expect(new Set(counts).size).toBe(3);
  });

  it('pier: an LSB message', () => {
    expect(readLsb(readPng('public/files/pixels-3-lsb/pier.png').rgba)).toBe('THE ANSWER IS PELICAN');
    expect(readLsb(readPng('public/files/lessons/pixels.png').rgba)).toBe('Hidden in the pixels');
  });
});

describe('sound puzzles', () => {
  const bandEnergy = (path: string, lo: number, hi: number) => {
    const { samples, sampleRate } = readWav(file(path));
    const { columns, binHz } = spectrogram(samples, 1024, 512);
    const hz = binHz(sampleRate);
    return columns.filter((col) => {
      let best = -Infinity;
      for (let k = Math.floor(lo / hz); k < Math.min(col.length, hi / hz); k++) best = Math.max(best, col[k]);
      return best > -35;
    }).length / columns.length;
  };

  it('interference: the picture lives between 1.5 and 7.5 kHz', () => {
    expect(bandEnergy('spectro-1-interference/interference.wav', 1500, 7500)).toBeGreaterThan(0.5);
  });

  it('mosquito: a 17.5 kHz tone that comes and goes', () => {
    const share = bandEnergy('spectro-2-mosquito/drone.wav', 17000, 18000);
    expect(share).toBeGreaterThan(0.15);
    expect(share).toBeLessThan(0.8);
  });
});

describe('SSTV puzzles', () => {
  const cases: [string, string, number][] = [
    ['sstv-1-orbit/transmission.wav', 'sstv-orbit.png', 256],
    ['sstv-2-ham/transmission.wav', 'sstv-ham.png', 256],
    ['lessons/sstv-radio.wav', 'sstv-radio.png', 64],
  ];
  for (const [wav, png, lines] of cases) {
    it(`${wav} decodes to its picture`, () => {
      const { samples, sampleRate } = readWav(file(wav));
      const out = sstvDecode(samples, sampleRate);
      expect(out.lines).toBe(lines);
      const ref = readPng(`tests/fixtures/${png}`).rgba;
      const W = MARTIN_M1.width;
      let err = 0;
      let n = 0;
      for (let y = 0; y < lines; y++)
        for (let x = 0; x < W; x++)
          for (let c = 0; c < 3; c++) {
            err += Math.abs(out.rgb[(y * W + x) * 3 + c] - ref[(y * W + x) * 4 + c]);
            n++;
          }
      expect(err / n).toBeLessThan(25);
    }, 30000);
  }
});

describe('file puzzles', () => {
  it('report.txt is really a PNG', async () => {
    const { identify } = await import('../src/lib/files');
    expect(identify(file('files-1-extension/report.txt'))?.ext).toBe('png');
    expect(identify(file('lessons/mystery.dat'))?.ext).toBe('gif');
  });

  it('harbour.jpg carries a ZIP after its end', async () => {
    const { findEmbedded, imageEnd, readZip } = await import('../src/lib/files');
    const bytes = file('files-2-toobig/harbour.jpg');
    const end = imageEnd(bytes)!;
    expect(end).toBeLessThan(bytes.length);
    const zip = findEmbedded(bytes).find((e) => e.sig.ext === 'zip')!;
    expect(zip.offset).toBe(end);
    const [entry] = await readZip(bytes, zip.offset);
    expect(entry.name).toBe('secret.txt');
    expect(new TextDecoder().decode(entry.data)).toContain('The answer is ANCHOR.');
  });

  it('firmware.bin hides a password among its strings', async () => {
    const { strings } = await import('../src/lib/files');
    expect(strings(file('files-3-strings/firmware.bin'), 8).map((s) => s.text)).toContain('PASSWORD=KINGFISHER');
  });
});

describe('code puzzles', () => {
  const qr = async (path: string) => {
    const jsQR = (await import('jsqr')).default;
    const { width, height, rgba } = readPng(`public/files/${path}`);
    return jsQR(new Uint8ClampedArray(rgba), width, height, { inversionAttempts: 'attemptBoth' })?.data;
  };

  it('the scratched QR code still reads', async () => {
    expect(await qr('codes-1-scratched/poster.png')).toBe('THE ANSWER IS MOSAIC');
  });

  it('the negative QR code reads when inverted', async () => {
    expect(await qr('codes-2-negative/sticker.png')).toBe('ROT13: GUR NAFJRE VF CEVFZ');
    expect(await qr('lessons/qr.png')).toBe('Hello from Plaintext');
  });

  it('the receipt barcode pairs up into GARDEN', async () => {
    const { eanFromRow } = await import('../src/lib/barcode');
    const { a1z26Decode } = await import('../src/lib/encodings');
    const { width, height, rgba } = readPng('public/files/codes-3-receipt/barcode.png');
    const y = Math.floor(height / 2);
    const row = Array.from({ length: width }, (_, x) => rgba[(y * width + x) * 4]);
    const digits = eanFromRow(row)!;
    expect(digits).toBe('0701180405141');
    expect(a1z26Decode(digits.slice(0, 12).match(/../g)!.join('-'))).toBe('GARDEN');
  });
});

describe('case 2 files', () => {
  it('the ident draws in the spectrogram band', async () => {
    const { samples, sampleRate } = readWav(file('case2-1-ident/ident.wav'));
    const { columns, binHz } = spectrogram(samples, 1024, 512);
    const hz = binHz(sampleRate);
    const lit = columns.filter((col) => Math.max(...col.slice(Math.floor(1500 / hz), Math.floor(7500 / hz))) > -35).length;
    // No background noise here, so the gaps between letters are silent columns.
    expect(lit / columns.length).toBeGreaterThan(0.3);
  });

  it('the fort photo hides WAVES in its low bits', () => {
    expect(readLsb(readPng('public/files/case2-2-fort/fort.png').rgba)).toBe('WAVES');
  });

  it('the sign-off decodes to its picture', () => {
    const { samples, sampleRate } = readWav(file('case2-4-signoff/signoff.wav'));
    const out = sstvDecode(samples, sampleRate);
    expect(out.lines).toBe(64);
    const ref = readPng('tests/fixtures/sstv-studio.png').rgba;
    let err = 0;
    for (let p = 0; p < 320 * 64; p++) for (let c = 0; c < 3; c++) err += Math.abs(out.rgb[p * 3 + c] - ref[p * 4 + c]);
    expect(err / (320 * 64 * 3)).toBeLessThan(25);
  });
});
