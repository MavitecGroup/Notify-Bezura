const BEZURA_API_TOKEN_KEY = 'bezuraApiToken';
/** Chave antiga do storage (compatibilidade). */
const LEGACY_API_TOKEN_KEY = '\u0068\u0065\u006c\u0065\u006e\u0061ApiToken';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('bezuraApiToken');
  const status = document.getElementById('status');

  function setStatus(text, cls) {
    status.textContent = text || '';
    status.className = cls || '';
  }

  chrome.storage.local.get([BEZURA_API_TOKEN_KEY, LEGACY_API_TOKEN_KEY], (res) => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, 'err');
      return;
    }
    const legacy = res[LEGACY_API_TOKEN_KEY];
    const cur = res[BEZURA_API_TOKEN_KEY];
    if (legacy && !cur) {
      chrome.storage.local.set({ [BEZURA_API_TOKEN_KEY]: String(legacy) }, () => {
        chrome.storage.local.remove([LEGACY_API_TOKEN_KEY]);
      });
      input.value = String(legacy);
      return;
    }
    input.value = cur ? String(cur) : '';
  });

  document.getElementById('btnSave').addEventListener('click', () => {
    const v = input.value.trim();
    chrome.storage.local.set({ [BEZURA_API_TOKEN_KEY]: v }, () => {
      if (chrome.runtime.lastError) {
        setStatus('Erro ao salvar: ' + chrome.runtime.lastError.message, 'err');
        return;
      }
      chrome.storage.local.remove([LEGACY_API_TOKEN_KEY]);
      setStatus(v ? 'Token salvo.' : 'Campo vazio — token removido do armazenamento.', v ? 'ok' : '');
    });
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    input.value = '';
    chrome.storage.local.remove([BEZURA_API_TOKEN_KEY, LEGACY_API_TOKEN_KEY], () => {
      if (chrome.runtime.lastError) {
        setStatus(chrome.runtime.lastError.message, 'err');
        return;
      }
      setStatus('Token removido.', 'ok');
    });
  });

  document.getElementById('btnShow').addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
  });
});
