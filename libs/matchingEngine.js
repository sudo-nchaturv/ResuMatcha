import { extractKeywords } from './keywordExtractor.js';

const SYNONYMS = new Map([
  ['product manager', ['product management']],
  ['a/b testing', ['experimentation', 'experiments']],
  ['crm', ['customer relationship management']]
]);

function expandKeyword(keyword) {
  const set = new Set([keyword]);
  if (SYNONYMS.has(keyword)) {
    SYNONYMS.get(keyword).forEach((v) => set.add(v));
  }
  return set;
}

export function estimateYears(text = '') {
  const matches = [...text.toLowerCase().matchAll(/(\d+)\+?\s*(years?|yrs?)/g)];
  if (!matches.length) return null;
  return Math.max(...matches.map((m) => Number(m[1])));
}

export function formatQuality(cvText = '') {
  const lc = cvText.toLowerCase();
  const hasSkills = lc.includes('skills');
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/.test(lc);
  const hasBullets = /(^|\n)\s*[•\-*]/.test(cvText);
  return [hasSkills, hasEmail, hasBullets].filter(Boolean).length / 3;
}

export function computeScores(jdText = '', cvText = '') {
  const jdKeywords = extractKeywords(jdText, 35);
  const cvKeywords = new Set(extractKeywords(cvText, 60));

  const matched = [];
  for (const kw of jdKeywords) {
    const candidates = expandKeyword(kw);
    if ([...candidates].some((candidate) => cvKeywords.has(candidate))) {
      matched.push(kw);
    }
  }

  const requiredCount = Math.max(jdKeywords.length, 1);
  const matchedCount = matched.length;
  const keywordPct = matchedCount / requiredCount;

  const jdYears = estimateYears(jdText);
  const cvYears = estimateYears(cvText);
  const expScore = jdYears && cvYears ? Math.min(1, cvYears / jdYears) : 0;
  const atsScore = (0.7 * keywordPct + 0.2 * expScore + 0.1 * formatQuality(cvText)) * 100;

  const missing = jdKeywords.filter((kw) => !matched.includes(kw));

  return {
    keyword_pct: Math.round(keywordPct * 100),
    ats_score: Math.round(atsScore),
    matched,
    missing,
    jd_keywords: jdKeywords
  };
}
