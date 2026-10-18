/**
 * EAN-13 barcodes: 13 digits as 95 black and white modules. The first digit isn't drawn; it's
 * encoded in which of two patterns (L or G) each of the next six digits uses.
 */
import { ean13Check } from './digest';

const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

/** The 95 modules ("1" is a black bar) for 12 or 13 digits. The check digit is added if missing. */
export function eanModules(digits: string): string {
  let d = digits.replace(/\D/g, '');
  if (d.length === 12) d += ean13Check(d);
  if (d.length !== 13) throw new Error('EAN-13 needs 12 or 13 digits');
  const parity = PARITY[Number(d[0])];
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (parity[i - 1] === 'L' ? L : G)[Number(d[i])];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[Number(d[i])];
  return bits + '101';
}

/** Reads 95 modules back to 13 digits, or null if the pattern isn't a valid EAN-13. */
export function eanDecode(bits: string): string | null {
  if (bits.length !== 95 || !bits.startsWith('101') || !bits.endsWith('101') || bits.slice(45, 50) !== '01010') return null;
  let parity = '';
  let left = '';
  for (let i = 0; i < 6; i++) {
    const code = bits.slice(3 + i * 7, 10 + i * 7);
    const l = L.indexOf(code);
    const g = G.indexOf(code);
    if (l >= 0) {
      left += l;
      parity += 'L';
    } else if (g >= 0) {
      left += g;
      parity += 'G';
    } else return null;
  }
  let right = '';
  for (let i = 0; i < 6; i++) {
    const r = R.indexOf(bits.slice(50 + i * 7, 57 + i * 7));
    if (r < 0) return null;
    right += r;
  }
  const first = PARITY.indexOf(parity);
  if (first < 0) return null;
  const all = `${first}${left}${right}`;
  return ean13Check(all.slice(0, 12)) === all[12] ? all : null;
}

/**
 * Reads a barcode from one row of brightness values (0 dark … 255 light): finds the bars,
 * measures the module width from the outer edges, and samples each module's centre.
 */
export function eanFromRow(row: ArrayLike<number>): string | null {
  const dark = (i: number) => row[i] < 128;
  let a = 0;
  while (a < row.length && !dark(a)) a++;
  let b = row.length - 1;
  while (b > a && !dark(b)) b--;
  if (b <= a) return null;
  const w = (b - a + 1) / 95;
  let bits = '';
  for (let m = 0; m < 95; m++) bits += dark(Math.floor(a + (m + 0.5) * w)) ? '1' : '0';
  return eanDecode(bits) ?? eanDecode([...bits].reverse().join(''));
}
