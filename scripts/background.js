// Bezura Notification - background service worker (Manifest V3)
// Polling independente para detectar novas mensagens mesmo quando aba não está ativa

console.log("[Bezura Notification] Background service worker carregado.");

// keep track of unread count seen by background poller
let bgLastUnreadCount = 0;
let pollCount = 0;
let alertWindowId = null;
// fallback cookie string received from content script
let storedCookieString = '';

// create alarm to poll sessions page every 2 minutes (descomprimir o gargalo)
chrome.alarms.create('pollUnread', { periodInMinutes: 2 }); // ~2 minutos
console.log("[Bezura Notification] Alarme 'pollUnread' criado - vai disparar a cada ~10 segundos");

// Também faz uma checagem imediata ao carregar
console.log("[Bezura Notification] Fazendo primeira checagem imediata...");
setTimeout(() => {
  console.log("[Bezura Notification] Disparando primeira verificação...");
  chrome.alarms.get('pollUnread', (alarm) => {
    if (alarm) {
      console.log("[Bezura Notification] Alarme 'pollUnread' encontrado:", alarm);
    } else {
      console.warn("[Bezura Notification] Alarme 'pollUnread' NÃO FOI CRIADO!");
    }
  });
}, 1000);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'pollUnread') return;

  pollCount++;
  console.log(`[Bezura Notification] ⏰ ALARME DISPAROU! #${pollCount} - timestamp: ${new Date().toLocaleTimeString()}`);
  console.log('[Bezura Notification] Iniciando fetch para detectar badges...');

  // fetch the sessions listing HTML and count red badges
  // need cookies even when no Bezura tab is open; obtain via cookies API
  // use "url" filter to ensure we capture cookies with domain ".bezura.com.br" or similar
  chrome.cookies.getAll({ url: 'https://app.bezura.com.br/' }, (cookies) => {
    try {
      console.log('[Bezura Notification] poll cookies found for URL:', cookies && cookies.length);
      if (cookies && cookies.length) {
        cookies.forEach(c => {
          console.log('[Bezura Notification] cookie:', c.name, c.domain, c.path);
        });
      } else {
        // diagnostic: list all cookies the extension can see
        chrome.cookies.getAll({}, (all) => {
          console.log('[Bezura Notification] poll cookies fallback getAll returned', all && all.length);
          all.forEach(c => console.log('[Bezura Notification] available cookie:', c.name, c.domain, c.path));
        });
      }
    } catch (e) {
      console.warn('[Bezura Notification] error logging cookies', e);
    }

    let cookieHeader = '';
    if (cookies && cookies.length) {
      cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      console.log('[Bezura Notification] cookieHeader length:', cookieHeader.length);
    } else {
      // tenta usar string armazenada do content script
      console.log('[Bezura Notification] nenhum cookie via API; tentando string armazenada');
      if (storedCookieString && storedCookieString.length > 0) {
        cookieHeader = storedCookieString;
        console.log('[Bezura Notification] ✓ usando cookies armazenados do content script, length:', cookieHeader.length);
      } else {
        console.log('[Bezura Notification] ❌ nenhum cookie disponível (storedCookieString vazio) - pulando fetch');
        return; // abort fetch - nenhum cookie para autenticar
      }
    }

    const fetchOptions = {
      method: 'GET',
      credentials: 'omit',
    };

    if (cookieHeader) {
      fetchOptions.headers = { 'Cookie': cookieHeader };
    }

    console.log('[Bezura Notification] Fetching with credentials:', !!cookieHeader);

    fetch('https://app.bezura.com.br/chat2/sessions', fetchOptions)
      .then((r) => {
        try { console.log('[Bezura Notification] fetch status', r.status); } catch (e) { }
        return r.text();
      })
      .then((html) => {
        try { console.log('[Bezura Notification] fetched html length', html && html.length); } catch (e) { }

        // if login page returned, reset counter so future real badges fire notifications
        const htmlLower = (html || '').toLowerCase();
        if (htmlLower.includes('login') || htmlLower.includes('entrar') || htmlLower.includes('sign in') || htmlLower.includes('unauthorized')) {
          console.warn('[Bezura Notification] fetched HTML looks like login page or error; resetting bgLastUnreadCount');
          bgLastUnreadCount = 0;
          return;
        }

        // Look for the pattern: bg-red-600 ... number
        const regexBadges = /bg-red-600[^>]*>\s*(\d+)/g;
        let count = 0;
        let resultRegex;
        while ((resultRegex = regexBadges.exec(html)) !== null) {
          count += parseInt(resultRegex[1] || "0", 10);
        }

        console.log('[Bezura Notification] background poll sum unread badge count:', count, '| lastCount:', bgLastUnreadCount);

        // Se houver aumento de badges, notifica
        if (count > bgLastUnreadCount) {
          console.log('[Bezura Notification] ⭐ NOVA MENSAGEM DETECTADA! ' + count + ' badges (era ' + bgLastUnreadCount + ')');

          chrome.storage.local.get(['bezuraTabState'], (res) => {
            if (res.bezuraTabState === 'Outros') {
              console.log('[Bezura Notification] O usuário está com a aba "Outros" ativa. Bloqueando popup do poller.');
              return;
            }

            const createNewAlertWindow = () => {
              try {
                chrome.windows.create({
                  url: chrome.runtime.getURL('ui/alert.html?from=poller'),
                  type: 'popup',
                  focused: true,
                  width: 420,
                  height: 380
                }, (win) => {
                  if (chrome.runtime.lastError) {
                    console.warn('[Bezura Notification] Erro ao abrir alert.html auto poller', chrome.runtime.lastError.message);
                  } else {
                    alertWindowId = win.id;
                    console.log('[Bezura Notification] alert.html poller aberto, ID:', win && win.id);
                  }
                });
              } catch (pEx) {
                console.warn('[Bezura Notification] catch erro popup window poller', pEx);
              }
            };

            if (alertWindowId !== null) {
              chrome.windows.get(alertWindowId, (win) => {
                if (chrome.runtime.lastError || !win) {
                  alertWindowId = null;
                  createNewAlertWindow();
                } else {
                  console.log('[Bezura Notification] alert.html já está aberto via poller. Focando...');
                  chrome.windows.update(alertWindowId, { focused: true });
                }
              });
            } else {
              createNewAlertWindow();
            }
          });
        }
        bgLastUnreadCount = count;
      })
      .catch((err) => {
        console.warn('[Bezura Notification] poll error', err);
      });
  });
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Bezura Notification] Extensão instalada/atualizada.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Bezura Notification] Mensagem recebida no background:", message, "de", sender);

  if (message && message.type === 'storeCookies') {
    // store a cookie string for later use by poller
    const newCookies = message.cookies || '';
    if (newCookies && newCookies.length > 0) {
      storedCookieString = newCookies;
      console.log('[Bezura Notification] ✓ cookies armazenados do content script:', storedCookieString.substring(0, 50) + '...');
    } else {
      console.warn('[Bezura Notification] ⚠️ tentativa de armazenar cookies vazia');
    }
    // sendResponse empty to avoid "message port closed before a response was received" error on short-lived connections
    sendResponse({ ok: true, stored: true });
    return false;
  }

  if (message && message.type === 'open-alert-popup') {
    console.log('[Bezura Notification] open-alert-popup request recebido');
    try {
      chrome.windows.create(
        {
          url: chrome.runtime.getURL('ui/alert.html'),
          type: 'popup',
          focused: true,
          width: 420,
          height: 380
        },
        (win) => {
          if (chrome.runtime.lastError) {
            console.warn('[Bezura Notification] erro ao criar popup', chrome.runtime.lastError.message);
            sendResponse({ ok: false });
          } else {
            console.log('[Bezura Notification] popup aberto', win && win.id);
            sendResponse({ ok: true });
          }
        }
      );
    } catch (e) {
      console.warn('[Bezura Notification] exceção ao abrir popup', e);
      sendResponse({ ok: false });
    }
    return true; // async response
  }

  if (message && message.type === "notify") {
    console.log("[Bezura Notification] Recebido notify handler no background!");

    // 1️⃣ PRIMEIRO garantimos a criação imediata da Window alert.html SE for elegível, 
    // independente se a API do Chrome Notification embaixo falhar por falta de ícones etc.
    if (message.isEligibleForPopup) {
      console.log("[Bezura Notification] Elegível para alert.html.");

      const createNewAlertWindow = () => {
        try {
          chrome.windows.create({
            url: chrome.runtime.getURL('ui/alert.html'),
            type: 'popup',
            focused: true,
            width: 420,
            height: 380
          }, (win) => {
            if (chrome.runtime.lastError) {
              console.warn('[Bezura Notification] Erro ao abrir alert.html auto', chrome.runtime.lastError.message);
            } else {
              alertWindowId = win.id;
              console.log('[Bezura Notification] alert.html aberto com sucesso, ID:', win && win.id);
            }
          });
        } catch (pEx) {
          console.warn('[Bezura Notification] catch erro popup window', pEx);
        }
      };

      if (alertWindowId !== null) {
        // Tenta achar a janela existente para focar, senão cria
        chrome.windows.get(alertWindowId, (win) => {
          if (chrome.runtime.lastError || !win) {
            // Janela foi fechada ou erro, cria nova
            alertWindowId = null;
            createNewAlertWindow();
          } else {
            // A janela ainda está viva, apenas pisca/foca ela
            console.log('[Bezura Notification] alert.html já está aberto. Focando...');
            chrome.windows.update(alertWindowId, { focused: true });
          }
        });
      } else {
        createNewAlertWindow();
      }
    }

    // O usuário solicitou que exibamos apenas a janela customizada alert.html,
    // removendo a notificação de sistema nativo do Windows/Mac.
    sendResponse({ ok: true });

    // return true to indicate we will send response asynchronously (or synchronously, but it's safe)
    return true;
  }
});
