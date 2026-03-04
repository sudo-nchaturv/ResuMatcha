import { extractKeywords } from './keywordExtractor.js';

function findEmail(text = '') {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
}

export function parseResume(text = '') {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const name = lines[0] || '';
  const email = findEmail(text);
  const skills = extractKeywords(text, 40);

  return {
    name,
    email,
    raw_text: text,
    skills,
    candidate_summary: skills.slice(0, 8).join(', ')
  };
}
