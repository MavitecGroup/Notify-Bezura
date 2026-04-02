// interceptor.js
// Injetado diretamente no contexto da página (MAIN world) para acessar as variáveis globais reais
(function() {
    console.log("[Bezura Interceptor] Inicializado. Capturando credenciais de rede...");

    function broadcastCredentials(authHeader, url) {
        if (!authHeader) return;
        const userIdMatch = url.match(/userId=([a-f0-9\-]+)/i);
        if (userIdMatch) {
            window.postMessage({
                type: 'BEZURA_API_CREDENTIALS',
                token: authHeader,
                userId: userIdMatch[1]
            }, '*');
        }
    }

    // 1. Interceptar chamadas FETCH
    const origFetch = window.fetch;
    window.fetch = async function(...args) {
        try {
            let url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
            let auth = null;

            if (args[1] && args[1].headers) {
                if (args[1].headers instanceof Headers) {
                    auth = args[1].headers.get('Authorization') || args[1].headers.get('authorization');
                } else {
                    for (let key in args[1].headers) {
                        if (key.toLowerCase() === 'authorization') {
                            auth = args[1].headers[key];
                        }
                    }
                }
            }
            if (!auth && args[0] instanceof Request) {
                auth = args[0].headers.get('Authorization');
            }

            if (auth && url.includes('bezura.com.br')) {
                broadcastCredentials(auth, url);
            }
        } catch(e) {}
        return origFetch.apply(this, args);
    };

    // 2. Interceptar chamadas XHR
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._url = url;
        return origOpen.call(this, method, url, ...rest);
    };

    const origSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function(header, value) {
        if (header.toLowerCase() === 'authorization') {
            broadcastCredentials(value, this._url);
        }
        return origSetRequestHeader.call(this, header, value);
    };
})();
