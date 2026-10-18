import { readFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { eanDecode, eanFromRow, eanModules } from '../src/lib/barcode';
import { ean13Check, hashKind, isbn10Check, md5, sha, sha256 } from '../src/lib/digest';
import { findEmbedded, hexdump, identify, imageEnd, readZip, strings } from '../src/lib/files';
import { fromMojibake, inspect, looksLikeMojibake, toMojibake } from '../src/lib/unicode';

describe('unicode', () => {
  it('shows code points and UTF-8 bytes', () => {
    const [a, e, euro] = inspect('Aé€');
    expect(a).toMatchObject({ codePoint: 'U+0041', bytes: '41', kind: 'ascii' });
    expect(e).toMatchObject({ codePoint: 'U+00E9', bytes: 'C3 A9', kind: 'latin' });
    expect(euro).toMatchObject({ codePoint: 'U+20AC', bytes: 'E2 82 AC', kind: 'other' });
    expect(inspect('🙂')[0].bytes).toBe('F0 9F 99 82');
  });

  it('makes and fixes mojibake, including the Windows-1252 range', () => {
    expect(toMojibake('café')).toBe('cafÃ©');
    expect(toMojibake('don’t')).toBe('donâ€™t');
    expect(fromMojibake('cafÃ©')).toBe('café');
    expect(fromMojibake(toMojibake('Zürich — naïve'))).toBe('Zürich — naïve');
    expect(fromMojibake('日本')).toBeNull();
    expect(looksLikeMojibake('cafÃ©')).toBe(true);
    expect(looksLikeMojibake('café')).toBe(false);
  });
});

describe('files', () => {
  const jpg = new Uint8Array(readFileSync('tests/fixtures/meta.jpg'));
  const png = new Uint8Array(readFileSync('tests/fixtures/meta.png'));

  /** A one-file ZIP, built by hand: just a local file header and the data. */
  function zip(name: string, content: string, deflate: boolean): Uint8Array {
    const data = new TextEncoder().encode(content);
    const body = deflate ? new Uint8Array(deflateRawSync(data)) : data;
    const nameB = new TextEncoder().encode(name);
    const h = new Uint8Array(30 + nameB.length);
    const dv = new DataView(h.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(8, deflate ? 8 : 0, true);
    dv.setUint32(18, body.length, true);
    dv.setUint32(22, data.length, true);
    dv.setUint16(26, nameB.length, true);
    h.set(nameB, 30);
    const out = new Uint8Array(h.length + body.length);
    out.set(h);
    out.set(body, h.length);
    return out;
  }

  it('identifies files by their first bytes', () => {
    expect(identify(jpg)?.ext).toBe('jpg');
    expect(identify(png)?.ext).toBe('png');
    expect(identify(new TextEncoder().encode('%PDF-1.7'))?.ext).toBe('pdf');
    expect(identify(new TextEncoder().encode('just text'))).toBeNull();
  });

  it('finds where an image ends, and a ZIP hidden after it', async () => {
    expect(imageEnd(jpg)).toBe(jpg.length);
    expect(imageEnd(png)).toBe(png.length);
    const z = zip('note.txt', 'The answer is under the floor.', true);
    const both = new Uint8Array(jpg.length + z.length);
    both.set(jpg);
    both.set(z, jpg.length);
    expect(imageEnd(both)).toBe(jpg.length);
    const found = findEmbedded(both);
    expect(found.map((f) => [f.offset, f.sig.ext])).toContainEqual([jpg.length, 'zip']);
    const entries = await readZip(both, jpg.length);
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('note.txt');
    expect(new TextDecoder().decode(entries[0].data)).toBe('The answer is under the floor.');
  });

  it('reads stored ZIP entries too', async () => {
    const entries = await readZip(zip('a.txt', 'stored', false));
    expect(new TextDecoder().decode(entries[0].data)).toBe('stored');
  });

  it('pulls out readable strings and makes hex dumps', () => {
    const bytes = new Uint8Array([0, 1, ...new TextEncoder().encode('hello world'), 2, 3, 65, 66]);
    expect(strings(bytes)).toEqual([{ offset: 2, text: 'hello world' }]);
    const [line] = hexdump(new TextEncoder().encode('ABC'));
    expect(line).toEqual({ offset: '00000000', hex: '41 42 43', ascii: 'ABC' });
  });
});

describe('hashes and check digits', () => {
  it('MD5 matches the reference values', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
    expect(md5('The quick brown fox jumps over the lazy dog')).toBe('9e107d9d372bb6826bd81d3542a419d6');
    expect(md5('a'.repeat(100))).toBe('36a92cc94a9e0fa21f625f8bfb007adf');
  });

  it('SHA-1 and SHA-256', async () => {
    expect(await sha('SHA-1', 'hello')).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
    expect(await sha('SHA-256', 'hello')).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  it('synchronous SHA-256 matches Web Crypto', async () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    for (const s of ['hello', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(200), 'café 🙂']) expect(sha256(s)).toBe(await sha('SHA-256', s));
  });

  it('names a hash by its length', () => {
    expect(hashKind('5d41402abc4b2a76b9719d911017c592')).toBe('MD5');
    expect(hashKind('not hex')).toBeNull();
  });

  it('computes ISBN and EAN check digits', () => {
    expect(isbn10Check('030640615')).toBe('2');
    expect(isbn10Check('080442957')).toBe('X');
    expect(ean13Check('978030640615')).toBe('7');
  });
});

describe('EAN-13 barcodes', () => {
  it('encodes and decodes, adding the check digit', () => {
    const bits = eanModules('400638133393');
    expect(bits).toHaveLength(95);
    expect(eanDecode(bits)).toBe('4006381333931');
    expect(eanDecode(bits.replace(/^101/, '111'))).toBeNull();
  });

  it('reads a drawn barcode from one row of pixels, either way round', () => {
    const bits = eanModules('9780306406157');
    const row: number[] = [...Array(20).fill(255)];
    for (const b of bits) row.push(...Array(3).fill(b === '1' ? 0 : 255));
    row.push(...Array(20).fill(255));
    expect(eanFromRow(row)).toBe('9780306406157');
    expect(eanFromRow([...row].reverse())).toBe('9780306406157');
  });
});
