let OLLAMA_BASE_URL = 'http://localhost:11434';
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';

// UI Elements
const idleView = document.getElementById('idle-view');
const idleText = document.getElementById('idle-text');
const loadingView = document.getElementById('loading-view');
const resultView = document.getElementById('result-view');
const settingsView = document.getElementById('settings-view');
const helpView = document.getElementById('help-view');
const loadingText = document.getElementById('loading-text');
const resultText = document.getElementById('result-text');
const recommendationBadge = document.getElementById('recommendation-badge');
const confidenceText = document.getElementById('confidence-text');
const keySignals = document.getElementById('key-signals');
const corsNotice = document.getElementById('cors-notice');
const nvidiaKeyInput = document.getElementById('nvidia-key');
const cloudConsentCheckbox = document.getElementById('cloud-consent');
const trialBadge = document.getElementById('trial-badge');

const ollamaUrlInput = document.getElementById('ollama-url');
const customOllamaModelInput = document.getElementById('custom-ollama-model');
const customOllamaTextModelInput = document.getElementById('custom-ollama-text-model');
const customNvidiaModelInput = document.getElementById('custom-nvidia-model');
const languageSelect = document.getElementById('language-select');
const speechLanguageSelect = document.getElementById('speech-language-select');
const specificInstructionsInput = document.getElementById('specific-instructions');
const instructionsContainer = document.getElementById('instructions-container');
const disclaimerBar = document.getElementById('disclaimer-bar');
const screenCtxBadge = document.getElementById('screen-ctx-badge');

const captureFullBtn = document.getElementById('capture-full-btn');
const captureRegionBtn = document.getElementById('capture-region-btn');
const settingsBtn = document.getElementById('settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const helpBtn = document.getElementById('help-btn');
const closeHelpBtn = document.getElementById('close-help-btn');

// Ask bar
const micBtn = document.getElementById('mic-btn');
const askInput = document.getElementById('ask-input');
const askSendBtn = document.getElementById('ask-send-btn');
const transcriptStrip = document.getElementById('transcript-strip');

// State
let isAnalyzing = false;
let nvidiaApiKey = '';
let selectedMode = 'indicator';
let lastScreenContext = '';   // from last vision analysis
let isRecording = false;

// ── Model detection helpers ─────────────────────────────────────────────────

function getSelectedProvider() {
  const val = document.getElementById('model-select').value || '';
  const idx = val.indexOf('/');
  return idx === -1 ? val : val.substring(0, idx);
}

function getSelectedModelId() {
  const val = document.getElementById('model-select').value || '';
  const idx = val.indexOf('/');
  return idx === -1 ? '' : val.substring(idx + 1);
}

function isTextModel() {
  const p = getSelectedProvider();
  return p === 'ollama-text' || p === 'nvidia-text';
}

function updateUIForModel() {
  const textOnly = isTextModel();
  captureFullBtn.disabled = textOnly || isAnalyzing;
  captureRegionBtn.disabled = textOnly || isAnalyzing;
  
  const askInput = document.getElementById('ask-input');
  if (askInput) {
    askInput.placeholder = chrome.i18n.getMessage(textOnly ? 'askPlaceholderText' : 'askPlaceholder');
  }

  if (textOnly) {
    const visionWarning = 'Switch to a vision model (📷) for image analysis';
    captureFullBtn.title = visionWarning;
    captureRegionBtn.title = visionWarning;
    idleText.textContent = chrome.i18n.getMessage('idleTextTextModel');
    if (lastScreenContext) screenCtxBadge.classList.add('visible');
  } else {
    captureFullBtn.title = '';
    captureRegionBtn.title = '';
    idleText.textContent = chrome.i18n.getMessage('idleText');
    screenCtxBadge.classList.remove('visible');
  }
}

document.getElementById('model-select').addEventListener('change', updateUIForModel);

// ── Custom options ─────────────────────────────────────────────────────────

function updateCustomOptions(customOllama, customOllamaText, customNvidia) {
  ['ollama-custom-option', 'ollama-text-custom-option', 'nvidia-custom-option'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
  if (customOllama && customOllama.trim()) {
    const opt = document.createElement('option');
    opt.id = 'ollama-custom-option';
    opt.value = `ollama/${customOllama.trim()}`;
    opt.innerText = `Custom Vision (${customOllama.trim()})`;
    document.getElementById('ollama-vision-optgroup').appendChild(opt);
  }
  if (customOllamaText && customOllamaText.trim()) {
    const opt = document.createElement('option');
    opt.id = 'ollama-text-custom-option';
    opt.value = `ollama-text/${customOllamaText.trim()}`;
    opt.innerText = `Custom Text (${customOllamaText.trim()})`;
    document.getElementById('ollama-text-optgroup').appendChild(opt);
  }
  if (customNvidia && customNvidia.trim()) {
    const opt = document.createElement('option');
    opt.id = 'nvidia-custom-option';
    opt.value = `nvidia/${customNvidia.trim()}`;
    opt.innerText = `Custom Vision (${customNvidia.trim()})`;
    document.getElementById('nvidia-optgroup').appendChild(opt);
  }
}

// ── Mode selector ──────────────────────────────────────────────────────────

function updateModeUI() {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === selectedMode);
  });
}

