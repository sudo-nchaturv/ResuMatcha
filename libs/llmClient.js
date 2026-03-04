function buildPrompt({ jobTitle, company, jdText, candidateSummary }) {
  const bullets = jdText.split(/[\n.]/).map((s) => s.trim()).filter(Boolean).slice(0, 4).join('; ');
  return `You are a professional job-application writer. Given the job title, job description, and the candidate's parsed CV, write a concise 3-5 sentence cover letter tailored to the role. Be authentic, use first person, mention 2-3 relevant skills/experiences that match the JD, and end with a one-line call-to-action. Use plain language; no fluff.\n\nJob Title: ${jobTitle}\nCompany: ${company}\nTop JD bullets: ${bullets}\nCandidate highlights: ${candidateSummary}\nTone: professional, direct, concise\nMax sentences: 5`;
}

async function callOpenAICompatible({ endpoint, apiKey, model, prompt }) {
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 600 })
  });

  if (!resp.ok) throw new Error(`LLM request failed: ${resp.status}`);
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || 'No response generated.';
}

async function callGemini({ apiKey, model, prompt }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!resp.ok) throw new Error(`Gemini request failed: ${resp.status}`);
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response generated.';
}

async function callLLM(prompt, settings) {
  if (settings.provider === 'gemini') {
    return callGemini({ apiKey: settings.apiKey, model: settings.model || 'gemini-1.5-flash', prompt });
  }
  const endpoint = settings.endpoint || 'https://api.openrouter.ai/v1/chat/completions';
  return callOpenAICompatible({ endpoint, apiKey: settings.apiKey, model: settings.model || 'gpt-4o-mini', prompt });
}

export async function generateCoverLetter(payload, settings) {
  return callLLM(buildPrompt(payload), settings);
}

export async function analyzeJobMatch(jdText, cvText, settings) {
  const prompt = `You are a career coach and ATS expert. Analyze the match between the job description and the candidate's CV.

Return ONLY a valid JSON object (no markdown fences, no extra text) with exactly this structure:
{
  "jobTitle": "extracted job title",
  "company": "extracted company name",
  "ats_score": 72,
  "keyword_pct": 65,
  "matched_keywords": ["python", "machine learning"],
  "missing_keywords": ["kubernetes", "aws", "docker"],
  "match_summary": "Honest 1-2 sentence assessment of the fit."
}

Rules:
- ats_score: integer 0-100 (holistic fit considering skills, experience, and format)
- keyword_pct: integer 0-100 (% of key JD requirements found in the CV)
- missing_keywords: 8-15 important skills/keywords from JD absent from CV, ordered by importance
- matched_keywords: up to 10 skills/keywords found in both JD and CV
- match_summary: 1-2 honest sentences

--- JOB DESCRIPTION ---
${jdText.slice(0, 4000)}

--- CV / RESUME ---
${cvText.slice(0, 3000)}`;

  const raw = await callLLM(prompt, settings);
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('LLM returned unexpected format — try again.');
  return JSON.parse(m[0]);
}

export async function extractJobMeta(jdText, settings) {
  if (!settings?.apiKey || settings.mode === 'proxy') return { jobTitle: '', company: '' };
  const prompt = `Extract the job title and company name from the following job description. Reply ONLY with a JSON object in this exact format, no markdown, no extra text:
{"jobTitle": "...", "company": "..."}

Job description:
${jdText.slice(0, 3000)}`;
  try {
    const raw = await callLLM(prompt, settings);
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch (_) { /* silent fallback */ }
  return { jobTitle: '', company: '' };
}
