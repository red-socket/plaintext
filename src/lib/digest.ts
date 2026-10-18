/**
 * Hashes (MD5, SHA-1, SHA-256) and check digits (ISBN-10, ISBN-13/EAN-13).
 */

const toHex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

/** MD5 (RFC 1321). Broken for security, still everywhere in puzzles. */
export function md5(input: string | Uint8Array): string {
  const msg = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0);
  const S = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
  const len = msg.length;
  const padded = new Uint8Array(((len + 8) >> 6) * 64 + 64);
  padded.set(msg);
  padded[len] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, (len * 8) >>> 0, true);
  dv.setUint32(padded.length - 4, Math.floor((len * 8) / 2 ** 32), true);
  let [a0, b0, c0, d0] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476];
  for (let off = 0; off < padded.length; off += 64) {
    const M = Array.from({ length: 16 }, (_, i) => dv.getUint32(off + i * 4, true));
    let [A, B, C, D] = [a0, b0, c0, d0];
    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) [F, g] = [(B & C) | (~B & D), i];
      else if (i < 32) [F, g] = [(D & B) | (~D & C), (5 * i + 1) % 16];
      else if (i < 48) [F, g] = [B ^ C ^ D, (3 * i + 5) % 16];
      else [F, g] = [C ^ (B | ~D), (7 * i) % 16];
      F = (F + A + K[i] + M[g]) >>> 0;
      A = D;
      D = C;
      C = B;
      B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }
  const out = new Uint8Array(16);
  const odv = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => odv.setUint32(i * 4, v, true));
  return toHex(out);
}

/** SHA-256, synchronous (FIPS 180-4). The build uses it to check hash puzzles; tools use Web Crypto. */
export function sha256(input: string): string {
  const msg = new TextEncoder().encode(input);
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const padded = new Uint8Array(((msg.length + 8) >> 6) * 64 + 64);
  padded.set(msg);
  padded[msg.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(padded.length - 8, Math.floor((msg.length * 8) / 2 ** 32));
  dv.setUint32(padded.length - 4, (msg.length * 8) >>> 0);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const W = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
      const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, h].forEach((v, i) => (H[i] = (H[i] + v) >>> 0));
  }
  return H.map((v) => v.toString(16).padStart(8, '0')).join('');
}

export async function sha(algorithm: 'SHA-1' | 'SHA-256', input: string): Promise<string> {
  return toHex(await crypto.subtle.digest(algorithm, new TextEncoder().encode(input)));
}

export async function allHashes(input: string): Promise<{ md5: string; sha1: string; sha256: string }> {
  return { md5: md5(input), sha1: await sha('SHA-1', input), sha256: await sha('SHA-256', input) };
}

/** Which hash a hex string probably is, by length. */
export function hashKind(hex: string): string | null {
  const h = hex.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(h)) return null;
  return { 32: 'MD5', 40: 'SHA-1', 64: 'SHA-256', 128: 'SHA-512' }[h.length] ?? null;
}

/** ISBN-10 check character for the first 9 digits: weights 10 down to 2, mod 11, 10 is X. */
export function isbn10Check(nine: string): string {
  const d = nine.replace(/\D/g, '');
  if (d.length !== 9) throw new Error('ISBN-10 needs 9 digits before the check digit');
  const sum = [...d].reduce((s, c, i) => s + Number(c) * (10 - i), 0);
  const c = (11 - (sum % 11)) % 11;
  return c === 10 ? 'X' : String(c);
}

/** ISBN-13 and EAN-13 check digit for the first 12 digits: weights 1 and 3, mod 10. */
export function ean13Check(twelve: string): string {
  const d = twelve.replace(/\D/g, '');
  if (d.length !== 12) throw new Error('EAN-13 needs 12 digits before the check digit');
  const sum = [...d].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}