// ── Initialization ─────────────────────────────────────────────────────────

function translateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(key);
    if (message) el.innerText = message;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(key);
    if (message) el.placeholder = message;
  });
  
  // Update placeholders and titles for elements that change dynamically
  const askInput = document.getElementById('ask-input');
  if (askInput) {
    askInput.placeholder = chrome.i18n.getMessage(isTextModel() ? 'askPlaceholderText' : 'askPlaceholder');
  }
  
  const micBtn = document.getElementById('mic-btn');
  if (micBtn) micBtn.title = chrome.i18n.getMessage('micTitle');
  
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) helpBtn.title = chrome.i18n.getMessage('help');
  
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) settingsBtn.title = chrome.i18n.getMessage('settings');
}

document.addEventListener('DOMContentLoaded', async () => {
  translateUI();
  const data = await chrome.storage.local.get([
    'nvidiaApiKey', 'selectedModel', 'hasSeenHelp', 'isCloudConsentGiven',
    'selectedMode', 'ollamaBaseUrl', 'customOllamaModel', 'customOllamaTextModel',
    'customNvidiaModel', 'responseLanguage', 'speechLanguage', 'lastScreenContext'
  ]);

  if (data.ollamaBaseUrl) OLLAMA_BASE_URL = data.ollamaBaseUrl;
  ollamaUrlInput.value = OLLAMA_BASE_URL;
  customOllamaModelInput.value = data.customOllamaModel || '';
  if (customOllamaTextModelInput) customOllamaTextModelInput.value = data.customOllamaTextModel || '';
  customNvidiaModelInput.value = data.customNvidiaModel || '';
  languageSelect.value = data.responseLanguage || 'en';
  if (speechLanguageSelect) speechLanguageSelect.value = data.speechLanguage || 'en-US';

  updateCustomOptions(data.customOllamaModel, data.customOllamaTextModel, data.customNvidiaModel);
  checkOllamaConnection();

  if (data.nvidiaApiKey) { nvidiaApiKey = data.nvidiaApiKey; nvidiaKeyInput.value = nvidiaApiKey; }
  if (data.selectedModel) document.getElementById('model-select').value = data.selectedModel;
  cloudConsentCheckbox.checked = !!data.isCloudConsentGiven;
  if (data.selectedMode) selectedMode = data.selectedMode;
  if (data.lastScreenContext) lastScreenContext = data.lastScreenContext;

  updateModeUI();
  updateUIForModel();

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      selectedMode = btn.getAttribute('data-mode');
      updateModeUI();
      await chrome.storage.local.set({ selectedMode });
    });
  });

  // All users are PRO
  trialBadge.innerText = 'PRO';
  trialBadge.className = 'trial-badge active';

  if (!data.hasSeenHelp) showHelp();
});

// ── Navigation ─────────────────────────────────────────────────────────────

function showMain() {
  [settingsView, helpView].forEach(v => v.classList.add('hidden'));
  document.querySelector('.mode-selector').classList.remove('hidden');
  document.getElementById('content').classList.remove('hidden');
  instructionsContainer.classList.remove('hidden');
  disclaimerBar.classList.remove('hidden');
  idleView.classList.remove('hidden');
  updateUIForModel();
}

function showHelp() {
  [idleView, resultView, loadingView, settingsView].forEach(v => v.classList.add('hidden'));
  document.querySelector('.mode-selector').classList.add('hidden');
  document.getElementById('content').classList.add('hidden');
  instructionsContainer.classList.add('hidden');
  disclaimerBar.classList.add('hidden');
  helpView.classList.remove('hidden');
}

