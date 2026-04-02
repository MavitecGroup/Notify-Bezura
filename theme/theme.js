// theme/theme.js
// Este módulo lida exclusivamente com a personalização visual da interface da Bezura,
// injetando os estilos do "Tema Premium", o logotipo customizado, as cores aprimoradas e o botão "Adicionar Iframe".

const extensionLogoUrl = chrome.runtime.getURL("assets/icons/logoheader-menu.webp");

const CSS_CUSTOM_THEME = `
/* ====================== PALETA BEZURA PREMIUM v2 ====================== */
:root, body {
  --bezura-primary: #0ea5e9;
  --bezura-primary-dark: #0284c8;
  --bezura-accent: #22d3ee;
  --bezura-bg: #f0f9ff;
  --bezura-card: #ffffff;
  --bezura-border: #bae6fd;
}

/* ==================== MENU SUPERIOR (top navbar) ==================== */
header, .layout-header, header.bg-card, .header, .mat-toolbar, .top-bar, nav, .fuse-horizontal-navigation, app-header, .fuse-header,
.z-49.bg-card, .h-16.bg-card.shadow, .layout-header-content, div[class*="h-16"][class*="z-49"], .top-0.z-49 {
  background: linear-gradient(90deg, #0ea5e9, #0284c8) !important;
  box-shadow: 0 4px 20px rgba(14, 165, 233, 0.3) !important;
  border-bottom: 2px solid #22d3ee !important;
}

header .logo-text, header a, header span, .fuse-horizontal-navigation-item-title, .mat-toolbar span, .layout-header *,
.z-49.bg-card span, .h-16.bg-card.shadow span, div[class*="h-16"][class*="z-49"] span {
  color: #ffffff !important;
  text-shadow: 0 0 8px rgba(255,255,255,0.6);
}

.header .fuse-horizontal-navigation-item-active .fuse-horizontal-navigation-item-title {
  color: #fff !important;
  text-shadow: 0 0 15px #22d3ee;
}

/* ==================== SUBSTITUIÇÃO DA LOGO ==================== */
/* Remove o degradê e substitui a imagem via CSS pelo arquivo local da extensão */
header img.logo, header .logo, .fuse-logo, header a[translate="no"],
img[src*="logo-text.svg"], img[src*="logo.svg"], .layout-header img[src*="logo"] {
  content: url('${extensionLogoUrl}') !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0 !important;
  padding: 0 !important;
  margin: 0 10px !important;
  max-height: 40px !important; /* Ajusta a altura da logo */
  object-fit: contain !important;
}

header button.mat-icon-button, header button.mat-mdc-icon-button, .z-49.bg-card button.mat-icon-button,
.layout-header button.mat-icon-button, header .right-icons button, header .right-icons .icon-container,
.z-49 mat-icon.mat-icon-no-color {
    background-color: #ffffff !important;
    color: #0ea5e9 !important;
    border-radius: 50% !important; 
    padding: 6px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

/* Força a cor dos SVG do Sino e Ajustes para ficarem azuis em cima do fundo branco */
header button mat-icon svg, .z-49 mat-icon svg, header mat-icon svg, .layout-header mat-icon svg, header svg {
    color: #0ea5e9 !important;
    fill: #0ea5e9 !important;
}

/* ==================== MENU DROPDOWN (Painéis sobrepostos / Popups) ==================== */
/* Correção do contraste: Assegura que o texto das opções do menu fique em azul premium */
.cdk-overlay-pane .mat-menu-panel, .mat-menu-content {
  background-color: #ffffff !important;
  border: 1px solid #bae6fd !important;
  border-radius: 12px !important;
  box-shadow: 0 6px 15px rgba(0,0,0,0.1) !important;
}

/* Letras de Cada item de Menu, como do botão apps e outros da header */
.mat-menu-panel .mat-menu-item, .mat-mdc-menu-panel .mat-mdc-menu-item, 
.mat-menu-item *, .mat-mdc-menu-item *,
.fuse-horizontal-navigation-menu-panel .fuse-horizontal-navigation-menu-item * {
  color: #0ea5e9 !important;
  font-weight: 500 !important;
  text-shadow: none !important;
}

/* Cor do Ícone SVG/Font caso haja dentro do popup */
.mat-menu-panel .mat-menu-item mat-icon, .mat-menu-panel .mat-menu-item svg {
  color: #0ea5e9 !important;
  fill: #0ea5e9 !important;
}

.mat-menu-panel .mat-menu-item:hover, .mat-mdc-menu-panel .mat-mdc-menu-item:hover {
  background-color: #e0f2fe !important;
}

/* ==================== MENSAGENS RECEBIDAS (Azul Claro) ==================== */
.chat-message.contact .bg-card,
.message:not(.mine) .bg-card,
.message:not(.me) > .bg-card,
fuse-chat-message:not([is-mine="true"]) .bg-card,
.fuse-chat-message-contact .bg-card,
div.rounded-lg.bg-gray-100, div.rounded-lg.bg-blue-50, 
div.rounded-lg.dark\\:bg-gray-600, div.rounded-lg.dark\\:bg-primary-900,
/* Elemento HTML enviado reflete background white que pode estar vindo por outras classes */
div.inline-flex.rounded-md.bg-white, div.inline-flex.rounded-md.bg-default {
  background-color: #e0f2fe !important;
  border: 1px solid #bae6fd !important;
  border-radius: 16px 16px 16px 2px !important;
  overflow: hidden !important; /* <--- Remove vincos retangulares de backgrounds internos */
}

/* Cor da fonte do contato e textos internos (Azul escuro legível) */
.chat-message.contact .bg-card *,
.message:not(.mine) .bg-card *,
fuse-chat-message:not([is-mine="true"]) .bg-card *,
div.rounded-lg.bg-gray-100 *, div.rounded-lg.bg-blue-50 *,
div.rounded-lg.dark\\:bg-gray-600 *, div.rounded-lg.dark\\:bg-primary-900 *,
div.inline-flex.rounded-md.bg-white *, div.inline-flex.rounded-md.bg-default * {
  color: #0c4a6e !important;
}

/* ==================== OTIMIZAÇÃO DE BORDAS E CAMPOS (Quadrados Corrigidos) ==================== */
/* Devolve o arredondamento de elementos de input do painel (chat bar) sem deixar fundos quebrando a borda (vincos) */
input, textarea, .chat-input, .message-input, .input-container, .ql-container.ql-snow, input.mat-input-element, textarea.mat-input-element {
    border-radius: 20px !important;
    border: 1px solid #bae6fd !important;
    overflow: hidden !important;
}

/* ==================== ESTILO DOS BOTÕES (todo o sistema) ==================== */
.mat-button, .mat-stroked-button, .mat-flat-button, .h-button button,
button.mat-mdc-button {
  border-radius: 9999px !important;
  font-weight: 600 !important;
  text-transform: none !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  box-shadow: 0 0 10px rgba(34, 211, 238, 0.3) !important;
  background: rgba(255,255,255,0.95) !important;
  color: #0ea5e9 !important;
  border: 1.5px solid #bae6fd !important;
}

.mat-button:hover, .mat-stroked-button:hover, .h-button button:hover {
  background: #0ea5e9 !important;
  color: #ffffff !important;
  box-shadow: 0 0 20px rgba(14, 165, 233, 0.5) !important;
  transform: translateY(-1px);
}

button[color="primary"], .mat-primary, button.mat-mdc-raised-button.mat-primary {
  background: linear-gradient(135deg, #0ea5e9, #22d3ee) !important;
  color: #fff !important;
  border: none !important;
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.5) !important;
}

/* ==================== REMOÇÃO DO ROXO / INDIGO (Tags e Filtros) ==================== */
/* Força a placa "Todas" (bg-primary) ou avisos em topo de lista (bg-blue-700) para Azul */
.bg-primary, .bg-blue-600, .bg-blue-700, .bg-indigo-600, .bg-indigo-700 {
  background-color: #0ea5e9 !important;
  color: #ffffff !important;
}

/* Corrige hover nesses paineis */
.hover\\:bg-blue-800:hover, .hover\\:bg-indigo-700:hover, .hover\\:bg-primary-dark:hover {
  background-color: #0284c8 !important;
}

/* Letras de ícones de status/nomes que aparecem em indigo (roxos) */
.text-primary, .text-indigo-600, .text-indigo-700, .text-blue-700 {
  color: #0ea5e9 !important;
}

/* Fundo cinza das pequenas labels de tags, como o "Teste" que o usuário enviou, para harmonizar */
.bg-gray-200.text-indigo-700, div.text-indigo-700.bg-gray-200 {
  background-color: #e0f2fe !important;
  color: #0369a1 !important;
}

/* ==================== NOVO BOTÃO IFRAME NO HEADER ==================== */
header .right-icons, .top-bar .right-section, header .flex.items-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.iframe-quick-button {
  background-color: #ffffff !important;
  border: 1px solid #bae6fd !important;
  border-radius: 9999px !important;
  padding: 6px 16px !important;
  font-weight: 600 !important;
  color: #0ea5e9 !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  transition: all 0.2s ease !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  white-space: nowrap !important;
  pointer-events: auto !important; /* Força clique */
}

.iframe-quick-button:hover {
  background-color: #f0f9ff !important;
  color: #0284c8 !important;
  border-color: #7dd3fc !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
}
\`;

function injectIframeButtonLoop() {
  if (window.iframeBtnInterval) clearInterval(window.iframeBtnInterval);
  window.iframeBtnInterval = setInterval(() => {
    let existingBtn = document.getElementById('bezura-iframe-btn');
    if (existingBtn) return; // Ja existe
    
    // Procura o icone de sino ou a tag <notifications> direta no DOM
    const targetTag = document.querySelector('notifications') || document.querySelector('mat-icon[data-mat-icon-name*="notification"], mat-icon[data-mat-icon-name*="bell"]');
    let targetNode = targetTag;
    
    if (targetNode && targetNode.tagName.toLowerCase() !== 'notifications') {
        const parentBtn = targetNode.closest('button, a, .mat-icon-button, div.icon-container, .flex.items-center');
        if (parentBtn) targetNode = parentBtn;
    }
    
    // Fallback agressivo se o sino não for achado:
    if (!targetNode) {
        let avatarOrAdjust = Array.from(document.querySelectorAll('.z-49 button, header button')).find(
            b => (b.textContent || '').includes('settings') || b.querySelector('img.avatar') || b.querySelector('mat-icon[data-mat-icon-name="settings"]') || b.closest('user') || b.closest('app-phone-number')
        );
        if (avatarOrAdjust) targetNode = avatarOrAdjust;
    }

    if (targetNode && targetNode.parentNode) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = \`
          <!-- NOVO BOTÃO IFRAME - BEZURA -->
          <button id="bezura-iframe-btn" class="iframe-quick-button mat-focus-indicator mat-button mat-button-base" style="margin-right: 15px; cursor: pointer; z-index: 999999; height: 36px; pointer-events: auto !important; position: relative;">
            <span style="font-size:16px; margin-right:4px; pointer-events: none;">📌</span>
            <span style="font-weight: 700; color: #0ea5e9 !important; text-shadow: none !important; pointer-events: none;">Adicionar Iframe</span>
          </button>
        \`;
        const btn = wrapper.querySelector('#bezura-iframe-btn');
        
        // Inserir exatamente antes do elemento alvo (Sino ou Configurações)
        targetNode.parentNode.insertBefore(btn, targetNode);
    }
  }, 2000);
}

// ==========================================
// FORÇA O CLIQUE DO BOTÃO IFRAME (Bypass Angular)
// ==========================================
document.addEventListener('click', function(e) {
  const btn = e.target.closest('#bezura-iframe-btn');
  if (btn) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log("[Bezura Notification] Clique detectado no botão iframe!");
    const url = prompt("Cole a URL do iframe que deseja adicionar:");
    if (url) {
      alert("✅ Iframe adicionado! (Logado no console)\\n\\nURL salva: " + url);
      console.log("[Bezura Notification] Novo Iframe: " + url);
    }
  }
}, true); // UseCapture true para pegar o evento na fase de descida, antes da Bezura

function applyCustomTheme(enable) {
  let existingStyle = document.getElementById('bezura-custom-neon-theme');
  let existingBtn = document.getElementById('bezura-iframe-btn');

  if (enable) {
    if (!existingStyle) {
      const styleEle = document.createElement('style');
      styleEle.id = 'bezura-custom-neon-theme';
      styleEle.textContent = CSS_CUSTOM_THEME;
      document.head.appendChild(styleEle);
    }
    // Lança loop vigilante para botão do iframe (Caso SPA reconstrua o header)
    injectIframeButtonLoop();
  } else {
    if (existingStyle) {
      existingStyle.remove();
    }
    if (existingBtn) {
      existingBtn.remove();
    }
    if (window.iframeBtnInterval) clearInterval(window.iframeBtnInterval);
  }
}

// ==========================================
// INTEGRAÇÃO COM AS MENSAGENS E BACKGROUND
// ==========================================

// Listener global para reagir instantaneamente a mudanças no Popup e ativar a UI
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.customThemeEnabled) {
    applyCustomTheme(changes.customThemeEnabled.newValue);
  }
});

// Ao inicializar o contentScript, verificar se o tema deve ser injetado.
chrome.storage.local.get(['customThemeEnabled'], (res) => {
  if (res.customThemeEnabled === true) {
    applyCustomTheme(true);
  }
});
