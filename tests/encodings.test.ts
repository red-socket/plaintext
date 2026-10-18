import { describe, expect, it } from 'vitest';
import {
  a1z26Decode,
  a1z26Encode,
  asciiDecode,
  asciiEncode,
  base32Decode,
  base32Encode,
  base64Decode,
  base64Encode,
  binaryDecode,
  binaryEncode,
  hexDecode,
  hexEncode,
  keypadDecode,
  keypadEncode,
  morseDecode,
  morseEncode,
} from '../src/lib/encodings';
import { applySteps } from '../src/lib/steps';

describe('A1Z26', () => {
  it('encodes and decodes, keeping word breaks', () => {
    expect(a1z26Encode('Hello world')).toBe('8-5-12-12-15 23-15-18-12-4');
    expect(a1z26Decode('8-5-12-12-15 23-15-18-12-4')).toBe('HELLO WORLD');
  });
  it('supports counting from zero', () => {
    expect(a1z26Encode('ABZ', 0)).toBe('0-1-25');
    expect(a1z26Decode('0-1-25', 0)).toBe('ABZ');
  });
  it('marks numbers out of range', () => {
    expect(a1z26Decode('8 27 5')).toBe('H ? E');
  });
});

describe('phone keypad', () => {
  it('matches the Field Guide example', () => {
    expect(keypadEncode('HELLO')).toBe('44 33 555 555 666');
  });
  it('round-trips with spaces as 0', () => {
    expect(keypadEncode('Call me')).toBe('222 2 555 555 0 6 33');
    expect(keypadDecode('222 2 555 555 0 6 33')).toBe('CALL ME');
  });
  it('handles four-letter keys and bad tokens', () => {
    expect(keypadEncode('SZ')).toBe('7777 9999');
    expect(keypadDecode('7777 9999 1 23')).toBe('SZ??');
  });
});

describe('Morse', () => {
  it('matches the Field Guide example', () => {
    expect(morseEncode('hello')).toBe('.... . .-.. .-.. ---');
  });
  it('round-trips words and digits', () => {
    const m = morseEncode('SOS 911');
    expect(m).toBe('... --- ... / ----. .---- .----');
    expect(morseDecode(m)).toBe('SOS 911');
  });
  it('accepts look-alike symbols and marks unknown codes', () => {
    expect(morseDecode('·— —··· | ........')).toBe('AB ?');
  });
});

describe('bytes', () => {
  it('binary', () => {
    expect(binaryEncode('Hi')).toBe('01001000 01101001');
    expect(binaryDecode('0100100001101001')).toBe('Hi');
    expect(binaryDecode('01001000 0110')).toBe('H?');
  });
  it('ASCII decimal', () => {
    expect(asciiEncode('Hello')).toBe('72 101 108 108 111');
    expect(asciiDecode('72,101 108-108 111')).toBe('Hello');
  });
  it('hex', () => {
    expect(hexEncode('Hello')).toBe('48 65 6C 6C 6F');
    expect(hexDecode('0x48 0x65 6c6c6f')).toBe('Hello');
  });
});

describe('Base64 and Base32', () => {
  it('Base64 matches standard output, tolerant on input', () => {
    expect(base64Encode('Hello world')).toBe('SGVsbG8gd29ybGQ=');
    expect(base64Decode(' SGVsbG8g\nd29ybGQ ')).toBe('Hello world');
    expect(base64Encode('café')).toBe('Y2Fmw6k=');
    expect(base64Decode('Y2Fmw6k')).toBe('café');
  });
  it('Base64 rejects junk with a readable message', () => {
    expect(() => base64Decode('not base64!')).toThrow(/only A–Z/);
  });
  it('Base32', () => {
    expect(base32Encode('Hello!')).toBe('JBSWY3DPEE======');
    expect(base32Decode('jbswy3dpee======')).toBe('Hello!');
    expect(() => base32Decode('JBSW1')).toThrow(/2–7/);
  });
});

describe('applySteps', () => {
  it('chains steps in order', () => {
    expect(applySteps('HI', [{ type: 'binary' }, { type: 'map', map: { '0': '□', '1': '■' } }])).toBe('□■□□■□□□ □■□□■□□■');
    expect(applySteps('SOS', [{ type: 'morse' }, { type: 'reverse' }])).toBe('... --- ...');
    expect(applySteps('OWL', [{ type: 'caesar', shift: 13 }, { type: 'hex' }, { type: 'base64' }])).toBe(base64Encode(hexEncode('BJY')));
  });
});