helpBtn.addEventListener('click', showHelp);
closeHelpBtn.addEventListener('click', async () => {
  await chrome.storage.local.set({ hasSeenHelp: true });
  showMain();
});

settingsBtn.addEventListener('click', async () => {
  [idleView, resultView, loadingView, helpView].forEach(v => v.classList.add('hidden'));
  document.querySelector('.mode-selector').classList.add('hidden');
  document.getElementById('content').classList.add('hidden');
  instructionsContainer.classList.add('hidden');
  disclaimerBar.classList.add('hidden');

  settingsView.classList.remove('hidden');

  const data = await chrome.storage.local.get([
    'ollamaBaseUrl', 'customOllamaModel', 'customOllamaTextModel', 'customNvidiaModel', 'responseLanguage', 'speechLanguage'
  ]);
  ollamaUrlInput.value = data.ollamaBaseUrl || OLLAMA_BASE_URL;
  customOllamaModelInput.value = data.customOllamaModel || '';
  if (customOllamaTextModelInput) customOllamaTextModelInput.value = data.customOllamaTextModel || '';
  customNvidiaModelInput.value = data.customNvidiaModel || '';
  languageSelect.value = data.responseLanguage || 'en';
  if (speechLanguageSelect) speechLanguageSelect.value = data.speechLanguage || 'en-US';
});

saveSettingsBtn.addEventListener('click', async () => {
  nvidiaApiKey = nvidiaKeyInput.value.trim();
  const isCloudConsentGiven = cloudConsentCheckbox.checked;
  const ollamaBaseUrl = ollamaUrlInput.value.trim() || 'http://localhost:11434';
  const customOllama = customOllamaModelInput.value.trim();
  const customOllamaText = customOllamaTextModelInput ? customOllamaTextModelInput.value.trim() : '';
  const customNvidia = customNvidiaModelInput.value.trim();
  const responseLanguage = languageSelect.value;
  const speechLanguage = speechLanguageSelect ? speechLanguageSelect.value : 'en-US';

  OLLAMA_BASE_URL = ollamaBaseUrl;
  updateCustomOptions(customOllama, customOllamaText, customNvidia);
  const selectedModel = document.getElementById('model-select').value;

  await chrome.storage.local.set({
    nvidiaApiKey, selectedModel, isCloudConsentGiven,
    ollamaBaseUrl, customOllamaModel: customOllama,
    customOllamaTextModel: customOllamaText,
    customNvidiaModel: customNvidia,
    responseLanguage, speechLanguage
  });

  showMain();
  checkOllamaConnection();
});

// ── Ollama CORS check ─────────────────────────────────────────────────────

async function checkOllamaConnection() {
  try {
    const resp = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    corsNotice.classList.toggle('hidden', resp.ok);
  } catch {
    corsNotice.classList.remove('hidden');
  }
}

// ── Capture + analyze ─────────────────────────────────────────────────────

captureFullBtn.addEventListener('click', async () => {
  if (isAnalyzing || isTextModel()) return;
  startAnalysis(chrome.i18n.getMessage('capturingFull'));
  try {
    const screenshot = await captureTab();
    await analyzeImage(screenshot);
  } catch (err) { showError(err.message); }
});

captureRegionBtn.addEventListener('click', async () => {
  if (isAnalyzing || isTextModel()) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    chrome.tabs.sendMessage(tab.id, { action: 'start_selection' });
  } catch (err) { showError('Could not start selection: ' + err.message); }
});

chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === 'process_region') {
    startAnalysis(chrome.i18n.getMessage('capturingRegion'));
    try {
      const fullScreenshot = await captureTab();
      const croppedImage = await cropImage(fullScreenshot, request.coords);
      await analyzeImage(croppedImage);
    } catch (err) { showError(err.message); }
  }
});

// ── Image helpers ─────────────────────────────────────────────────────────

async function cropImage(dataUrl, coords) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const maxDim = 768;
      let w = coords.w, h = coords.h;
      if (Math.max(w, h) > maxDim) { const s = maxDim / Math.max(w, h); w *= s; h *= s; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, coords.x, coords.y, coords.w, coords.h, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
  });
}

