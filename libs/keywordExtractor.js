import { tokenize, unique, countOccurrences } from './textUtils.js';

const SKILL_PATTERNS = [
  /\b(product management|roadmap|experiments?|a\/b testing|analytics|sql|python|javascript|react|node|crm|saas|b2b|agile|stakeholder management)\b/g,
  /\b\d+\+?\s*(years?|yrs?)\b/g
];

export function extractKeywords(rawText = '', maxKeywords = 30) {
  const tokens = tokenize(rawText);
  const freq = countOccurrences(tokens);
  const frequent = Object.entries(freq)
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);

  const patternMatches = [];
  const lc = rawText.toLowerCase();
  for (const pattern of SKILL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of lc.matchAll(pattern)) {
      patternMatches.push(match[0]);
    }
  }

  return unique([...patternMatches, ...frequent]).slice(0, maxKeywords);
}
