import { computeScores } from './libs/matchingEngine.js';
import { parseResume } from './libs/resumeParser.js';
import { generateCoverLetter, analyzeJobMatch } from './libs/llmClient.js';

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(['settings']);
  if (!existing.settings) {
    chrome.storage.local.set({
      settings: {
        provider: 'gemini',
        endpoint: '',
        model: 'gemini-1.5-flash',
        mode: 'direct',
        apiKey: ''
      }
    });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ANALYZE_JD') {
    (async () => {
      const store = await chrome.storage.local.get(['settings']);
      const settings = store.settings || {};
      if (!settings.apiKey && settings.mode !== 'proxy') {
        throw new Error('Missing API key. Configure in Settings.');
      }
      const analysis = await analyzeJobMatch(message.jdText, message.cvText, settings);
      await chrome.storage.local.set({
        lastAnalysis: analysis,
        lastJD: message.jdText,
        lastJDUrl: message.sourceUrl
      });
      sendResponse({ ok: true, analysis });
    })().catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (message.type === 'GENERATE_COVER_LETTER') {
    (async () => {
      const store = await chrome.storage.local.get(['settings', 'lastJD', 'lastAnalysis']);
      const settings = store.settings || {};
      if (!settings.apiKey && settings.mode !== 'proxy') {
        throw new Error('Missing API key. Add one in Settings.');
      }
      const analysis = store.lastAnalysis || {};
      const letter = await generateCoverLetter({
        jobTitle: message.jobTitle || analysis.jobTitle || 'Role',
        company: message.company || analysis.company || 'Company',
        jdText: store.lastJD || '',
        candidateSummary: message.cvText ? message.cvText.slice(0, 1000) : ''
      }, settings);
      await chrome.storage.local.set({ lastCoverLetter: letter });
      sendResponse({ ok: true, letter });
    })().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});