async function captureTab() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action: 'capture_tab' }, (response) => {
      if (chrome.runtime.lastError) reject(new Error('Extension error: ' + chrome.runtime.lastError.message));
      else if (response?.error) reject(new Error('Capture failed: ' + response.error));
      else if (response?.dataUrl) resolve(response.dataUrl);
      else reject(new Error('Failed to capture tab.'));
    });
  });
}

async function resizeImage(dataUrl, maxDim = 1280) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      if (Math.max(w, h) > maxDim) { const s = maxDim / Math.max(w, h); w *= s; h *= s; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ── Analysis state ────────────────────────────────────────────────────────

function startAnalysis(text) {
  isAnalyzing = true;
  loadingText.innerText = text;
  idleView.classList.add('hidden');
  resultView.classList.add('hidden');
  loadingView.classList.remove('hidden');
  captureFullBtn.disabled = true;
  captureRegionBtn.disabled = true;
  resultText.innerText = '';
  keySignals.innerHTML = '';
}

function stopAnalysis() {
  isAnalyzing = false;
  loadingView.classList.add('hidden');
  updateUIForModel();
}

function showError(msg) {
  stopAnalysis();
  idleView.classList.remove('hidden');
  alert(msg);
}

// ── Language helpers ───────────────────────────────────────────────────────

function getLangName(id) {
  const names = {
    'uk': 'Ukrainian', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'pl': 'Polish',
    'nl': 'Dutch', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean',
    'ar': 'Arabic', 'hi': 'Hindi', 'tr': 'Turkish', 'vi': 'Vietnamese',
    'th': 'Thai', 'id': 'Indonesian'
  };
  return names[id] || 'English';
}

// ── System prompts ────────────────────────────────────────────────────────

function buildSystemPrompt(mode, languageID, instructions, screenContext) {
  let prompt = '';
  if (mode === 'indicator') {
    prompt = 'You are a professional trading analyst. Analyze the chart in this image. Respond ONLY with valid JSON: {"recommendation": "BUY"|"SELL"|"SKIP", "confidence": 0.0-1.0, "reasoning": "...", "key_signals": []}. If the image is NOT a trading chart, set recommendation to "SKIP", confidence to 0.0, and describe what you see in reasoning.';
  } else if (mode === 'educator') {
    prompt = 'You are a professional trading educator. Analyze the chart to teach a student. Explain chart patterns, support/resistance, and core concepts. Respond ONLY with valid JSON: {"recommendation": "SKIP", "confidence": 0.0, "reasoning": "Educational breakdown...", "key_signals": ["Pattern: ...", "Educational Tip: ..."]}. If not a chart, describe what you see.';
  } else if (mode === 'riskAdvisor') {
    prompt = 'You are a professional trading risk manager. Analyze the chart and provide entry range, Stop Loss, Take Profit, and risk/reward. Respond ONLY with valid JSON: {"recommendation": "SKIP", "confidence": 0.0, "reasoning": "Risk advice...", "key_signals": ["Suggested Entry: ...", "Stop Loss: ...", "Take Profit: ...", "Risk/Reward: ..."]}. If not a chart, describe what you see.';
  } else if (mode === 'general') {
    prompt = 'You are a helpful AI assistant. Analyze the provided screenshot and answer the user\'s question. Respond in plain text. Be concise and structured.';
  }

  if (instructions && mode !== 'general') {
    prompt += `\n\nSPECIFIC FOCUS: "${instructions}". Address this in your analysis.`;
  }

  if (screenContext && (mode === 'general' || !document.getElementById('model-select').value.includes('vision'))) {
    prompt += `\n\nSCREEN CONTEXT (from recent vision analysis):\n${screenContext}`;
  }

  if (languageID && languageID !== 'en') {
    const name = getLangName(languageID);
    if (mode === 'general') {
      prompt += `\n\nLANGUAGE: Respond in ${name}.`;
    } else {
      prompt += `\n\nLANGUAGE: Write "reasoning" and "key_signals" in ${name}. Keep "recommendation" as English keyword.`;
    }
  }

  return prompt;
}

// ── Vision analysis ───────────────────────────────────────────────────────

async function analyzeImage(dataUrl) {
  loadingText.innerText = chrome.i18n.getMessage('aiThinking');

  try {
    const resizedDataUrl = await resizeImage(dataUrl, 1280);
    const provider = getSelectedProvider();
    const modelId = getSelectedModelId();

    if (provider !== 'ollama') {
      const stored = await chrome.storage.local.get('isCloudConsentGiven');
      if (!stored.isCloudConsentGiven) throw new Error('GDPR Consent Required: Enable cloud consent in ⚙️ Settings.');
    }

    const langData = await chrome.storage.local.get('responseLanguage');
    const languageID = langData.responseLanguage || 'en';
    const instructions = specificInstructionsInput.value.trim();
    const systemPrompt = buildSystemPrompt(selectedMode, languageID, instructions, '');

    let userMsg = selectedMode === 'general'
      ? (instructions ? `Answer about this screenshot: "${instructions}"` : 'Describe what is on this screen.')
      : ('Analyze this chart.' + (instructions ? `\n\nFOCUS: ${instructions}` : ''));

    if (languageID !== 'en') {
      const name = getLangName(languageID);
      userMsg += `\n\nIMPORTANT: Respond in ${name}.`;
    }

    let url, body, headers = { 'Content-Type': 'application/json' };

    if (provider === 'ollama') {
      url = `${OLLAMA_BASE_URL}/api/chat`;
      body = {
        model: modelId, stream: true,
        messages: [{ role: 'user', content: `${systemPrompt}\n\n${userMsg}`, images: [resizedDataUrl.split(',')[1]] }]
      };
    } else if (provider === 'nvidia') {
      if (!nvidiaApiKey) throw new Error('NVIDIA API Key missing. Open ⚙️ Settings.');
      url = `${NVIDIA_BASE_URL}/chat/completions`;
      headers['Authorization'] = `Bearer ${nvidiaApiKey}`;
      body = {
        model: modelId, stream: true,
        messages: [{ role: 'user', content: [
          { type: 'text', text: `${systemPrompt}\n\n${userMsg}` },
          { type: 'image_url', image_url: { url: resizedDataUrl } }
        ]}]
      };
    }

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    loadingView.classList.add('hidden');
    resultView.classList.remove('hidden');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '', lineBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let content = '';
        if (provider === 'ollama') {
          try { content = JSON.parse(line).message?.content || ''; } catch {}
        } else {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim();
            if (d === '[DONE]') break;
            try { content = JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch {}
          }
        }
        if (content) { fullContent += content; resultText.innerText = fullContent; }
      }
    }

    // Save screen context for text model use
    lastScreenContext = fullContent;
    await chrome.storage.local.set({ lastScreenContext: fullContent });
    screenCtxBadge.classList.toggle('visible', isTextModel());

    parseFinalResult(fullContent);
    stopAnalysis();
  } catch (err) { showError(err.message); }
}

