// ── Element refs ─────────────────────────────────────────────────────────────
const settingsScreen = document.getElementById('settingsScreen');
const mainScreen = document.getElementById('mainScreen');
const resultsScreen = document.getElementById('resultsScreen');

// Settings
const sProvider = document.getElementById('s-provider');
const sModel = document.getElementById('s-model');
const sApiKey = document.getElementById('s-apiKey');
const sEndpoint = document.getElementById('s-endpoint');
const sEndpointRow = document.getElementById('s-endpointRow');
const sSaveBtn = document.getElementById('s-saveBtn');
const sStatus = document.getElementById('s-status');

// Main
const mainSettingsBtn = document.getElementById('mainSettingsBtn');
const cvInput = document.getElementById('cvInput');
const cvStatus = document.getElementById('cvStatus');
const currentUrl = document.getElementById('currentUrl');
const extractBtn = document.getElementById('extractBtn');
const extractStatus = document.getElementById('extractStatus');

// Results
const backBtn = document.getElementById('backBtn');
const resSettingsBtn = document.getElementById('resSettingsBtn');
const resJobTitle = document.getElementById('resJobTitle');
const resCompany = document.getElementById('resCompany');
const resUrl = document.getElementById('resUrl');
const atsVal = document.getElementById('atsVal');
const kwVal = document.getElementById('kwVal');
const matchSummary = document.getElementById('matchSummary');
const kwChips = document.getElementById('kwChips');
const coverBtn = document.getElementById('coverBtn');
const coverSection = document.getElementById('coverSection');
const letter = document.getElementById('letter');
const copyBtn = document.getElementById('copyBtn');
const coverStatus = document.getElementById('coverStatus');

// ── State ─────────────────────────────────────────────────────────────────────
let cvText = '';
let cvName = '';
let currentTab = null;

// ── Screen helpers ────────────────────────────────────────────────────────────
function show(screen) {
  [settingsScreen, mainScreen, resultsScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function setMsg(el, text, type = 'inf') {
  el.textContent = text;
  el.className = `msg ${type}`;
}

// ── Settings UI ───────────────────────────────────────────────────────────────
const DEFAULT_MODELS = { gemini: 'gemini-1.5-flash', openrouter: 'gpt-4o-mini' };
const DEFAULT_ENDPOINTS = { openrouter: 'https://api.openrouter.ai/v1/chat/completions' };

function syncSettingsUI() {
  const isGemini = sProvider.value === 'gemini';
  sEndpointRow.style.display = isGemini ? 'none' : 'block';
  if (!isGemini && (!sEndpoint.value || sEndpoint.value.includes('generativelanguage'))) {
    sEndpoint.value = DEFAULT_ENDPOINTS.openrouter;
  }
}

function loadSettingsIntoForm(s = {}) {
  sProvider.value = s.provider || 'gemini';
  sModel.value = s.model || DEFAULT_MODELS[sProvider.value];
  sApiKey.value = s.apiKey || '';
  if (s.provider !== 'gemini') sEndpoint.value = s.endpoint || DEFAULT_ENDPOINTS.openrouter;
  syncSettingsUI();
  setMsg(sStatus, '');
}

sProvider.addEventListener('change', () => {
  const p = sProvider.value;
  syncSettingsUI();
  if (!sModel.value || Object.values(DEFAULT_MODELS).includes(sModel.value)) {
    sModel.value = DEFAULT_MODELS[p] || '';
  }
});

async function testApiKey(provider, endpoint, model, apiKey) {
  const body = 'Say "ok" in one word.';
  if (provider === 'gemini') {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: body }] }] })
      }
    );
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${r.status}`); }
  } else {
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: body }], max_tokens: 5 })
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${r.status}`); }
  }
}

sSaveBtn.addEventListener('click', async () => {
  const provider = sProvider.value;
  const model = sModel.value.trim();
  const apiKey = sApiKey.value.trim();
  const endpoint = sEndpoint.value.trim() || DEFAULT_ENDPOINTS.openrouter;

  if (!apiKey) { setMsg(sStatus, '✗ API key is required.', 'err'); return; }

  sSaveBtn.disabled = true;
  setMsg(sStatus, 'Verifying…', 'inf');

  try {
    await testApiKey(provider, endpoint, model, apiKey);
    await chrome.storage.local.set({
      settings: { provider, model, apiKey, endpoint: provider === 'gemini' ? '' : endpoint, mode: 'direct' }
    });
    setMsg(sStatus, '✓ Verified & saved!', 'ok');
    setTimeout(async () => { await initMain(); show(mainScreen); }, 700);
  } catch (err) {
    setMsg(sStatus, `✗ ${err.message}`, 'err');
  } finally {
    sSaveBtn.disabled = false;
  }
});

