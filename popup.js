// popup.js - handles saving and loading the api key

document.addEventListener('DOMContentLoaded', () => {
    const keyInput = document.getElementById('sul-key');
    const saveBtn = document.getElementById('save-btn');

    // loads your saved key so the box isn't empty if u open it again
    chrome.storage.local.get(['sulApiKey'], (result) => {
        if (result.sulApiKey) {
            keyInput.value = result.sulApiKey;
        }
    });

    // saves the key to chrome storage when clicked
    saveBtn.addEventListener('click', () => {
        const key = keyInput.value.trim();
        
        chrome.storage.local.set({ sulApiKey: key }, () => {
            // green flash animation to confirm it saved
            saveBtn.textContent = "Saved!";
            saveBtn.style.background = "#5c8a00";
            
            setTimeout(() => {
                saveBtn.textContent = "Save Key";
                saveBtn.style.background = "#88b300";
            }, 1500);
        });
    });
});