// ── Text-only chat ────────────────────────────────────────────────────────

async function sendTextChat(question, audioContext) {
  if (isAnalyzing) return;
  if (!question.trim() && !audioContext.trim()) { alert('Please type or speak a question first.'); return; }

  const provider = getSelectedProvider();  // 'ollama-text' or 'nvidia-text'
  const modelId = getSelectedModelId();
  const baseProvider = provider.replace('-text', '');

  if (baseProvider !== 'ollama') {
    const stored = await chrome.storage.local.get('isCloudConsentGiven');
    if (!stored.isCloudConsentGiven) { showError('GDPR Consent Required: Enable cloud consent in ⚙️ Settings.'); return; }
  }

  startAnalysis('Thinking...');
  loadingText.innerText = 'Text AI is responding...';

  const langData = await chrome.storage.local.get('responseLanguage');
  const languageID = langData.responseLanguage || 'en';

  let systemPrompt = 'You are a helpful AI assistant. Answer the user\'s question concisely.';
  if (lastScreenContext) systemPrompt += `\n\nSCREEN CONTEXT (from recent vision analysis):\n${lastScreenContext}`;
  if (languageID !== 'en') systemPrompt += `\n\nLANGUAGE: Respond in ${getLangName(languageID)}.`;

  let userMsg = question.trim();
  if (audioContext.trim()) userMsg = `[Voice note]: ${audioContext.trim()}\n\n${userMsg}`;
  if (!userMsg.trim()) userMsg = 'Summarize the screen context.';

  let url, body, headers = { 'Content-Type': 'application/json' };

  try {
    if (baseProvider === 'ollama') {
      url = `${OLLAMA_BASE_URL}/api/chat`;
      body = {
        model: modelId, stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ]
      };
    } else if (baseProvider === 'nvidia') {
      if (!nvidiaApiKey) throw new Error('NVIDIA API Key missing. Open ⚙️ Settings.');
      url = `${NVIDIA_BASE_URL}/chat/completions`;
      headers['Authorization'] = `Bearer ${nvidiaApiKey}`;
      body = {
        model: modelId, stream: true, max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg }
        ]
      };
    }

    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }

    loadingView.classList.add('hidden');
    resultView.classList.remove('hidden');
    recommendationBadge.innerText = '💬 TEXT AI';
    recommendationBadge.className = 'result-card-mode general';
    confidenceText.innerText = '';
    keySignals.innerHTML = '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '', lineBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split('\n');
      lineBuffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let content = '';
        if (baseProvider === 'ollama') {
          try { content = JSON.parse(line).message?.content || ''; } catch {}
        } else {
          if (line.startsWith('data: ')) {
            const d = line.slice(6).trim();
            if (d === '[DONE]') break;
            try { content = JSON.parse(d).choices?.[0]?.delta?.content || ''; } catch {}
          }
        }
        if (content) { fullContent += content; resultText.innerText = fullContent; }
      }
    }

    stopAnalysis();
  } catch (err) { showError(err.message); }
}

