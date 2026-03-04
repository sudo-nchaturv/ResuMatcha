# ResuMatcha

ResumeMatcher is a Chrome Extension (Manifest V3) that:
- extracts job descriptions from the active tab,
- compares it against an uploaded CV,
- computes keyword match + ATS-style score,
- recommends missing keywords,
- generates a concise cover letter with Gemini or OpenAI-compatible APIs.

## Structure

- `manifest.json` — extension configuration.
- `contentScript.js` — JD extraction from page content.
- `background.js` — orchestration, storage, scoring, and LLM generation routing.
- `popup/` — extension popup UI.
- `settings/` — API provider settings page.
- `libs/` — parsers, keyword extraction, matching engine, and LLM client.

## Local usage

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this repository folder.
4. Open any job listing page and refresh once.
5. Open the extension popup, upload a `.txt` resume, and run analysis.
6. Open Settings and add API key/model to generate cover letters.

## Privacy notes

- All parsed content is stored only in `chrome.storage.local` by default.
- No backend is required in direct mode.
- API keys in direct mode are visible to the local browser profile; use proxy mode for stronger key isolation.
