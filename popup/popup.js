let cvText = '';
let jdText = '';

const jdStatus = document.getElementById('jdStatus');
const cvInput = document.getElementById('cvInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const coverBtn = document.getElementById('coverBtn');
const scoreLine = document.getElementById('scoreLine');
const missingList = document.getElementById('missingList');
const letterArea = document.getElementById('letter');
const copyBtn = document.getElementById('copyBtn');

async function getStore() {
  return chrome.storage.local.get(['lastJD', 'lastScores', 'lastCoverLetter']);
}

async function bootstrap() {
  const store = await getStore();
  jdText = store.lastJD || '';
  jdStatus.textContent = jdText ? `JD extracted (${jdText.length} chars)` : 'No JD found yet. Reload job tab.';

  if (store.lastScores) {
    renderScores(store.lastScores);
  }

  if (store.lastCoverLetter) {
    letterArea.value = store.lastCoverLetter;
  }
}

function renderScores(scores) {
  scoreLine.textContent = `Keyword Match: ${scores.keyword_pct}% | ATS Score: ${scores.ats_score}%`;
  missingList.innerHTML = '';
  scores.missing.slice(0, 15).forEach((kw) => {
    const li = document.createElement('li');
    li.textContent = kw;
    missingList.appendChild(li);
  });
}

cvInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  cvText = await file.text();
});

analyzeBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'ANALYZE_RESUME', cvText, jdText }, (response) => {
    if (!response?.ok) {
      scoreLine.textContent = response?.error || 'Failed to analyze resume.';
      return;
    }
    renderScores(response.scores);
  });
});

coverBtn.addEventListener('click', () => {
  const jobTitle = document.getElementById('jobTitle').value;
  const company = document.getElementById('company').value;
  chrome.runtime.sendMessage({ type: 'GENERATE_COVER_LETTER', jobTitle, company }, (response) => {
    letterArea.value = response?.ok ? response.letter : `Error: ${response?.error || 'Failed to generate letter'}`;
  });
});

copyBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(letterArea.value || '');
  copyBtn.textContent = 'Copied!';
  setTimeout(() => { copyBtn.textContent = 'Copy'; }, 800);
});

bootstrap();
