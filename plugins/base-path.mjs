/**
 * Lets lessons and puzzles keep writing site links as "/field-guide#letters" or file="/files/x.png".
 * When the site is built under a base path (GitHub Pages serves it under /plaintext), this Sätteri
 * plugin prefixes root-relative Markdown links. Sätteri can't edit JSX attributes, so tools prefix
 * their own `file` props with `url()` from src/lib/url.ts.
 */
export function basePath(base) {
  const prefix = base.replace(/\/$/, '');
  if (!prefix) return null;
  const rooted = (v) => typeof v === 'string' && v.startsWith('/') && !v.startsWith('//');
  const url = (node, ctx) => {
    if (rooted(node.url)) ctx.setProperty(node, 'url', prefix + node.url);
  };
  return { name: 'base-path', link: url, image: url, definition: url };
}
