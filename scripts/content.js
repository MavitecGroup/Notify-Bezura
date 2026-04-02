// Bezura Notification - content script
// Detecta novas mensagens na lista de sessões do Bezura e dispara Notification API.

// ------------------------
// NOVO: INJEÇÃO DO INTERCEPTOR DE REDE E WEBSOCKET
// ------------------------
try {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('scripts/interceptor.js');
  script.onload = function() {
      this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  window.addEventListener('message', function(event) {
      if (event.source !== window || !event.data || event.data.type !== 'BEZURA_NET_INTERCEPT') {
          return;
      }
      
      // Listener antigo de rede removido para evitar flood de IO.
  });
} catch(e) {
  console.warn("[Bezura Notification] Erro ao injetar interceptor.js:", e);
}

// IMEDIATAMENTE: enviar cookies para o background
(function sendCookiesToBackgroundNow() {
  try {
    const c = document.cookie || '';
    console.log('[Bezura Notification] 🔔 ENVIANDO COOKIES PARA BACKGROUND:', c.substring(0, 50) + '.== true) {
    applyCustomTheme(true);
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // ignore
    });
    chrome.runtime.sendMessage({ type: 'storeCookies', cookies: c }, (response) => {
      // ignore
    });
  } catch (e) {
    console.error('[Bezura Notification] ERRO ao tentar enviar cookies:', e.message);
  }

  // repetir a cada 30 segundos para manter cookies atualizados
  setInterval(() => {
    try {
      const c = document.cookie || '';
      if (c) {
        chrome.runtime.sendMessage({ type: 'storeCookies', cookies: c });
      }
    } catch (e) {
      // ignore
    }
  }, 30000);
})();
const BEZURA_DEBOUNCE_MS = 500;
let bezuraDebounceTimeout = null;
let bezuraDetectionCount = 0;
let bezuraObserverStarted = false;
let lastNonMeusMessageTime = 0;

// Helper global para verificar em qual aba estamos ("Meus", "Novos", "Outros")
function getCurrentBezuraTab() {
  try {
    const buttons = document.querySelectorAll('[data-cy^="button-"]');
    for (const btn of buttons) {
      const cls = (btn.className || '').toString().toLowerCase();
      if (cls.includes('text-black') || cls.includes('bg-gray-300') || cls.includes('active') || cls.includes('bg-blue') || cls.includes('bg-primary') || btn.getAttribute('aria-selected') === 'true') {
        const text = (btn.textContent || '').trim().toLowerCase();
        if (text.includes('meus')) return 'Meus';
        if (text.includes('novos')) return 'Novos';
        if (text.includes('outros')) return 'Outros';
      }
    }
    
    // Fallback via título do filtro
    const filterTitle = document.querySelector('.div_title_filter');
    if (filterTitle) {
      const text = filterTitle.textContent.toLowerCase();
      if (text.includes('meus')) return 'Meus';
      if (text.includes('novos')) return 'Novos';
      if (text.includes('outros')) return 'Outros';
    }
  } catch(e) {}
  
  return 'Meus'; // Fallback seguro
}

// Sincronizar estado da aba ativa com o background periodicamente
setInterval(() => {
  try {
    const currentTab = getCurrentBezuraTab();
    chrome.storage.local.set({ bezuraTabState: currentTab });
  } catch(e) {}
}, 2000);

// ------------------------
// Global state
// ------------------------
// Track last seen unread count per session name (usando sessionStorage para persistir através de virtual scrolling)
// sessionStorage persiste durante a sessão mesmo que elementos sejam removidos do DOM
function getSessionUnreadMap() {
  try {
    const stored = sessionStorage.getItem('bezura-session-unread-map');
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('[Bezura Notification] erro ao ler sessionStorage:', e);
    return {};
  }
}

function setSessionUnreadMap(map) {
  try {
    sessionStorage.setItem('bezura-session-unread-map', JSON.stringify(map));
  } catch (e) {
    console.warn('[Bezura Notification] erro ao escrever sessionStorage:', e);
  }
}


