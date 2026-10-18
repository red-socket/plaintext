/**
 * Site-relative links. The site can be served from a subpath (GitHub Pages serves it under /plaintext),
 * so every internal link and file goes through here instead of starting with a bare "/".
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/**
 * `url('/learn/caesar')` → `/plaintext/learn/caesar` when the site lives under /plaintext.
 * Paths that already carry the base are left alone, so tools can pass any `file` prop through it.
 */
export function url(path: string): string {
  if (base && (path === base || path.startsWith(`${base}/`))) return path;
  return base + (path.startsWith('/') ? path : `/${path}`);
}

/** The current path without the base, for working out which section a page belongs to. */
export function stripBase(pathname: string): string {
  return base && pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname;
}
