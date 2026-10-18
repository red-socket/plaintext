/**
 * Writeups are decrypted in the browser, so they can't go through the Markdown pipeline.
 * Supported: blank-line paragraphs and `code`. Everything else is escaped. Straight quotes become
 * curly ones (outside code), to match the rest of the site.
 */
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function smartQuotes(text: string): string {
  return text
    .replace(/(^|[\s([{—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/(\w)'(\w)/g, '$1’$2')
    .replace(/(^|[\s([{—–-])'/g, '$1‘')
    .replace(/'/g, '’');
}

export function renderWriteup(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      // Odd pieces are inside backticks: leave those exactly as written.
      const html = para
        .trim()
        .split('`')
        .map((piece, i) => (i % 2 ? `<code>${escape(piece)}</code>` : escape(smartQuotes(piece))))
        .join('');
      return `<p>${html}</p>`;
    })
    .join('');
}
