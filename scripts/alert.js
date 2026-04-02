function fecharPopup() {
    window.close();
}

function abrirBezura() {
    // Tenta focar aba existente do Bezura
    chrome.tabs.query({ url: "*://*.bezura.com.br/*" }, (tabs) => {
        if (tabs && tabs.length > 0) {
            // Foca a primeira aba encontrada
            chrome.tabs.update(tabs[0].id, { active: true });
            chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
            // Se não houver aba aberta, cria uma nova
            chrome.tabs.create({ url: 'https://app.bezura.com.br/' });
        }
        fecharPopup();
    });
}

// Nova função para fechar e retornar, se necessário (assumindo que fecharERetornar é uma nova função)
function fecharERetornar() {
    // Implementação da função fecharERetornar, se for diferente de fecharPopup
    fecharPopup(); // Por enquanto, assume o mesmo comportamento
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('openBtn').addEventListener('click', abrirBezura);

    const soundToggle = document.getElementById('soundToggle');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsDropdown = document.getElementById('settingsDropdown');
    const ringtoneSelect = document.getElementById('ringtoneSelect');

    // Recupera as opções de som 
    chrome.storage.local.get(['playNotificationSound', 'selectedRingtone'], (res) => {
        soundToggle.checked = res.playNotificationSound !== false; // Padrão verdadeiro

        if (res.selectedRingtone) {
            ringtoneSelect.value = res.selectedRingtone;
        } else {
            ringtoneSelect.value = 'default';
        }
    });

    // Salva preferência do Toggle
    soundToggle.addEventListener('change', () => {
        const isChecked = soundToggle.checked;
        chrome.storage.local.set({ playNotificationSound: isChecked });
    });

    // Mostra/Oculta painel da engrenagem
    settingsBtn.addEventListener('click', () => {
        settingsDropdown.classList.toggle('active');
    });

    // Salva preferência do Select e toca áudio de teste
    ringtoneSelect.addEventListener('change', () => {
        const selected = ringtoneSelect.value;
        chrome.storage.local.set({ selectedRingtone: selected });

        if (soundToggle.checked) {
            let audioUrl = "";
            if (selected === 'default') {
                audioUrl = "https://actions.google.com/sounds/v1/alarms/beep_short.ogg";
            } else {
                // Áudios da pasta extensions/songs
                audioUrl = chrome.runtime.getURL("assets/songs/" + selected);
            }

            const audio = new Audio(audioUrl);
            audio.volume = 0.5;
            audio.play().catch(e => console.warn("[Bezura Notification] Preview de som bloqueado", e));
        }
    });

    // Atualiza o listener do closeBtn para a nova função fecharERetornar
    document.getElementById('closeBtn').addEventListener('click', fecharERetornar);

    // Foca automaticamente a janela ao abrir para chamar atenção
    window.focus();
});