// ── Main screen ───────────────────────────────────────────────────────────────
async function initMain() {
  // Load persisted CV
  const store = await chrome.storage.local.get(['savedCvText', 'savedCvName']);
  if (store.savedCvText) {
    cvText = store.savedCvText;
    cvName = store.savedCvName || 'your CV';
    cvStatus.textContent = `✓ ${cvName}`;
    cvStatus.className = 'small ok';
  } else {
    cvStatus.textContent = 'No CV uploaded yet';
    cvStatus.className = 'muted small';
  }

  // Get current tab URL
  try {
    [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentUrl.textContent = currentTab?.url || '—';
  } catch (_) {
    currentUrl.textContent = '—';
  }

  updateExtractBtn();
  setMsg(extractStatus, '');
}

function updateExtractBtn() {
  extractBtn.disabled = !cvText || !currentTab?.url;
}

cvInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  cvText = await file.text();
  cvName = file.name;
  cvStatus.textContent = `✓ ${cvName}`;
  cvStatus.className = 'small ok';
  await chrome.storage.local.set({ savedCvText: cvText, savedCvName: cvName });
  updateExtractBtn();
});

extractBtn.addEventListener('click', async () => {
  if (!cvText || !currentTab) return;

  extractBtn.disabled = true;
  setMsg(extractStatus, 'Extracting page content…', 'inf');

  // Extract JD text from the current page
  let jdText = '';
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        const SELECTORS = [
          '[data-testid*="job" i]', '#jobDescriptionText',
          '.job-description', '.jobDescription', '[class*="job-description"]',
          'article', 'main'
        ];
        const clean = t => t.replace(/\s+/g, ' ').trim();
        for (const sel of SELECTORS) {
          const candidates = Array.from(document.querySelectorAll(sel));
          const best = candidates.map(el => clean(el.innerText || '')).find(t => t.length > 250);
          if (best) return best.slice(0, 30000);
        }
        return clean(document.body?.innerText || '').slice(0, 30000);
      }
    });
    jdText = result.result;
  } catch (e) {
    setMsg(extractStatus, '✗ Cannot read this page. Try a job listing page.', 'err');
    extractBtn.disabled = false;
    return;
  }

  if (!jdText || jdText.length < 80) {
    setMsg(extractStatus, '✗ Page content too short — are you on a job listing?', 'err');
    extractBtn.disabled = false;
    return;
  }

  setMsg(extractStatus, '⏳ Analyzing with AI… this takes a few seconds.', 'inf');

  chrome.runtime.sendMessage(
    { type: 'ANALYZE_JD', jdText, cvText, sourceUrl: currentTab.url },
    (response) => {
      extractBtn.disabled = false;
      if (!response?.ok) {
        setMsg(extractStatus, `✗ ${response?.error || 'Analysis failed.'}`, 'err');
        return;
      }
      setMsg(extractStatus, '');
      renderResults(response.analysis, currentTab.url);
      show(resultsScreen);
    }
  );
});

// ── Results screen ────────────────────────────────────────────────────────────
function renderResults(a, url) {
  resJobTitle.textContent = a.jobTitle || 'Unknown Role';
  resCompany.textContent = a.company || '';
  resUrl.textContent = url || '';
  atsVal.textContent = a.ats_score != null ? `${a.ats_score}%` : '—';
  kwVal.textContent = a.keyword_pct != null ? `${a.keyword_pct}%` : '—';
  matchSummary.textContent = a.match_summary || '';

  kwChips.innerHTML = '';
  (a.missing_keywords || []).forEach(kw => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = kw;
    kwChips.appendChild(chip);
  });

  coverSection.classList.add('hidden');
  letter.value = '';
  setMsg(coverStatus, '');
}

coverBtn.addEventListener('click', () => {
  coverBtn.disabled = true;
  coverBtn.textContent = '⏳ Generating…';
  setMsg(coverStatus, '');
  chrome.runtime.sendMessage(
    {
      type: 'GENERATE_COVER_LETTER',
      jobTitle: resJobTitle.textContent,
      company: resCompany.textContent,
      cvText
    },
    (response) => {
      coverBtn.disabled = false;
      coverBtn.textContent = '✉ Generate Cover Letter';
      if (!response?.ok) {
        setMsg(coverStatus, `✗ ${response?.error || 'Failed.'}`, 'err');
        return;
      }
      letter.value = response.letter;
      coverSection.classList.remove('hidden');
    }
  );
});

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(letter.value || '');
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy'; }, 800);
});

backBtn.addEventListener('click', async () => { await initMain(); show(mainScreen); });

// ── Settings buttons ──────────────────────────────────────────────────────────
async function openSettings() {
  const store = await chrome.storage.local.get(['settings']);
  loadSettingsIntoForm(store.settings || {});
  show(settingsScreen);
}
mainSettingsBtn.addEventListener('click', openSettings);
resSettingsBtn.addEventListener('click', openSettings);

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  const store = await chrome.storage.local.get(['settings']);
  const s = store.settings || {};
  loadSettingsIntoForm(s);

  if (s.apiKey) {
    await initMain();
    show(mainScreen);
  } else {
    show(settingsScreen);
  }
}

bootstrap();
