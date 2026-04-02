const CADASTRO_ORIGIN = 'https://cadastro.bezura.com.br';
const HELENA_TOKEN_KEY = 'helenaApiToken';
// UUID v4 no path /sessions/<uuid>
const SESSION_PATH_RE =
  /\/sessions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
}

function refreshCadastroUI(state) {
  const errEl = document.getElementById('cadastroErr');
  const input = document.getElementById('cadastroLink');
  const btnCopiar = document.getElementById('btnCopiarCadastro');
  const btnAbrir = document.getElementById('btnAbrirCadastro');
  const btnHelena = document.getElementById('btnHelena');
  const statusEl = document.getElementById('cadastroStatus');

  if (!state.sessionId) {
    errEl.classList.add('visible');
    input.value = '';
    btnCopiar.disabled = true;
    btnAbrir.disabled = true;
    btnHelena.disabled = true;
    statusEl.textContent = '';
    statusEl.className = 'cadastro-status';
    return;
  }

  errEl.classList.remove('visible');
  const link = buildCadastroUrl(state.sessionId);
  input.value = link;
  btnCopiar.disabled = false;
  btnAbrir.disabled = false;
  btnHelena.disabled = !state.hasHelenaToken;
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

document.addEventListener('DOMContentLoaded', () => {
  const masterToggle = document.getElementById('masterToggle');
  const themeToggle = document.getElementById('themeToggle');
  const hintHelena = document.getElementById('hintHelena');
  const statusEl = document.getElementById('cadastroStatus');

  chrome.storage.local.get(['masterNotificationsEnabled', 'customThemeEnabled', HELENA_TOKEN_KEY], (res) => {
    masterToggle.checked = res.masterNotificationsEnabled !== false;
    themeToggle.checked = res.customThemeEnabled === true;
    runCadastroRefresh(res[HELENA_TOKEN_KEY]);
  });

  masterToggle.addEventListener('change', () => {
    chrome.storage.local.set({ masterNotificationsEnabled: masterToggle.checked });
  });

  themeToggle.addEventListener('change', () => {
    chrome.storage.local.set({ customThemeEnabled: themeToggle.checked });
  });

  async function runCadastroRefresh(tokenSnapshot) {
    const hasHelenaToken = !!(tokenSnapshot && String(tokenSnapshot).trim());
    const { sessionId } = await loadActiveTabCadastro();
    refreshCadastroUI({ sessionId, hasHelenaToken });
    hintHelena.textContent = hasHelenaToken
      ? ''
      : 'Para enviar pelo Helena, configure o token em Opções.';
  }

  document.getElementById('btnGerarCadastro').addEventListener('click', () => {
    statusEl.textContent = '';
    statusEl.className = 'cadastro-status';
    chrome.storage.local.get([HELENA_TOKEN_KEY], (r) => {
      runCadastroRefresh(r[HELENA_TOKEN_KEY]);
    });
  });

  document.getElementById('btnCopiarCadastro').addEventListener('click', async () => {
    const v = document.getElementById('cadastroLink').value.trim();
    if (!v) return;
    const ok = await copyText(v);
    statusEl.textContent = ok ? 'Link copiado.' : 'Não foi possível copiar.';
    statusEl.className = ok ? 'cadastro-status ok' : 'cadastro-status err';
  });

  document.getElementById('btnAbrirCadastro').addEventListener('click', () => {
    const v = document.getElementById('cadastroLink').value.trim();
    if (!v) return;
    chrome.tabs.create({ url: v });
  });

  document.getElementById('btnHelena').addEventListener('click', () => {
    const registrationUrl = document.getElementById('cadastroLink').value.trim();
    const prefix = `${CADASTRO_ORIGIN}/?`;
    if (!registrationUrl.startsWith(prefix)) {
      statusEl.textContent = 'Gere o link antes de enviar.';
      statusEl.className = 'cadastro-status err';
      return;
    }
    const sessionId = registrationUrl.slice(prefix.length);
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(sessionId)) {
      statusEl.textContent = 'UUID inválido no link.';
      statusEl.className = 'cadastro-status err';
      return;
    }

    statusEl.textContent = 'Enviando…';
    statusEl.className = 'cadastro-status';

    chrome.runtime.sendMessage(
      {
        type: 'HELENA_SEND_REGISTRATION_LINK',
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
          statusEl.textContent = 'Mensagem enviada ao Helena.';
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

  // Ao abrir: gerar link automaticamente
  chrome.storage.local.get([HELENA_TOKEN_KEY], (r) => {
    runCadastroRefresh(r[HELENA_TOKEN_KEY]);
  });

  // Atualiza se o token for salvo em outra aba (options)
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[HELENA_TOKEN_KEY]) return;
    const nv = changes[HELENA_TOKEN_KEY].newValue;
    loadActiveTabCadastro().then(({ sessionId }) => {
      refreshCadastroUI({
        sessionId,
        hasHelenaToken: !!(nv && String(nv).trim())
      });
      hintHelena.textContent = nv && String(nv).trim() ? '' : 'Para enviar pelo Helena, configure o token em Opções.';
    });
  });
});
