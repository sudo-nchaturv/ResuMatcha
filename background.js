import { computeScores } from './libs/matchingEngine.js';
import { parseResume } from './libs/resumeParser.js';
import { generateCoverLetter } from './libs/llmClient.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    settings: {
      provider: 'openrouter',
      endpoint: 'https://api.openrouter.ai/v1/chat/completions',
      model: 'gpt-4o-mini',
      mode: 'direct',
      apiKey: ''
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'JD_EXTRACTED') {
    chrome.storage.local.set({ lastJD: message.text, lastJDUrl: message.sourceUrl, lastUpdatedAt: Date.now() });
    sendResponse({ ok: true });
    return false;
  }

  if (message.type === 'ANALYZE_RESUME') {
    (async () => {
      const parsedResume = parseResume(message.cvText || '');
      const scores = computeScores(message.jdText || '', message.cvText || '');
      await chrome.storage.local.set({ lastResume: parsedResume, lastScores: scores });
      sendResponse({ ok: true, parsedResume, scores });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === 'GENERATE_COVER_LETTER') {
    (async () => {
      const store = await chrome.storage.local.get(['settings', 'lastJD', 'lastResume']);
      const settings = store.settings || {};
      if (!settings.apiKey && settings.mode !== 'proxy') {
        throw new Error('Missing API key. Add one in Settings.');
      }

      const letter = await generateCoverLetter({
        jobTitle: message.jobTitle || 'Role',
        company: message.company || 'Company',
        jdText: store.lastJD || '',
        candidateSummary: store.lastResume?.candidate_summary || ''
      }, settings);

      await chrome.storage.local.set({ lastCoverLetter: letter });
      sendResponse({ ok: true, letter });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
