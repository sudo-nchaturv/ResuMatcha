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
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 300 })
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

export async function generateCoverLetter(payload, settings) {
  const prompt = buildPrompt(payload);

  if (settings.provider === 'gemini') {
    return callGemini({ apiKey: settings.apiKey, model: settings.model || 'gemini-1.5-flash', prompt });
  }

  const endpoint = settings.endpoint || 'https://api.openrouter.ai/v1/chat/completions';
  return callOpenAICompatible({ endpoint, apiKey: settings.apiKey, model: settings.model || 'gpt-4o-mini', prompt });
}
