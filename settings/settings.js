// settings.js — external script for settings.html (required by Chrome MV3 CSP)

const provider = document.getElementById('provider');
const mode = document.getElementById('mode');
const endpointRow = document.getElementById('endpointRow');
const endpoint = document.getElementById('endpoint');
const model = document.getElementById('model');
const apiKey = document.getElementById('apiKey');
const status = document.getElementById('status');

const ENDPOINTS = {
    gemini: '',
    openrouter: 'https://api.openrouter.ai/v1/chat/completions'
};
const DEFAULT_MODELS = {
    gemini: 'gemini-1.5-flash',
    openrouter: 'gpt-4o-mini'
};

function syncEndpointUI() {
    const isGemini = provider.value === 'gemini';
    endpointRow.style.display = isGemini ? 'none' : 'block';
    if (!isGemini && (!endpoint.value || endpoint.value.startsWith('https://generativelanguage'))) {
        endpoint.value = ENDPOINTS.openrouter;
    }
}

provider.addEventListener('change', () => {
    const p = provider.value;
    if (!model.value || model.value === DEFAULT_MODELS.gemini || model.value === DEFAULT_MODELS.openrouter) {
        model.value = DEFAULT_MODELS[p] || '';
    }
    syncEndpointUI();
});

// Load saved settings
const store = await chrome.storage.local.get(['settings']);
const s = store.settings || {};
provider.value = s.provider || 'gemini';
mode.value = s.mode || 'direct';
model.value = s.model || DEFAULT_MODELS[provider.value];
apiKey.value = s.apiKey || '';
if (s.provider !== 'gemini') {
    endpoint.value = s.endpoint || ENDPOINTS.openrouter;
}
syncEndpointUI();

async function testApiKey(providerVal, endpointVal, modelVal, apiKeyVal) {
    const testPrompt = 'Say "ok" in one word.';
    if (providerVal === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelVal}:generateContent?key=${apiKeyVal}`;
        const resp = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }] })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err?.error?.message || `API error: ${resp.status}`);
        }
    } else {
        const resp = await fetch(endpointVal, {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKeyVal}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: modelVal, messages: [{ role: 'user', content: testPrompt }], max_tokens: 5 })
        });
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err?.error?.message || `API error: ${resp.status}`);
        }
    }
}

document.getElementById('save').addEventListener('click', async () => {
    const btn = document.getElementById('save');
    const savedEndpoint = provider.value === 'gemini' ? '' : endpoint.value;

    btn.disabled = true;
    status.style.color = '#94a3b8';
    status.textContent = 'Verifying API key…';

    try {
        if (apiKey.value) {
            await testApiKey(provider.value, savedEndpoint || ENDPOINTS.openrouter, model.value, apiKey.value);
        }
        await chrome.storage.local.set({
            settings: {
                provider: provider.value,
                mode: mode.value,
                endpoint: savedEndpoint,
                model: model.value,
                apiKey: apiKey.value
            }
        });
        status.style.color = '#22c55e';
        status.textContent = '✓ Settings saved and API key verified.';
    } catch (err) {
        status.style.color = '#ef4444';
        status.textContent = `✗ ${err.message}`;
    } finally {
        btn.disabled = false;
    }
});
