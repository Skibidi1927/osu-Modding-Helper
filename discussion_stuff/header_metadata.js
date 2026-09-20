// header_metadata.js - Native Layered Box Model (Powered by osu! API v2)

async function injectMetadataBox() {
    if (document.querySelector('.custom-metadata-block')) {
        if (window.customMapCache) {
            updateSelectedBeatmapStats();
        }
        return;
    }

    const mapDataNode = document.getElementById('json-beatmapset');
    if (!mapDataNode) return;
    const mapData = JSON.parse(mapDataNode.textContent);

    const filterToolbar = document.querySelector('.beatmapset-discussions-toolbar');
    if (!filterToolbar) return;

    const setId = mapData.id;
    const source = mapData.source || 'None';
    const tags = mapData.tags || 'None';

    const metaBlock = document.createElement('div');
    metaBlock.className = 'custom-metadata-block';
    
    metaBlock.style.cssText = 'display: flex; width: calc(100%); min-height: 78px; background: hsl(var(--hsl-b5)); border-radius: 6px; margin-bottom: 15px; padding: 0 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.2); overflow: hidden;';

    const spinner = '<i class="fas fa-spinner fa-spin"></i>';

    // Inject the box with everything set to a spinner initially, AND disabled copy buttons!
    metaBlock.innerHTML = `
        <div style="display: flex; flex: 1 1 auto; width: 100%; margin-bottom: 10px; background: hsl(var(--hsl-b4));">
            <div style="flex: 0 0 380px; width: 380px; padding: 12px 20px; display: flex; flex-direction: column; justify-content: center; gap: 6px;">
                <div class="custom-metadata-line"><strong>Source:</strong> <code class="custom-tags-code" id="custom-source-loader">${spinner}</code><button type="button" class="btn-osu-big custom-copy-button custom-copy-button--source btn-osu-big--disabled" id="copy-source-genre" title="Copy source and genre" aria-label="Copy source and genre" disabled><span class="btn-osu-big__content"><span class="btn-osu-big__left"><span class="btn-osu-big__text-top">Copy</span></span><span class="btn-osu-big__icon"><span class="fa fa-fw"><span class="fas fa-copy"></span></span></span></span></button></div>
                <div class="custom-metadata-line"><strong>Genre:</strong> <code class="custom-tags-code" id="custom-genre-loader">${spinner}</code><span class="custom-metadata-separator">/</span><code class="custom-tags-code" id="custom-language-loader">${spinner}</code></div>
            </div>

            <div style="flex: 1; padding: 12px 20px; display: flex; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px; width: 100%; font-size: 13px; line-height: 1.5; color: #ccc; word-wrap: break-word;">
                    <div style="flex: 1;"><strong style="color: #fff;">Tags:</strong> <code class="custom-tags-code" id="custom-tags-loader">${spinner}</code></div><button type="button" class="btn-osu-big custom-copy-button btn-osu-big--disabled" id="copy-tags" title="Copy tags" aria-label="Copy tags" disabled><span class="btn-osu-big__content"><span class="btn-osu-big__left"><span class="btn-osu-big__text-top">Copy</span></span><span class="btn-osu-big__icon"><span class="fa fa-fw"><span class="fas fa-copy"></span></span></span></span></button>
                </div>
            </div>
        </div>
    `;

    filterToolbar.parentNode.insertBefore(metaBlock, filterToolbar);

    // This function unlocks the UI only when authentication passes
    function unlockMetadataUI(genre, lang) {
        const sourceSpan = metaBlock.querySelector('#custom-source-loader');
        const tagsSpan = metaBlock.querySelector('#custom-tags-loader');
        const genreSpan = metaBlock.querySelector('#custom-genre-loader');
        const languageSpan = metaBlock.querySelector('#custom-language-loader');
        
        if (sourceSpan) sourceSpan.textContent = source;
        if (tagsSpan) tagsSpan.textContent = tags;
        if (genreSpan) genreSpan.textContent = genre;
        if (languageSpan) languageSpan.textContent = lang;

        // Unlock the Left Copy Button
        const leftCopyBtn = metaBlock.querySelector('#copy-source-genre');
        if (leftCopyBtn) {
            leftCopyBtn.disabled = false;
            leftCopyBtn.classList.remove('btn-osu-big--disabled');
            leftCopyBtn.onclick = () => {
                const payload = `Source: ${source}\nGenre: ${genre}\nLanguage:${lang || 'none'}`;
                navigator.clipboard.writeText(payload);
                console.log('Copied source, genre, and language.');
            };
        }

        // Unlock the Right Copy Button
        const rightCopyBtn = metaBlock.querySelector('#copy-tags');
        if (rightCopyBtn) {
            rightCopyBtn.disabled = false;
            rightCopyBtn.classList.remove('btn-osu-big--disabled');
            rightCopyBtn.onclick = () => {
                navigator.clipboard.writeText(`\`\`\`${tags}\`\`\``);
                console.log('Copied tags.');
            };
        }

        // Inject the HP and OD stats row
        updateSelectedBeatmapStats();
    }

    // --- API V2 FETCH ---
    if (window.customMapCache && window.customMapCache.id === setId) {
        unlockMetadataUI(window.customMapCache.genre, window.customMapCache.language);
        return;
    }

    function requestBeatmapData(retries = 3) {
        chrome.runtime.sendMessage({ action: 'fetchBeatmap', setId: setId }, (response) => {
            if (chrome.runtime.lastError || (response && response.error === 'not_authenticated')) {
                if (retries > 0) {
                    setTimeout(() => requestBeatmapData(retries - 1), 300);
                    return;
                }
                
                if (response && response.error === 'not_authenticated') {
                    showAuthWarningToast();
                }
                return; 
            }

            if (response && response.data) {
                const genre = response.data.genre ? response.data.genre.name : 'Unknown';
                const language = response.data.language ? response.data.language.name : 'Unknown';
                
                window.customMapCache = { id: setId, genre, language };
                unlockMetadataUI(genre, language);
            } else {
                unlockMetadataUI('Error', 'Error');
            }
        });
    }

    requestBeatmapData();
}

