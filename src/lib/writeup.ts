/**
 * Writeups are decrypted in the browser, so they can't go through the Markdown pipeline.
 * Supported: blank-line paragraphs and `code`. Everything else is escaped.
 */
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function renderWriteup(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => `<p>${escape(para.trim()).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`)
    .join('');
}
