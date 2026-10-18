/**
 * Answer checking without a server, and without plaintext answers in the page.
 *
 * At build time every accepted answer (and every known partial answer) becomes an entry:
 *   h  = SHA-256("plaintext/check/<scope>/<answer>")    to find the entry
 *   ct = AES-GCM(payload, key = SHA-256("plaintext/key/<scope>/<answer>"))
 * The browser repeats the same steps with what the player typed. Only someone who
 * knows the answer can find the entry and decrypt its payload (the writeup or reply).
 *
 * Short answers can be brute-forced. That is acceptable: there is nothing to win.
 */
import { normalizeAnswer } from './normalize';

export type SealedEntry = { h: string; iv: string; ct: string };

export type Payload =
  /** `display` is the accepted answer as written by the author ("RED SANDS"), for showing back to the player. */
  | { type: 'solve'; writeup?: string; note?: string; display?: string }
  | { type: 'partial'; reply: string };

const enc = new TextEncoder();
const dec = new TextDecoder();

async function sha256(text: string): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

function toB64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function checkHash(scope: string, answer: string): Promise<string> {
  return toHex(await sha256(`plaintext/check/${scope}/${normalizeAnswer(answer)}`));
}

async function keyFor(scope: string, answer: string): Promise<CryptoKey> {
  const raw = await sha256(`plaintext/key/${scope}/${normalizeAnswer(answer)}`);
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function seal(scope: string, answer: string, payload: Payload): Promise<SealedEntry> {
  if (!normalizeAnswer(answer)) throw new Error(`Empty answer for ${scope}`);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = enc.encode(JSON.stringify(payload));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyFor(scope, answer), data));
  return { h: await checkHash(scope, answer), iv: toB64(iv), ct: toB64(ct) };
}

/** Seals several answers and sorts by hash, so the order gives nothing away. */
export async function sealAll(scope: string, items: { answer: string; payload: Payload }[]): Promise<SealedEntry[]> {
  const entries = await Promise.all(items.map((i) => seal(scope, i.answer, i.payload)));
  return entries.sort((a, b) => a.h.localeCompare(b.h));
}

/** Returns the payload if `answer` matches an entry, otherwise null. */
export async function open(scope: string, answer: string, entries: SealedEntry[]): Promise<Payload | null> {
  if (!normalizeAnswer(answer)) return null;
  const h = await checkHash(scope, answer);
  const entry = entries.find((e) => e.h === h);
  if (!entry) return null;
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromB64(entry.iv) },
    await keyFor(scope, answer),
    fromB64(entry.ct),
  );
  return JSON.parse(dec.decode(plain)) as Payload;
}