// ------------------------
// getLoggedUser (logs de localStorage)
// ------------------------
function getLoggedUser() {
  try {
    const loggedInfo = {
      defaultTenantId: localStorage.getItem("defaultTenantId"),
      deviceId: localStorage.getItem("deviceId"),
      internalDeviceId: localStorage.getItem("internal-device-id"),
      partnerConfig: localStorage.getItem("partnerConfig"),
      refreshToken: localStorage.getItem("refresh-token")
    };

    console.log("[Bezura Notification] localStorage:", loggedInfo);
    return loggedInfo;
  } catch (e) {
    console.warn("[Bezura Notification] Erro ao ler localStorage:", e);
    return null;
  }
}

// ------------------------
// Notification API
// ------------------------
function requestNotificationPermissionIfNeeded() {
  if (!("Notification" in window)) {
    console.warn("[Bezura Notification] Notification API não disponível.");
    return;
  }

  if (Notification.permission === "default") {
    console.log("[Bezura Notification] Solicitando permissão de notificação...");
    Notification.requestPermission()
      .then((permission) => {
        console.log("[Bezura Notification] Permissão de notificação:", permission);
      })
      .catch((err) => {
        console.warn("[Bezura Notification] Erro ao solicitar permissão:", err);
      });
  } else {
    console.log("[Bezura Notification] Permissão de notificação atual:", Notification.permission);
  }
}

function sendChromeNotification(title, body, iconUrl, isEligibleForPopup) {
  if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
    console.log('[Bezura Notification] chrome.runtime not available');
    return false;
  }

  try {
    chrome.runtime.sendMessage(
      {
        type: "notify",
        title,
        body,
        iconUrl,
        isEligibleForPopup
      },
      (resp) => {
        if (chrome.runtime.lastError) {
          console.warn('[Bezura Notification] sendMessage lastError:', chrome.runtime.lastError.message);
          return;
        }
        console.log("[Bezura Notification] resposta do background:", resp);
      }
    );
    return true;
  } catch (e) {
    if (e.message.includes('Extension context invalidated')) {
      console.log('[Bezura Notification] Contexto de extensão antigo (atualize a aba atual com F5 para conectar à nova versão).');
    } else {
      console.warn('[Bezura Notification] sendChromeNotification exception:', e.message);
    }
    return false;
  }
}

function dispararNotificacaoBezura(currentTab) {
  chrome.storage.local.get(['masterNotificationsEnabled'], (masterRes) => {
    if (masterRes.masterNotificationsEnabled === false) {
      console.log("[Bezura Notification] Bloqueio Mestre Ativo: As notificações foram silenciadas pela Mini Aba da extensão.");
      return;
    }

    console.log("[Bezura Notification] Disparando notificação de nova mensagem de lead...");

    if (currentTab === 'Outros' || currentTab === 'Novos') {
      console.log(`[Bezura Notification] Bloqueando popup e som porque a origem do alerta partiu da aba '${currentTab}'.`);
      return;
    }

    // Prevenir notificação caso o usuário já esteja lendo ativamente as mensagens
    if (currentTab === 'Meus' && document.hasFocus()) {
      console.log("[Bezura Notification] Bloqueando alerta porque o usuário já está com a aba 'Meus' aberta e focado na tela.");
      return;
    }

    const title = "Lead respondeu agora!";
    const body = "Clique para abrir o chat";
    const icon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect fill="%233B82F6" width="128" height="128"/><text x="64" y="90" font-size="80" font-weight="bold" text-anchor="middle" fill="white">B</text></svg>';

    // Tocar som de notificação apenas se estiver habilitado nas configurações
    chrome.storage.local.get(['playNotificationSound', 'selectedRingtone'], (res) => {
      const shouldPlaySound = res.playNotificationSound !== false; // Padrão é true
      if (shouldPlaySound) {
        try {
          let audioUrl = "";
          const selected = res.selectedRingtone || 'default';

          if (selected === 'default') {
              audioUrl = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
          } else {
              // Arquivo de mídia empacotado dentro do pacote da extensão local
              audioUrl = chrome.runtime.getURL("assets/songs/" + selected);
          }

          const audio = new Audio(audioUrl);
          audio.volume = 0.8;
          audio.play().catch(e => console.warn("[Bezura Notification] Som bloqueado pelo navegador", e.message));
        } catch (e) {
          // ignore
        }
      } else {
        console.log("[Bezura Notification] Som mutado pelas configurações locais do cliente.");
      }
    });

    // Como as notificações nativas do OS e as notificações flutuantes HTML (toasts) foram removidas
    // a pedido do usuário, a janela alert.html passa a ser o ÚNICO meio de aviso.
    const isEligibleForPopup = true;

    console.log(`[Bezura Notification] Disparando popup. Elegível: ${isEligibleForPopup}, Aba atual: ${currentTab}`);

    const sentViaChrome = sendChromeNotification(title, body, icon, isEligibleForPopup);

    if (sentViaChrome) {
      console.log(`[Bezura Notification] Notificação enviada via Chrome API. Elegível para popup extra? ${isEligibleForPopup}`);
    } else {
      console.warn("[Bezura Notification] Falha ao enviar notificação via background script.");
    }
  });
}