// ── Ask bar ───────────────────────────────────────────────────────────────

askSendBtn.addEventListener('click', () => handleAskSend());
askInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAskSend(); });

async function handleAskSend() {
  const question = askInput.value.trim();
  const audioCtx = transcriptStrip.textContent.replace('🎤 ', '').trim();
  askInput.value = '';
  transcriptStrip.classList.remove('visible');
  transcriptStrip.textContent = '';
  lastRecognizedText = '';

  if (isTextModel()) {
    await sendTextChat(question, audioCtx);
  } else {
    // For vision models: capture screen + ask
    appState_customPrompt = question;
    if (question || audioCtx) {
      startAnalysis('Capturing screen...');
      try {
        const screenshot = await captureTab();
        const resized = await resizeImage(screenshot, 1280);
        // Override instructions with question
        specificInstructionsInput.value = audioCtx ? `[Voice]: ${audioCtx}\n${question}` : question;
        await analyzeImage(resized);
        specificInstructionsInput.value = '';
      } catch (err) { showError(err.message); }
    }
  }
}

let appState_customPrompt = '';

// ── Voice / Speech Recognition ────────────────────────────────────────────

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let lastRecognizedText = '';

async function getSpeechLang() {
  const data = await chrome.storage.local.get('speechLanguage');
  return data.speechLanguage || 'en-US';
}

async function ensureMicrophonePermission() {
  try {
    const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
    if (permissionStatus.state === 'granted') {
      return true;
    }
  } catch (e) {
    // navigator.permissions.query might not support microphone in some contexts, proceed
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.error('Microphone permission error:', err);
    return false;
  }
}

micBtn.addEventListener('click', async () => {
  if (!SpeechRecognition) {
    alert('Speech recognition is not supported in this browser. Use Chrome.');
    return;
  }

  if (isRecording) {
    stopRecognition();
    return;
  }

  const hasPermission = await ensureMicrophonePermission();
  if (!hasPermission) {
    chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
    return;
  }

  const lang = await getSpeechLang();
  recognition = new SpeechRecognition();
  recognition.lang = lang;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let silenceTimeout = null;

  recognition.onstart = () => {
    isRecording = true;
    micBtn.classList.add('recording');
    micBtn.textContent = '⏹';
    micBtn.title = 'Stop recording';
    transcriptStrip.textContent = '🎤 Listening...';
    transcriptStrip.classList.add('visible');
  };

  recognition.onresult = (event) => {
    clearTimeout(silenceTimeout);
    let interim = '', final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t;
      else interim += t;
    }
    if (final) lastRecognizedText += final + ' ';
    const display = lastRecognizedText + interim;
    transcriptStrip.textContent = '🎤 ' + display.trim();

    // Auto-stop after 2.5s silence
    silenceTimeout = setTimeout(() => { if (isRecording) stopRecognition(); }, 2500);
  };

  recognition.onerror = (e) => {
    if (e.error === 'not-allowed') {
      console.warn('Speech recognition not allowed, opening permissions tab');
      chrome.tabs.create({ url: chrome.runtime.getURL('permission.html') });
    } else if (e.error !== 'no-speech') {
      console.error('Speech error:', e.error);
    }
    stopRecognition();
  };

  recognition.onend = () => { if (isRecording) stopRecognition(); };

  try { recognition.start(); }
  catch (e) { alert('Could not start microphone: ' + e.message); }
});

