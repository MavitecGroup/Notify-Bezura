# 🔔 Notify-Bezura v2.0.0

Bem-vindo à extensão oficial **Bezura Notification**! Esta ferramenta foi desenhada para revolucionar o atendimento do seu SaaS, oferecendo alertas precisos, controle sonoro e zero perdas de novos leads. 🚀

---

## 🌟 O que há de novo na Versão 2.0.0?

Nós reformulamos completamente o "motor" da extensão por baixo dos panos para garantir 100% de estabilidade e adicionamos funcionalidades muito pedidas pelos atendentes!

### 🛠️ 1. Novo Motor: "API Poller Invisível"
Antes (v1.x), a extensão tentava "ler" as telas do painel como um humano leria, o que falhava quando as abas não estavam renderizadas na tela (ex: aba 'Meus' oculta).
Agora (v2.0.0), a extensão **capta as credenciais diretamente da rede** e varre o Banco de Dados do Bezura a cada 5 segundos de forma silenciosa e "invisível".
✔️ **Resultado:** Você será notificado instantaneamente de novos Leads na aba "Meus", mesmo se você estiver fisicamente focado nas abas "Novos" ou "Outros"!

### 🎵 2. Painel de Customização de Áudio
O popup vermelho e branco (`ui/alert.html`) foi redesenhado e agora conta com um botão de **Configurações (⚙️)**.
✔️ Adicionada função que permite bloquear o som da notificação com um clique (Mute).
✔️ Adicionado um menu suspenso nativo onde o usuário pode escolher seu próprio **Toque de Notificação** (Entre o clássico do Google e mais de 7 toques customizados incluídos, como _iOS, Pings de Sistema, ou Carros_). O áudio escolhido é salvo e lembrado para sempre!

### 🔇 3. Fim dos Falsos-Positivos e Aba Mestre (Master Toggle)
A extensão aprendeu a calar a boca quando não é necessária!
✔️ **Modo Não Perturbe:** Agora existe um atalho na barra do Chrome! Clique no ícone da extensão para acessar a Mini Aba Mestre e silenciar instantaneamente todas as notificações de novas mensagens. Trabalhe em paz e religue apenas quando quiser.
✔️ Se a origem de uma nova mensagem for um lead nas abas "Novos" ou "Outros", o alerta visual/sonoro será ignorado para focar apenas nas suas conversas ativas.
✔️ Se você **já estiver ativamente logado na aba 'Meus' e focado na tela**, a extensão entende que você já "viu" a mensagem e silenciará o toque para não te assustar à toa durante seu trabalho de digitação!

---

## 📦 Estrutura do Código:
Na raiz ficam só `manifest.json` e `README.md`; o restante está agrupado por função:

- **`manifest.json`**: Regras da extensão no Chrome (inclui liberação de `.mp3` e ícones em `web_accessible_resources`).
- **`scripts/`**: Lógica JavaScript — `background.js` (service worker), `content.js` (motor / poller), `interceptor.js` (captura do JWT na rede), `popup.js` e `alert.js`.
- **`ui/`**: Páginas HTML — `popup.html` (ação da extensão) e `alert.html` (janela de notificação).
- **`theme/`**: `theme.js` — tema premium injetado no app Bezura.
- **`assets/icons/`** e **`assets/songs/`**: Ícones, logos e toques em `.mp3`.
- **`releases/`**: Pacotes `.zip` de versões anteriores (opcional).

---

## 💡 Como instalar para testes (Desenvolvedor):
1. Acesse `chrome://extensions` no seu navegador Chrome.
2. Ative o **Modo do Desenvolvedor** no topo superior direito.
3. Clique no botão superior esquerdo **Carregar sem compactação**.
4. Selecione esta pasta `Notify-Bezura`.
5. Faça login na plataforma Bezura normalmente, receba seus atendimentos, gerencie os toques na engrenagem e aproveite!

---

## 🏷️ Versionamento e Histórico (Changelog)

- **v1.0.0**:
  - Lançamento inicial. Alerta básico em tela que "lia" as classes de número no HTML da plataforma Bezura.
- **v1.1.0**:
  - Correção primária nas permissões do `storage` exigidas pela Web Store do Google. Primeira tela de interruptor simples implementada no popup.
- **v1.2.0**:
  - Restrição inteligente contra sons repetitivos e mensagens falsas na DOM. Restrição de barulhos se a aba atual está focada e visível (`document.hasFocus()`).
- **v2.0.0** *(Atual)*:
  - **Reescrita Arquitetural:** Mudança revolucionária de web-scrape para um "API Poller Invisível" capaz de detectar abas independentemente da renderização visual graças ao script pescador `interceptor.js`.
  - **Sons Customizáveis:** Acoplada a capacidade do sistema ler `assets/songs/` e lista retrátil pra escolha de mp3 pelo próprio atendente.
  - **Action Popup & Premium Theme:** Transformação com Menu Master para desativar 100% o motor. E botão "Tema Personalizado" que aplica visual Premium "Neon" V2.0 e injeta Botões Iframe nativos direto no front End do Bezura!

---
_A escalabilidade do seu atendimento está salva! Qualquer dúvida ou pedido de novas features, basta realizar um update._ 🛡️✨