function scheduleBezuraNotification(reason, relatedElement, currentTab) {
  bezuraDetectionCount++;
  console.log(
    "[Bezura Notification] Possível nova mensagem detectada. Razão:",
    reason,
    "| Contagem:",
    bezuraDetectionCount,
    "| Aba atual:",
    currentTab
  );

  if (relatedElement) {
    try {
      console.log(
        "[Bezura Notification] Elemento relacionado (classes):",
        relatedElement.className
      );
      console.log(
        "[Bezura Notification] HTML (cortado):",
        (relatedElement.outerHTML || "").slice(0, 500) + "..."
      );
    } catch (e) {
      console.log("[Bezura Notification] Não foi possível logar o outerHTML:", e);
    }
  }

  if (bezuraDebounceTimeout) {
    clearTimeout(bezuraDebounceTimeout);
  }

  bezuraDebounceTimeout = setTimeout(() => {
    dispararNotificacaoBezura(currentTab);
  }, BEZURA_DEBOUNCE_MS);
}



// ------------------------
// Heurística ESPECÍFICA Bezura (lista de sessões)
// ------------------------

// Dado QUALQUER elemento, tenta achar o item da lista de sessões
// e verificar se existe um badge vermelho de não lidos (bg-red-600 com número > 0)
function checkSessionItemForUnread(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  // Sobe até o container do item de sessão
  const sessionItem = el.closest('[data-cy="list-item-session"]');
  if (!sessionItem) {
    return false;
  }

  // Verifica se a lista presente na tela pertence à guia "Meus" usando o helper global
  let currentTab = getCurrentBezuraTab();

  // Tenta obter o nome da sessão para melhor diagnóstico
  let sessionName = "Unknown";
  try {
    const nameEl = sessionItem.querySelector('[class*="text"]');
    if (nameEl) {
      sessionName = nameEl.textContent.trim().substring(0, 20);
    }
  } catch (e) {
    // ignore
  }

  // Badge vermelho de não lidos na coluna da direita
  // Procura por qualquer elemento com bg-red-600 (pode ter diferentes classes)
  let badge = sessionItem.querySelector('[class*="bg-red-600"]');

  // Se não encontrou, tenta busca mais agressiva dentro do item inteiro
  if (!badge) {
    // Procura por qualquer elemento que contenha um número e tenha classes de badge
    const allElements = sessionItem.querySelectorAll('*');
    for (const el of allElements) {
      const className = (el.className || '').toString().toLowerCase();
      const text = (el.textContent || '').trim();

      // Verifica se tem classe de cor vermelha ou badge
      if ((className.includes('bg-red') || className.includes('red-') || className.includes('badge') || className.includes('unread')) &&
        /^\d+$/.test(text)) {
        badge = el;
        break;
      }
    }
  }

  // Se ainda não encontrou, tenta contar span/div com números vermelhos
  if (!badge) {
    const spans = sessionItem.querySelectorAll('span, div');
    for (const span of spans) {
      const style = window.getComputedStyle(span);
      const text = span.textContent.trim();

      // Procura por elementos com cor vermelha
      if ((style.color.includes('255') || style.color.includes('rgb(255, ')) && /^\d+$/.test(text)) {
        badge = span;
        break;
      }
    }
  }

  if (!badge) {
    return false;
  }

  const text = (badge.textContent || "").trim();
  const count = parseInt(text, 10);

  // Get previous value from sessionStorage (persists through virtual scrolling)
  const unreadMap = getSessionUnreadMap();
  const prev = unreadMap[sessionName];

  console.log("[Bezura Notification] Badge de sessão encontrado:", {
    sessionName,
    text,
    count,
    prev,
    classes: badge.className
  });

  // only notify if count increased from previous (or first time >0)
  if (!isNaN(count) && count > 0) {
    if (prev === undefined || count > prev) {
      if (currentTab === 'Outros') {
        lastNonMeusMessageTime = Date.now();
      }

      console.log(`[Bezura Notification] NOVA MENSAGEM em "${sessionName}"! count aumentou de ${prev || 0} para ${count}`);
      console.log(`[Bezura Notification] Aba ativa no momento: ${currentTab}`);

      scheduleBezuraNotification("Badge vermelho de não lido em sessão", badge, currentTab);

      unreadMap[sessionName] = count;
      setSessionUnreadMap(unreadMap);
      return true;  // notification was scheduled
    } else {
      console.log(`[Bezura Notification] "${sessionName}" count não mudou ou diminuiu (${prev} -> ${count}), pulando`);
      unreadMap[sessionName] = count;
      setSessionUnreadMap(unreadMap);
      return false;  // no notification needed
    }
  }
  // zero or NaN, clear map entry
  delete unreadMap[sessionName];
  setSessionUnreadMap(unreadMap);

  return false;
}

