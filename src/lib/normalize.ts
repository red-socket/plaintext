/**
 * Canonical form for comparing answers: accents removed, uppercase, only A–Z and 0–9.
 * "Lighthouse keeper!" and "LIGHTHOUSEKEEPER" are the same answer.
 */
export function normalizeAnswer(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}
