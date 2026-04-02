const CADASTRO_ORIGIN = 'https://cadastro.bezura.com.br';
const BEZURA_API_TOKEN_KEY = 'bezuraApiToken';
/** Chave antiga do storage (compatibilidade). */
const LEGACY_API_TOKEN_KEY = '\u0068\u0065\u006c\u0065\u006e\u0061ApiToken';
// UUID v4 no path /sessions/<uuid>
const SESSION_PATH_RE =
  /\/sessions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

function tokenFromStorage(res) {
  const cur = res[BEZURA_API_TOKEN_KEY];
  const legacy = res[LEGACY_API_TOKEN_KEY];
  if (cur && String(cur).trim()) return String(cur).trim();
  if (legacy && String(legacy).trim()) return String(legacy).trim();
  return '';
}

function extractSessionId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const m = url.match(SESSION_PATH_RE);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function buildCadastroUrl(sessionId) {
  return `${CADASTRO_ORIGIN}/?${sessionId}`;
}

function refreshCadastroUI(state) {
  const errEl = document.getElementById('cadastroErr');
  const input = document.getElementById('cadastroLink');
  const btnAbrir = document.getElementById('btnAbrirCadastro');
  const btnSendChat = document.getElementById('btnSendChat');
  const statusEl = document.getElementById('cadastroStatus');

  if (!state.sessionId) {
    errEl.classList.add('visible');
    input.value = '';
    btnAbrir.disabled = true;
    btnSendChat.disabled = true;
    statusEl.textContent = '';
    statusEl.className = 'cadastro-status';
    return;
  }

  errEl.classList.remove('visible');
  const link = buildCadastroUrl(state.sessionId);
  input.value = link;
  btnAbrir.disabled = false;
  btnSendChat.disabled = !state.hasBezuraApiToken;
}

function loadActiveTabCadastro() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        resolve({ sessionId: null, error: chrome.runtime.lastError.message });
        return;
      }
      const tab = tabs && tabs[0];
      const sessionId = extractSessionId(tab && tab.url);
      resolve({ sessionId, tabUrl: tab && tab.url });
    });
  });
}

function getTokenFromChromeStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get([BEZURA_API_TOKEN_KEY, LEGACY_API_TOKEN_KEY], (r) => {
      resolve(tokenFromStorage(r));
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('masterToggle');
  const themeToggle = document.getElementById('themeToggle');
  const hintBezuraToken = document.getElementById('hintBezuraToken');
  const statusEl = document.getElementById('cadastroStatus');

  chrome.storage.local.get(
    ['masterNotificationsEnabled', 'customThemeEnabled', BEZURA_API_TOKEN_KEY, LEGACY_API_TOKEN_KEY],
    (res) => {
      masterToggle.checked = res.masterNotificationsEnabled !== false;
      themeToggle.checked = res.customThemeEnabled === true;
      runCadastroRefresh(tokenFromStorage(res));
    }
  );

  masterToggle.addEventListener('change', () => {
    chrome.storage.local.set({ masterNotificationsEnabled: masterToggle.checked });
  });

  themeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ customThemeEnabled: themeToggle.checked });
  });

  async function runCadastroRefresh(tokenSnapshot) {
    const hasBezuraApiToken = !!(tokenSnapshot && String(tokenSnapshot).trim());
    const { sessionId } = await loadActiveTabCadastro();
    refreshCadastroUI({ sessionId, hasBezuraApiToken });
    hintBezuraToken.textContent = hasBezuraApiToken
      ? ''
      : 'Para enviar pelo chat, configure o token em Opções.';
  }

  /** Re-lê a aba ativa, atualiza o campo e devolve sessionId/token atuais. */
  async function refreshLinkFromActiveTab() {
    const tok = await getTokenFromChromeStorage();
    const { sessionId } = await loadActiveTabCadastro();
    refreshCadastroUI({ sessionId, hasBezuraApiToken: !!tok });
    hintBezuraToken.textContent = tok ? '' : 'Para enviar pelo chat, configure o token em Opções.';
    return { sessionId, tok };
  }

  document.getElementById('btnAbrirCadastro').addEventListener('click', async () => {
    statusEl.textContent = '';
    statusEl.className = 'cadastro-status';
    const { sessionId } = await refreshLinkFromActiveTab();
    if (!sessionId) {
      statusEl.textContent = 'Abra uma aba do chat com /sessions/... na URL.';
      statusEl.className = 'cadastro-status err';
      return;
    }
    chrome.tabs.create({ url: buildCadastroUrl(sessionId) });
  });

  document.getElementById('btnSendChat').addEventListener('click', async () => {
    statusEl.textContent = '';
    statusEl.className = 'cadastro-status';
    const { sessionId, tok } = await refreshLinkFromActiveTab();
    if (!sessionId) {
      statusEl.textContent = 'Abra uma aba do chat com /sessions/... na URL.';
      statusEl.className = 'cadastro-status err';
      return;
    }
    if (!tok) {
      statusEl.textContent = 'Configure o token em Opções.';
      statusEl.className = 'cadastro-status err';
      return;
    }

    const registrationUrl = buildCadastroUrl(sessionId);
    statusEl.textContent = 'Enviando…';
    statusEl.className = 'cadastro-status';

    chrome.runtime.sendMessage(
      {
        type: 'BEZURA_SEND_REGISTRATION_LINK',
        sessionId,
        registrationUrl
      },
      (resp) => {
        if (chrome.runtime.lastError) {
          statusEl.textContent = chrome.runtime.lastError.message;
          statusEl.className = 'cadastro-status err';
          return;
        }
        if (resp && resp.ok) {
          statusEl.textContent = 'Mensagem enviada no chat.';
          statusEl.className = 'cadastro-status ok';
        } else {
          statusEl.textContent = (resp && resp.error) || 'Falha ao enviar.';
          statusEl.className = 'cadastro-status err';
        }
      }
    );
  });

  document.getElementById('linkOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  chrome.storage.local.get([BEZURA_API_TOKEN_KEY, LEGACY_API_TOKEN_KEY], (r) => {
    runCadastroRefresh(tokenFromStorage(r));
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[BEZURA_API_TOKEN_KEY] && !changes[LEGACY_API_TOKEN_KEY]) return;
    chrome.storage.local.get([BEZURA_API_TOKEN_KEY, LEGACY_API_TOKEN_KEY], (r) => {
      const tok = tokenFromStorage(r);
      loadActiveTabCadastro().then(({ sessionId }) => {
        refreshCadastroUI({
          sessionId,
          hasBezuraApiToken: !!tok
        });
        hintBezuraToken.textContent = tok ? '' : 'Para enviar pelo chat, configure o token em Opções.';
      });
    });
  });
});