// helper to recursively collect `[data-cy="list-item-session"]` elements, including inside
// open shadow roots. `root` may be a Document or ShadowRoot.
function findSessionItems(root) {
  const results = [];
  const seen = new Set();
  if (!root) return results;

  try {
    // Procura 1: Busca simples direto no documento/root
    if (typeof root.querySelectorAll === "function") {
      const items = root.querySelectorAll('[data-cy="list-item-session"]');
      items.forEach(item => {
        const id = item.getAttribute('data-cy') + '_' + (item.textContent || '').substring(0, 10);
        if (!seen.has(id)) {
          seen.add(id);
          results.push(item);
        }
      });
    }
  } catch (e) {
    console.warn('[Bezura Notification] Procura 1 error:', e.message);
  }

  // Procura 2: em containers específicos que possam conter items (virtualmente renderizados)
  // IMPORTANTE: Busca em TODOS os containers, mesmo os ocultos (display: none)
  try {
    if (typeof root.querySelectorAll === "function") {
      // Procura em cdkVirtualScrollViewport ou similares que usam virtual scrolling
      const virtualContainers = root.querySelectorAll(
        '.cdk-virtual-scroll-content-wrapper, [class*="scroll"], [class*="list"], [class*="tab-content"], [role="tabpanel"]'
      );
      virtualContainers.forEach(container => {
        if (container && typeof container.querySelectorAll === 'function') {
          try {
            const items = container.querySelectorAll('[data-cy="list-item-session"]');
            items.forEach(item => {
              const id = item.getAttribute('data-cy') + '_' + (item.textContent || '').substring(0, 10);
              if (!seen.has(id)) {
                seen.add(id);
                results.push(item);
              }
            });
          } catch (e) {
            // ignore
          }
        }
      });
    }
  } catch (e) {
    console.warn('[Bezura Notification] Procura 2 error:', e.message);
  }

  // Procura 3: Shadow roots
  try {
    const children = (root.children && Array.from(root.children)) || [];
    children.forEach((el) => {
      if (el.shadowRoot) {
        const shadowItems = findSessionItems(el.shadowRoot);
        shadowItems.forEach(item => {
          const id = item.getAttribute('data-cy') + '_' + (item.textContent || '').substring(0, 10);
          if (!seen.has(id)) {
            seen.add(id);
            results.push(item);
          }
        });
      }
    });
  } catch (e) {
    console.warn('[Bezura Notification] Procura 3 error:', e.message);
  }

  if (results.length > 0) {
    console.log(`[Bezura Notification] findSessionItems encontrou ${results.length} items`);
  }

  return results;
}