function stopRecognition() {
  isRecording = false;
  micBtn.classList.remove('recording');
  micBtn.textContent = '🎤';
  micBtn.title = 'Record voice (auto-stops on silence)';
  if (recognition) { try { recognition.stop(); } catch {} recognition = null; }

  if (lastRecognizedText.trim()) {
    // Fill ask input with transcript
    const existing = askInput.value.trim();
    askInput.value = existing ? existing + ' ' + lastRecognizedText.trim() : lastRecognizedText.trim();
  }
}

// ── Result rendering ──────────────────────────────────────────────────────

function parseFinalResult(content) {
  if (selectedMode === 'general') {
    recommendationBadge.innerText = '🤖 ASK AI';
    recommendationBadge.className = 'result-card-mode general';
    confidenceText.innerText = '';
    resultText.innerText = content;
    keySignals.innerHTML = '';
    return;
  }

  const jsonStr = extractJSON(content);
  if (jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      let rec = (data.recommendation || 'SKIP').toUpperCase();
      if (rec === 'BULLISH') rec = 'BUY';
      if (rec === 'BEARISH') rec = 'SELL';
      if (rec === 'NEUTRAL') rec = 'SKIP';

      const isNotChart = rec === 'SKIP' && data.reasoning &&
        (data.reasoning.toLowerCase().includes('not a chart') || data.reasoning.toLowerCase().includes('not a trading chart'));

      if (isNotChart) {
        recommendationBadge.innerText = chrome.i18n.getMessage('notAChart');
        recommendationBadge.className = 'badge skip';
        confidenceText.innerText = '';
      } else if (selectedMode === 'indicator') {
        recommendationBadge.innerText = chrome.i18n.getMessage(rec.toLowerCase());
        recommendationBadge.className = `badge ${rec.toLowerCase()}`;
        confidenceText.innerText = data.confidence != null ? `${chrome.i18n.getMessage('confidence')}: ${Math.round(data.confidence * 100)}%` : '';
      } else if (selectedMode === 'educator') {
        recommendationBadge.innerText = '🎓 ' + chrome.i18n.getMessage('modeEducator').toUpperCase();
        recommendationBadge.className = 'result-card-mode educator';
        confidenceText.innerText = '';
      } else if (selectedMode === 'riskAdvisor') {
        recommendationBadge.innerText = '🛡️ ' + chrome.i18n.getMessage('modeRiskAdvisor').toUpperCase();
        recommendationBadge.className = 'result-card-mode riskAdvisor';
        confidenceText.innerText = '';
      }

      if (data.reasoning) resultText.innerText = data.reasoning;

      if (data.key_signals && !isNotChart) {
        let titleKey = 'keySignals';
        if (selectedMode === 'educator') titleKey = 'educationalSignals';
        else if (selectedMode === 'riskAdvisor') titleKey = 'riskMetrics';
        
        const title = chrome.i18n.getMessage(titleKey);
        const icon = selectedMode === 'educator' ? '🎓' : selectedMode === 'riskAdvisor' ? '🛡️' : '⚡';
        keySignals.innerHTML = `<div class="signals-container"><div class="signals-title">${title}</div>${data.key_signals.map(s => `<div style="margin-bottom:6px;display:flex;gap:6px;"><span>${icon}</span><span>${s}</span></div>`).join('')}</div>`;
      } else {
        keySignals.innerHTML = '';
      }
    } catch {
      resultText.innerText = content;
      recommendationBadge.innerText = '⚠️ Raw Output';
      recommendationBadge.className = 'badge skip';
      confidenceText.innerText = '';
      keySignals.innerHTML = '';
    }
  } else {
    resultText.innerText = content;
    recommendationBadge.innerText = '⚠️ Raw Output';
    recommendationBadge.className = 'badge skip';
    confidenceText.innerText = '';
    keySignals.innerHTML = '';
  }
}

function extractJSON(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return (start !== -1 && end !== -1 && start < end) ? text.substring(start, end + 1) : null;
}
