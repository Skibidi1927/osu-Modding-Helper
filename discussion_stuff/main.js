// main.js - The Invincible Engine
console.log("Karin's Modding Helper: Engine Started");

window.addEventListener('mod-helper-settings-changed', () => {
    if (!isModHelperFeatureEnabled('headerMetadata')) {
        document.querySelector('.custom-metadata-block')?.remove();
        document.getElementById('custom-beatmap-advanced-stats')?.remove();
    }
    if (!isModHelperFeatureEnabled('discussionDownload')) {
        document.querySelector('.custom-download-btn')?.closest('.beatmap-discussions-header-bottom__details')?.remove();
    }
    document.querySelector('.sussy-nuke-btn')?.closest('.beatmap-discussion-nominations__item')?.replaceChildren();
    if (!isModHelperFeatureEnabled('rcBook')) {
        document.querySelector('.rc-lens-btn')?.remove();
        document.getElementById('custom-rc-panel')?.remove();
    }
});

function runInjections() {
    try {
        // Stop the script from trying to inject things if u are on the "info" tab
        if (!window.location.pathname.includes('/discussion')) return;

        if (isModHelperFeatureEnabled('headerMetadata') && typeof injectMetadataBox === 'function' && !document.querySelector('.custom-metadata-block')) {
            injectMetadataBox(); 
        }

        if (isModHelperFeatureEnabled('headerMetadata') && typeof updateSelectedBeatmapStats === 'function') {
            updateSelectedBeatmapStats();
        }

        if (isModHelperFeatureEnabled('discussionDownload') && typeof upgradeDownloadButton === 'function') {
            upgradeDownloadButton();
        }

        if (typeof injectToolbar === 'function' && !document.querySelector('.custom-modding-toolbar')) {
            injectToolbar();
        }

        const textBox = document.querySelector('.beatmap-discussion-new__message-area');
        if (isModHelperFeatureEnabled('imageUploader') && typeof handleImagePaste === 'function' && textBox && !textBox.dataset.uploaderAttached) {
            handleImagePaste();
        }

        if (isModHelperFeatureEnabled('rcBook') && typeof toggled_RC_book === 'function' && document.querySelector('.custom-modding-toolbar')) {
            toggled_RC_book();
        }

    } catch (e) {
        console.error("Modding Helper Error:", e);
    }
}

// THE FIX: The Watchdog. Checks the page every 250ms. 
// If osu! deletes your buttons by changing tabs, it puts them right back.
setInterval(runInjections, 250);