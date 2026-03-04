(() => {
  const SELECTORS = [
    '[data-testid*="job" i]',
    '#jobDescriptionText',
    '.job-description',
    '.jobDescription',
    '[class*="job-description"]',
    'article',
    'main'
  ];

  function cleanText(text) {
    return text.replace(/\s+/g, ' ').trim();
  }

  function extractJobDescription() {
    for (const selector of SELECTORS) {
      const candidates = Array.from(document.querySelectorAll(selector));
      const best = candidates
        .map((el) => cleanText(el.innerText || ''))
        .find((txt) => txt.length > 250);

      if (best) {
        return best.slice(0, 30000);
      }
    }

    const selection = cleanText(window.getSelection()?.toString() || '');
    if (selection.length > 120) {
      return selection.slice(0, 30000);
    }

    return cleanText(document.body?.innerText || '').slice(0, 30000);
  }

  const text = extractJobDescription();
  chrome.runtime.sendMessage({ type: 'JD_EXTRACTED', text, sourceUrl: location.href });
})();