// periodic scan in case mutations in shadow DOM are missed
// IMPORTANTE: Busca em TODOS os containers de abas, mesmo os ocultos
// EXECUTADO A CADA 1 SEGUNDO para máxima responsividade
function scanForUnreadSessions() {
  const items = findSessionItems(document);

  if (!items || items.length === 0) {
    // Tenta busca muito agressiva
    const allItems = document.querySelectorAll('[data-cy="list-item-session"]');
    if (allItems.length === 0) {
      console.log("[Bezura Notification] NENHUM session item encontrado em lugar nenhum");
      return;
    }

    console.log(`[Bezura Notification] ⚠️ scanForUnreadSessions: findSessionItems retornou 0, mas encontrada ${allItems.length} items via querySelectorAll direto`);
    allItems.forEach((item, idx) => {
      try {
        if (checkSessionItemForUnread(item)) {
          const textEl = item.querySelector('[class*="text"]');
          const sessionName = textEl ? textEl.textContent.trim() : `Item ${idx}`;
          console.log(`[Bezura Notification] ⭐ NOTIFICAÇÃO detectada em item ${idx} ("${sessionName}")`);
        }
      } catch (e) {
        console.warn("[Bezura Notification] erro ao verificar item:", idx, e.message);
      }
    });
    return;
  }

  console.log(`[Bezura Notification] scanForUnreadSessions: verificando ${items.length} items...`);

  let notificationCount = 0;
  items.forEach((sessionItem, idx) => {
    try {
      const textEl = sessionItem.querySelector('[class*="text"]');
      const sessionName = textEl ? textEl.textContent.trim() : `Item ${idx}`;

      if (checkSessionItemForUnread(sessionItem)) {
        notificationCount++;
        console.log(`[Bezura Notification] ⭐ Notificação #${notificationCount}: ${sessionName}`);
      }
    } catch (e) {
      console.warn("[Bezura Notification] scan error on item", idx, ":", e.message);
    }
  });

  if (notificationCount === 0) {
    console.log(`[Bezura Notification] ℹ️ Scan completo: ${items.length} items verificados, nenhuma notificação disparada`);
  }
}



// ------------------------
// Processador principal de elemento
// ------------------------
// returns true if a notification was scheduled
function processElementForNewMessage(el) {
  if (checkSessionItemForUnread(el)) {
    return true;
  }
  return false;
}

