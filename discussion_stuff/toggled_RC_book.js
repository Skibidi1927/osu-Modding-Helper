function toggled_RC_book() {
    const toolbars = document.querySelectorAll('.custom-modding-toolbar');
    if (!toolbars.length) return;

    const mapDataNode = document.getElementById('json-beatmapset');
    if (!mapDataNode) return;
    const mapData = JSON.parse(mapDataNode.textContent);

    const urlParts = window.location.pathname.split('/');
    const discussionIndex = urlParts.indexOf('discussion');
    const urlBeatmapId = discussionIndex !== -1 ? Number(urlParts[discussionIndex + 1]) : NaN;
    const selectedBeatmap = document.querySelector('.beatmap-list__item--current[data-id]');
    const selectedBeatmapId = selectedBeatmap ? Number(selectedBeatmap.dataset.id) : NaN;
    const activeModeLink = document.querySelector('.game-mode-link--active[data-mode]');
    const activeMode = activeModeLink ? activeModeLink.dataset.mode : null;

    let mode = 'osu';
    let targetMap = null;
    if (mapData.beatmaps && mapData.beatmaps.length > 0) {
        targetMap = Number.isInteger(urlBeatmapId)
            ? mapData.beatmaps.find(beatmap => beatmap.id === urlBeatmapId)
            : null;

        if (!targetMap && Number.isInteger(selectedBeatmapId)) {
            targetMap = mapData.beatmaps.find(beatmap => beatmap.id === selectedBeatmapId);
        }

        if (!targetMap && activeMode) {
            targetMap = mapData.beatmaps.find(beatmap => beatmap.mode === activeMode);
        }

        if (!targetMap) targetMap = mapData.beatmaps[0];
        mode = targetMap.mode;
    }

    const difficultyRating = targetMap && Number.isFinite(Number(targetMap.difficulty_rating))
        ? Number(targetMap.difficulty_rating)
        : null;
    const difficultyName = targetMap?.version || 'current difficulty';
    let difficultyRange = 'unknown star range';
    if (difficultyRating !== null) {
        if (difficultyRating < 1.81) difficultyRange = 'easy';
        else if (difficultyRating < 2.51) difficultyRange = 'normal';
        else if (difficultyRating < 3.51) difficultyRange = 'hard';
        else if (difficultyRating < 4.25) difficultyRange = 'insane';
        else difficultyRange = 'expert';
    }

    const difficultyTier = difficultyRating === null
        ? 'easy'
        : difficultyRating < 1.81
            ? 'easy'
            : difficultyRating < 2.51
                ? 'normal'
                : difficultyRating < 3.51
                    ? 'hard'
                    : difficultyRating < 4.25
                        ? 'insane'
                        : 'expert';

    const rcLinks = {
        osu: {
            easy: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21#:~:text=Expert-,Easy,-Rules',
            normal: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21#:~:text=4%20or%20lower.-,Normal,-Rules',
            hard: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21#:~:text=5%20or%20lower.-,Hard,-Rules',
            insane: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21#:~:text=6%20or%20lower.-,Insane,-Rules',
            expert: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21#:~:text=7%20or%20lower.-,Expert,-Rules'
        },
        taiko: {
            easy: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21taiko#:~:text=16%E2%80%9320%20beats-,Kantan,-Rules',
            normal: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21taiko#:~:text=more1.-,Futsuu,-Rules',
            hard: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21taiko#:~:text=more1.-,Muzukashii,-Rules',
            insane: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21taiko#:~:text=more1.-,Oni,-Rules',
            expert: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21taiko#:~:text=more1.-,Inner%20Oni,-Guidelines'
        },
        fruits: {
            easy: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21catch#:~:text=%2D-,Cup,-Rules',
            normal: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21catch#:~:text=2.5%20or%20lower.-,Salad,-Rules',
            hard: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21catch#:~:text=3%20or%20lower.-,Platter,-Rules',
            insane: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21catch#:~:text=3.5%20or%20lower.-,Rain,-Rules',
            expert: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21catch#:~:text=4%20or%20lower.-,Overdose,-Rules'
        },
        mania: {
            easy: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21mania#:~:text=guidelines%20when%20applicable.-,Easy,-Rules',
            normal: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21mania#:~:text=than%20two%20columns.-,Normal,-Rules',
            hard: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21mania#:~:text=cannot%20reasonably%20handle.-,Hard,-Guidelines',
            insane: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21mania#:~:text=2/1%20beats.-,Insane,-Guidelines',
            expert: 'https://osu.ppy.sh/wiki/en/Ranking_criteria/osu%21mania#:~:text=be%20used%20sparingly.-,Expert,-Guidelines'
        }
    };

    const rcLink = (rcLinks[mode] || rcLinks.osu)[difficultyTier];
    const displayMode = mode === 'osu' ? '' : mode === 'fruits' ? 'catch' : mode;

    const syncOpenPanel = () => {
        const panel = document.getElementById('custom-rc-panel');
        if (!panel) return;

        const panelFrame = panel.querySelector('iframe');
        const panelTitle = panel.querySelector('[data-rc-panel-title]');
        const panelDifficulty = panel.querySelector('[data-rc-difficulty]');
        if (panelFrame && panelFrame.getAttribute('src') !== rcLink) panelFrame.src = rcLink;
        if (panelTitle) panelTitle.textContent = `osu!${displayMode ? `${displayMode} ` : ''}${difficultyTier} RC Guidelines`;
        if (panelDifficulty) {
            panelDifficulty.textContent = difficultyRating === null
                ? `${difficultyName} - ${difficultyRange}`
                : `${difficultyName} - ${difficultyRating.toFixed(2)}★ - ${difficultyRange}`;
        }
    };

    syncOpenPanel();

    toolbars.forEach(toolbar => {
        if (toolbar.querySelector('.rc-lens-btn')) return;

        const rcBtn = document.createElement('button');
        rcBtn.className = 'rc-lens-btn';
        rcBtn.innerHTML = '<i class="fas fa-book"></i>';
        rcBtn.title = `Toggle osu!${displayMode} RC Guidelines?`;

        rcBtn.style.background = 'transparent';
        rcBtn.style.border = 'none';
        rcBtn.style.color = '#fff';
        rcBtn.style.cursor = 'pointer';
        rcBtn.style.fontSize = '14px';
        rcBtn.style.marginLeft = 'auto';

        rcBtn.onmouseover = () => rcBtn.style.color = '#88b300';
        rcBtn.onmouseout = () => rcBtn.style.color = '#fff';

        rcBtn.onclick = (e) => {
            e.preventDefault();

            let panel = document.getElementById('custom-rc-panel');
            if (panel) {
                syncOpenPanel();
                panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
                return;
            }

            panel = document.createElement('div');
            panel.id = 'custom-rc-panel';
            panel.style = 'position: fixed; top: 0; right: 0; width: 450px; height: 100vh; background: hsl(var(--hsl-b1)); z-index: 10000; box-shadow: -4px 0 20px rgba(0,0,0,0.6); display: flex; flex-direction: column;';

            panel.innerHTML = `
                <div style="background: hsl(var(--hsl-b2)); padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,0.3); z-index: 2;">
                    <div>
                        <span data-rc-panel-title style="display: block; color: #fff; font-weight: 600; font-size: 14px;">osu!${displayMode ? `${displayMode} ` : ''}${difficultyTier} RC Guidelines</span>
                        <span data-rc-difficulty style="display: block; color: #aaa; font-size: 12px; margin-top: 4px;">${difficultyName} - ${difficultyRating === null ? difficultyRange : `${difficultyRating.toFixed(2)}★ -${difficultyRange}`}</span>
                    </div>
                    <button id="close-rc-panel" style="background: none; border: none; color: #aaa; cursor: pointer; font-size: 18px; padding: 0;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <iframe src="${rcLink}" style="flex-grow: 1; border: none; width: 100%; background: hsl(var(--hsl-b1));"></iframe>
            `;

            document.body.appendChild(panel);

            const closeBtn = panel.querySelector('#close-rc-panel');
            closeBtn.onclick = () => {
                panel.style.display = 'none';
            };
            closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
            closeBtn.onmouseout = () => closeBtn.style.color = '#aaa';
        };

        toolbar.appendChild(rcBtn);
    });
}