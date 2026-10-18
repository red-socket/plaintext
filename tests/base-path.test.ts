import { describe, expect, it } from 'vitest';
import { basePath } from '../plugins/base-path.mjs';

type Node = { url: string };

function run(base: string, value: string) {
  const plugin = basePath(base);
  if (!plugin) return value;
  const node: Node = { url: value };
  plugin.link(node, { setProperty: (n: Node, k: 'url', v: string) => (n[k] = v) });
  return node.url;
}

describe('base path for content links', () => {
  it('is off at the domain root', () => {
    expect(basePath('/')).toBeNull();
  });
  it('prefixes root-relative links', () => {
    expect(run('/plaintext', '/field-guide#letters')).toBe('/plaintext/field-guide#letters');
    expect(run('/plaintext/', '/files/words.txt')).toBe('/plaintext/files/words.txt');
  });
  it('leaves other links alone', () => {
    expect(run('/plaintext', 'https://example.com/')).toBe('https://example.com/');
    expect(run('/plaintext', '//example.com/x')).toBe('//example.com/x');
    expect(run('/plaintext', '#step-2')).toBe('#step-2');
  });
});