function showAuthWarningToast() {
    if (document.getElementById('kmh-auth-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'kmh-auth-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 25px;
        right: 25px;
        background: #1c242e;
        border-left: 4px solid hsl(200, 80%, 55%);
        color: #fff;
        padding: 16px 20px;
        border-radius: 6px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.5);
        z-index: 10000;
        font-family: Torus, Inter, sans-serif;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        opacity: 0;
        transform: translateY(10px);
        transition: all 0.3s ease;
    `;
    
    toast.innerHTML = `
        <div style="font-weight: bold; color: hsl(200, 80%, 65%);">
            <i class="fas fa-exclamation-circle" style="margin-right: 5px;"></i> Modding Helper
        </div>
        <div style="color: #a39eb5; font-size: 13px;">
            To view full beatmap metadata, please click the <strong>Gear icon</strong> <i class="fas fa-cog"></i> below the discussion box and <strong>Connect your osu! Account</strong>.
        </div>
    `;
    
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 7000);
}

function updateSelectedBeatmapStats() {
    const mapDataNode = document.getElementById('json-beatmapset');
    const statsContainer = document.querySelector('.beatmap-discussions-header-top__basic-stats');
    if (!mapDataNode || !statsContainer) return;

    const mapData = JSON.parse(mapDataNode.textContent);
    const urlParts = window.location.pathname.split('/');
    const discussionIndex = urlParts.indexOf('discussion');
    const urlBeatmapId = discussionIndex !== -1 ? Number(urlParts[discussionIndex + 1]) : NaN;
    const selectedBeatmap = document.querySelector('.beatmap-list__item--current[data-id]');
    const selectedBeatmapId = selectedBeatmap ? Number(selectedBeatmap.dataset.id) : NaN;
    const activeModeLink = document.querySelector('.game-mode-link--active[data-mode]');
    const activeMode = activeModeLink ? activeModeLink.dataset.mode : null;

    let targetMap = Number.isInteger(urlBeatmapId)
        ? mapData.beatmaps?.find(beatmap => beatmap.id === urlBeatmapId)
        : null;
    if (!targetMap && Number.isInteger(selectedBeatmapId)) {
        targetMap = mapData.beatmaps?.find(beatmap => beatmap.id === selectedBeatmapId);
    }
    if (!targetMap && activeMode) {
        targetMap = mapData.beatmaps?.find(beatmap => beatmap.mode === activeMode);
    }
    if (!targetMap) targetMap = mapData.beatmaps?.[0];
    if (!targetMap) return;

    const statsRowId = 'custom-beatmap-advanced-stats';
    let statsRow = document.getElementById(statsRowId);
    if (!statsRow) {
        statsRow = document.createElement('div');
        statsRow.id = statsRowId;
        statsRow.className = 'beatmapset-stats__row beatmapset-stats__row--advanced custom-discussion-stats';
        statsContainer.appendChild(statsRow);
    }

    const hpDrain = Number(targetMap.drain);
    const accuracy = Number(targetMap.accuracy);
    const statValue = value => Number.isFinite(value) ? value.toFixed(2).replace(/\.00$/, '') : '-';
    const bar = (className, value, maximum) => {
        const fill = Number.isFinite(value) ? Math.max(0, Math.min(100, value / maximum * 100)) : 0;
        return `<td class="beatmap-stats-table__bar"><div class="bar bar--beatmap-stats ${className}" style="--fill: ${fill}%;"><div class="bar__fill"></div></div></td>`;
    };
    const row = (label, value, className, maximum) => `<tr><th class="beatmap-stats-table__label">${label}</th>${bar(className, value, maximum)}<td class="beatmap-stats-table__value">${statValue(value)}</td></tr>`;
    statsRow.innerHTML = `
        <table class="beatmap-stats-table">
            <tbody>
                ${row('HP Drain', hpDrain, 'bar--beatmap-stats-drain', 10)}
                ${row('Accuracy', accuracy, 'bar--beatmap-stats-accuracy', 10)}
            </tbody>
        </table>
    `;
}