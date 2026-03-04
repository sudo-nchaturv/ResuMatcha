import assert from 'node:assert/strict';
import { computeScores } from '../libs/matchingEngine.js';

const jd = `AI Product Manager required skills: product management, analytics, CRM, A/B testing. 3 years experience required.`;
const cv = `Naman\nnaman@example.com\nSkills: product management, analytics, experimentation, customer relationship management\n- Led growth roadmap for 4 years.`;

const result = computeScores(jd, cv);

assert.ok(result.keyword_pct >= 20, 'Keyword match should be non-trivial');
assert.ok(result.ats_score > 0, 'ATS score should be positive');
assert.ok(Array.isArray(result.missing), 'Missing keywords should be present');

console.log('matchingEngine.test passed', result);
