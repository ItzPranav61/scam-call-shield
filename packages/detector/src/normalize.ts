/** Preserve Indic vowel marks; punctuation separates tokens instead of joining words. */
export function normalizeText(text: string): string {
  return text.normalize('NFKC').toLowerCase()
    .replace(/don['’]t/gu, 'do not')
    .replace(/won['’]t/gu, 'will not')
    .replace(/[०-९]/gu, (digit) => String(digit.charCodeAt(0) - '०'.charCodeAt(0)))
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/gu, ' ').trim();
}

/** Normalize each clause before matching; keep sentence/contrast boundaries for negation. */
export function normalizedClauses(text: string): string[] {
  // Join spelled-out acronyms before splitting sentences at their punctuation.
  const acronyms = text.replace(/\bo[.\s]+t[.\s]+p\b\.?/giu, 'otp')
    .replace(/\bp[.\s]+i[.\s]+n\b\.?/giu, 'pin')
    .replace(/\bc[.\s]+v[.\s]+v\b\.?/giu, 'cvv')
    .replace(/ओ\s+टी\s+पी/gu, 'ओटीपी');
  return acronyms.split(/[.!?;,।\n]+|\b(?:but|lekin|and|aur)\b|(?:लेकिन|मगर|पण|और|आणि)/iu)
    .map(normalizeText).filter(Boolean);
}