// ------------------------
// MutationObserver
// ------------------------
function startBezuraObserver(attempts = 0) {
  if (bezuraObserverStarted) {
    console.log("[Bezura Notification] Observer já iniciado, ignorando.");
    return;
  }

  // Procura por containers que possam conter TODAS as abas (Meus, Novos, Outros)
  // Não apenas o conteúdo da aba ativa
  let target = null;

  // Opção 1: Procura por um container pai que tenha múltiplas abas
  const tabContainers = document.querySelectorAll('[class*="tab"], [class*="session"], [role="tabpanel"]');
  if (tabContainers.length > 0) {
    // Pega o container mais próximo que é parent de todos
    target = tabContainers[0].closest('[class*="container"], [class*="list"], [class*="content"]') || tabContainers[0].parentElement;
    console.log("[Bezura Notification] Encontrado container de tabs/abas:", target?.tagName, target?.className);
  }

  // Opção 2: Procura pelo elemento de lista de sessões
  if (!target) {
    target = document.querySelector("sessions-list-online-content");
    if (target) {
      console.log("[Bezura Notification] Encontrado sessions-list-online-content");
      // Mas vamos observar seu PARENT para pegar mudanças em todas as abas
      target = target.parentElement || target;
    }
  }

  // Opção 3: Observa todo o body como fallback
  if (!target) {
    console.log("[Bezura Notification] Container específico não encontrado. Observando body inteiro.");
    target = document.body;
  }

  if (!target) {
    // Retry up to 3 times with exponential backoff
    if (attempts < 3) {
      const delay = Math.pow(2, attempts) * 1000; // 1s, 2s, 4s
      console.log(`[Bezura Notification] document.body ainda não existe. Tentando novamente em ${delay}ms (attempt ${attempts + 1}/3)`);
      setTimeout(() => startBezuraObserver(attempts + 1), delay);
      return;
    } else {
      console.error("[Bezura Notification] Falha ao iniciar observer após 3 tentativas. Scanning periódico continuará.");
      // Periodic scanning will still catch unread sessions via scanForUnreadSessions
      return;
    }
  }

  bezuraObserverStarted = true;
  console.log("[Bezura Notification] Iniciando MutationObserver em:", target.tagName, "com", target.childNodes.length, "filhos");

  // helper that attaches observer to a root (Document or ShadowRoot)
  function attachObserver(root) {
    if (!root || root.__bezuraAttached) return;
    root.__bezuraAttached = true;
    const obs = new MutationObserver(observerCallback);
    obs.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "data-unread-count"]
    });
    // also traverse existing shadow roots under this root
    try {
      Array.from(root.querySelectorAll("*")).forEach((el) => {
        if (el.shadowRoot) {
          attachObserver(el.shadowRoot);
        }
      });
    } catch (e) {
      // ignore
    }
  }

  // when nodes are added that themselves have shadowRoot, we will call attachObserver
  function observerCallback(mutationsList) {
    for (const mutation of mutationsList) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = /** @type {Element} */ (node);
            // if new element has a shadow root, observe it too
            if (el.shadowRoot) {
              attachObserver(el.shadowRoot);
            }
            if (processElementForNewMessage(el)) {
              console.log("[Bezura Notification] Novo nó relevante detectado. Classes:",
                el.className);
            }
            try {
              const descendants = el.querySelectorAll("*");
              descendants.forEach((child) => {
                if (processElementForNewMessage(child)) {
                  console.log("[Bezura Notification] Novo nó relevante (filho). Classes:",
                    child.className);
                }
              });
            } catch (e) {
              // ignore
            }
          }
        });
      }

      if (
        mutation.type === "attributes" &&
        mutation.target &&
        mutation.target.nodeType === Node.ELEMENT_NODE
      ) {
        const attrName = mutation.attributeName;
        const el = /** @type {Element} */ (mutation.target);

        if (attrName === "class" || attrName === "data-unread-count") {
          if (processElementForNewMessage(el)) {
            console.log(
              "[Bezura Notification] Atributo modificado relevante:",
              attrName,
              "em elemento com classes:",
              el.className
            );
          }
        }
      }

      if (
        mutation.type === "characterData" &&
        mutation.target &&
        mutation.target.parentElement
      ) {
        const el = /** @type {Element} */ (mutation.target.parentElement);
        if (processElementForNewMessage(el)) {
          console.log(
            "[Bezura Notification] Texto modificado (characterData) relevante. Elemento pai classes:",
            el.className
          );
        }
      }
    }
  }

  // start observing the chosen target (or its shadow root)
  if (target.shadowRoot) {
    console.log("[Bezura Notification] Observando shadowRoot de", target.tagName);
    attachObserver(target.shadowRoot);
  }
  attachObserver(target);

  console.log("[Bezura Notification] MutationObserver registrado com sucesso.");
}

// ------------------------
// Observador do <title> (Fallback para abas dormentes)
// Muitos apps de chat indicam novas mensagens no título da página (ex: "(1) Bezura")
// ------------------------
function startTitleObserver() {
  const titleEl = document.querySelector('title');
  if (!titleEl) {
    console.warn('[Bezura Notification] Elemento <title> não encontrado, pulando TitleObserver.');
    return;
  }

  let lastUnreadCount = 0;

  // Tenta extrair a contagem atual se já existir ao carregar
  const initialMatch = document.title.match(/^\((\d+)\)/);
  if (initialMatch) {
    lastUnreadCount = parseInt(initialMatch[1], 10);
  }

  const observer = new MutationObserver(() => {
    const match = document.title.match(/^\((\d+)\)/);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count > lastUnreadCount) {
        console.log(`[Bezura Notification] Título mudou! Novas mensagens (${lastUnreadCount} -> ${count}). Agendando scan.`);
        
        // Em vez de invocar dispararNotificacaoBezura cegamente (podendo ser da aba Outros),
        // delegamos o escaneamento da DOM para validar as sessões renderizadas ativas.
        setTimeout(scanForUnreadSessions, 100);
        setTimeout(scanForUnreadSessions, 500);
        setTimeout(scanForUnreadSessions, 1500);
      }
      lastUnreadCount = count;
    } else {
      // Título voltou ao normal (sem parênteses)
      lastUnreadCount = 0;
    }
  });

  observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
  console.log('[Bezura Notification] TitleObserver iniciado com sucesso.');
}

