const KEY = 'helenaApiToken';

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('helenaToken');
  const status = document.getElementById('status');

  function setStatus(text, cls) {
    status.textContent = text || '';
    status.className = cls || '';
  }

  chrome.storage.local.get([KEY], (res) => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message, 'err');
      return;
    }
    input.value = res[KEY] ? String(res[KEY]) : '';
  });

  document.getElementById('btnSave').addEventListener('click', () => {
    const v = input.value.trim();
    chrome.storage.local.set({ [KEY]: v }, () => {
      if (chrome.runtime.lastError) {
        setStatus('Erro ao salvar: ' + chrome.runtime.lastError.message, 'err');
        return;
      }
      setStatus(v ? 'Token salvo.' : 'Campo vazio — token removido do armazenamento.', v ? 'ok' : '');
    });
  });

  document.getElementById('btnClear').addEventListener('click', () => {
    input.value = '';
    chrome.storage.local.remove([KEY], () => {
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
