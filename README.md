# 🔔 Notify-Bezura v2.1.3

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

### 🔗 4. Link do cadastro + chat Bezura
Com a aba ativa em uma URL do chat no formato `.../sessions/<UUID>...`, o popup exibe o link público **`https://cadastro.bezura.com.br/?<UUID>`** (sem nome de parâmetro: só `?` + UUID), alinhado ao formulário de cadastro.

- Ao abrir o popup, o link é calculado a partir da **aba ativa**.
- Dois botões: **ABRIR** (abre o cadastro numa nova aba) e **ENVIAR** (envia o link na conversa via API). **Em cada clique**, a extensão **relê a URL da aba ativa** e atualiza o campo antes de agir, para evitar link desatualizado.
- **ENVIAR** (opcional): `POST` na rota de mensagens da sessão (host em `host_permissions` no `manifest.json`), corpo `{ "text": "..." }`. Token Bearer em `chrome.storage.local` → chave **`bezuraApiToken`** (página de opções). O pedido HTTP é feito a partir do contexto **MAIN** de **app.bezura.com.br** (`scripting`), não do service worker, para não receber `Origin not allowed` (`chrome-extension://`). Mantenha **pelo menos uma aba do app Bezura aberta**.

**Segurança:** o token transita até o contexto da página do Bezura só no momento do envio (não fica no código-fonte). Não commite tokens. Quem controla scripts maliciosos na origem do Bezura não é este repositório — use perfil/navegador confiável.

**Nota técnica:** o `manifest.json` precisa declarar em `host_permissions` o domínio exato do endpoint de mensagens usado em produção pelo stack Bezura (URL fixa do provedor). Isso não altera a marca exibida na extensão.

---

## 📦 Estrutura do Código:
Na raiz ficam só `manifest.json` e `README.md`; o restante está agrupado por função:

- **`manifest.json`**: Manifest V3 — permissões (`tabs`, `activeTab`, `storage`, `alarms`, `cookies`, `scripting`), `host_permissions` (app, cadastro e API de mensagens), `options_page`, `web_accessible_resources` (interceptor, sons, ícones).
- **`scripts/`**: `background.js` (service worker + envio ao chat via página), `content.js`, `interceptor.js`, `popup.js`, `alert.js`, `options.js`.
- **`ui/`**: `popup.html` + `popup.css` (ação da extensão), `alert.html`, `options.html` (token da API).
- **`theme/`**: `theme.js` — tema premium injetado no app Bezura.
- **`assets/icons/`** e **`assets/songs/`**: Ícones, logos e toques em `.mp3`.
- **`releases/`**: Pacotes `.zip` de versões anteriores (opcional).

---

## 💡 Como instalar para testes (Desenvolvedor):
1. Acesse `chrome://extensions` no Chrome ou Edge (Chromium).
2. Ative o **Modo do desenvolvedor**.
3. **Carregar sem compactação** e selecione a pasta raiz do projeto (`Notify-Bezura`).
4. Após atualizar arquivos, use **Recarregar** na ficha da extensão.
5. Faça login no Bezura; para **ENVIAR** no chat, configure o token em **Opções** e mantenha uma aba em `app.bezura.com.br` aberta.

---

## 🏷️ Versionamento e Histórico (Changelog)

- **v1.0.0**:
  - Lançamento inicial. Alerta básico em tela que "lia" as classes de número no HTML da plataforma Bezura.
- **v1.1.0**:
  - Correção primária nas permissões do `storage` exigidas pela Web Store do Google. Primeira tela de interruptor simples implementada no popup.
- **v1.2.0**:
  - Restrição inteligente contra sons repetitivos e mensagens falsas na DOM. Restrição de barulhos se a aba atual está focada e visível (`document.hasFocus()`).
- **v2.0.0**:
  - **Reescrita Arquitetural:** Mudança revolucionária de web-scrape para um "API Poller Invisível" capaz de detectar abas independentemente da renderização visual graças ao script pescador `interceptor.js`.
  - **Sons Customizáveis:** Acoplada a capacidade do sistema ler `assets/songs/` e lista retrátil pra escolha de mp3 pelo próprio atendente.
  - **Action Popup & Premium Theme:** Transformação com Menu Master para desativar 100% o motor. E botão "Tema Personalizado" que aplica visual Premium "Neon" V2.0 e injeta Botões Iframe nativos direto no front End do Bezura!
- **v2.1.0**:
  - Link para `cadastro.bezura.com.br/?<sessionId>` a partir da URL do chat; ações no popup e envio opcional ao chat com token nas opções.
- **v2.1.1**:
  - Envio via `scripting` + contexto da página do app (corrige `HTTP 500: Origin not allowed` no service worker).
- **v2.1.2**:
  - Nomenclatura Bezura no fluxo de chat; chave `bezuraApiToken` com migração automática da chave legada de storage.
- **v2.1.3** *(Atual)*:
  - Popup do cadastro simplificado: apenas **ABRIR** e **ENVIAR**; em cada clique o link é recalculado a partir da aba ativa.


---
_A escalabilidade do seu atendimento está salva! Qualquer dúvida ou pedido de novas features, basta realizar um update._ 🛡️✨