// ------------------------
// Inicialização
// ------------------------
(function initBezuraNotification() {
  console.log("[Bezura Notification] Iniciando content script Bezura...");

  getLoggedUser();
  requestNotificationPermissionIfNeeded();

  if (document.readyState === "complete" || document.readyState === "interactive") {
    startBezuraObserver();
    startTitleObserver();
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      startBezuraObserver();
      startTitleObserver();
    });
  }
})();

// ------------------------
// NOVO: POLLER INTERNO VIA CREDENCIAIS DA API
// ------------------------
let bezuraApiToken = null;
let bezuraUserId = null;
let bezuraPollingInterval = null;
let lastPolledUnreadCount = 0;

window.addEventListener('message', function(event) {
    if (event.source !== window || !event.data) return;
    
    if (event.data.type === 'BEZURA_API_CREDENTIALS') {
        if (bezuraApiToken !== event.data.token || bezuraUserId !== event.data.userId) {
            bezuraApiToken = event.data.token;
            bezuraUserId = event.data.userId;
            console.log("[Bezura Poller] Credenciais atualizadas! Token e UserId obtidos. Iniciando poller das filas 'Meus'.");
            startApiPolling();
        }
    }
});

function startApiPolling() {
    if (bezuraPollingInterval) clearInterval(bezuraPollingInterval);
    
    bezuraPollingInterval = setInterval(async () => {
        if (!bezuraApiToken || !bezuraUserId) return;
        
        // Esta URL é específica para trazer a listagem das sessões ativas exclusivas do usuário ("Meus")
        const url = `https://api.app.bezura.com.br/chat/v6/session?skipCount=true&page=1&pageSize=50&includeDetails=All&statuses=IN_PROGRESS&userId=${bezuraUserId}&removePrivateDepartments=true&removeDistributedToAnother=true&sessionType=INDIVIDUAL&orderByDesc=lastinteractionat&myDepartmentsOnly=true&includeAssignedToMe=true`;
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': bezuraApiToken,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                
                let unreadCount = 0;
                
                if (data.items && Array.isArray(data.items)) {
                    data.items.forEach(session => {
                        // Verifica propriedades de n-lidos mais prováveis para cobrir o JSON invisível
                        const unread = session.unreadCount || session.unreadMessages || session.unread || session.notifications || 0;
                        unreadCount += typeof unread === 'number' ? unread : parseInt(unread, 10) || 0;
                    });
                }
                
                if (unreadCount > lastPolledUnreadCount) {
                    console.log(`[Bezura Poller] ⭐ NOVA MENSAGEM DETECTADA VIA API DE FUNDO! (${lastPolledUnreadCount} -> ${unreadCount})`);
                    
                    const currentTab = getCurrentBezuraTab();
                    if (currentTab === 'Meus') {
                        // Quando já está em Meus, a varredura visual de milissegundos pega e não queremos duplicação.
                        console.log("[Bezura Poller] Aba atual é 'Meus'. Deixando o observer DOM lidar com a notificação visual instantânea.");
                    } else {
                        // Força notificação universal quando o DOM da "Meus" está morto/desmontado
                        scheduleBezuraNotification("Badge detectado silenciosamente pela API Poller", null, 'API_POLLER');
                    }
                }
                
                lastPolledUnreadCount = unreadCount;
            }
        } catch(e) {
            console.warn("[Bezura Poller] Falha ao consultar a rede:", e.message);
        }
    }, 5000); // 5 segundos reflete a resposta "instantânea".
}