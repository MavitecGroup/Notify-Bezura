document.addEventListener('DOMContentLoaded', () => {
    const masterToggle = document.getElementById('masterToggle');
    const themeToggle = document.getElementById('themeToggle');

    // Recupera o estado do storage
    chrome.storage.local.get(['masterNotificationsEnabled', 'customThemeEnabled'], (res) => {
        masterToggle.checked = res.masterNotificationsEnabled !== false; // Padrão ligado
        themeToggle.checked = res.customThemeEnabled === true; // Padrão desligado (Opt-in)
    });

    masterToggle.addEventListener('change', () => {
        chrome.storage.local.set({ masterNotificationsEnabled: masterToggle.checked });
    });

    themeToggle.addEventListener('change', () => {
        chrome.storage.local.set({ customThemeEnabled: themeToggle.checked });
    });
});
