function injectToolbar() {
    const containers = document.querySelectorAll('.beatmap-discussion-new__message, .beatmap-discussion-editor__content');
    
    containers.forEach(container => {
        if (container.querySelector('.custom-modding-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'custom-modding-toolbar';
        toolbar.style.display = 'flex';
        toolbar.style.gap = '15px';
        toolbar.style.padding = '8px 12px';
        toolbar.style.backgroundColor = 'hsl(var(--hsl-b2))';
        toolbar.style.borderTop = '1px solid hsl(var(--hsl-b3))';
        toolbar.style.marginTop = '4px';
        toolbar.style.borderRadius = '4px';

        const buttons = [
            { icon: 'fas fa-bold', tooltip: 'Bold', text: '** **' },
            { icon: 'fas fa-italic', tooltip: 'Italic', text: '_ _' },
            { icon: 'fas fa-quote-right', tooltip: 'Quote', text: '> ' }
        ];

        buttons.forEach(btnData => {
            const btn = document.createElement('button');
            btn.className = 'markdown-toolbar-control';
            btn.innerHTML = `<i class="${btnData.icon}"></i>`;
            btn.title = btnData.tooltip;
            btn.style.background = 'transparent';
            btn.style.border = 'none';
            btn.style.color = '#fff';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '14px';
            
            btn.onclick = () => {
                insertMarkdownAtCursor(btnData.text);
            };
            toolbar.appendChild(btn);
        });

        addFieldButton(toolbar, 'fas fa-image', 'Image', 'image');
        addFieldButton(toolbar, 'fas fa-link', 'Link', 'link');

        const configButton = document.createElement('button');
        configButton.className = 'mod-helper-config-button';
        configButton.type = 'button';
        configButton.title = 'Modding helper configuration';
        configButton.innerHTML = '<i class="fas fa-cog"></i>';
        configButton.onclick = () => toggleModHelperSettings(toolbar);
        toolbar.appendChild(configButton);

        const refreshToolbar = () => {
            const enabled = isModHelperFeatureEnabled('markdownTools');
            toolbar.querySelectorAll('.markdown-toolbar-control, .custom-markdown-button').forEach((control) => {
                control.hidden = !enabled;
            });
            configButton.hidden = false;
        };
        window.addEventListener('mod-helper-settings-changed', refreshToolbar);
        refreshToolbar();

        container.appendChild(toolbar);
    });
}

function insertMarkdownAtCursor(markdown) {
    const discussionBox = document.querySelector('.beatmap-discussion-new__message-area:focus, .beatmap-discussion-post__message--editor:focus, [data-slate-editor="true"]:focus') 
        || document.querySelector('.beatmap-discussion-new__message-area, .beatmap-discussion-post__message--editor, [data-slate-editor="true"]');
    if (!discussionBox) return;

    if (discussionBox.tagName.toLowerCase() === 'textarea') {
        const start = discussionBox.selectionStart;
        const end = discussionBox.selectionEnd;
        discussionBox.value = discussionBox.value.slice(0, start) + markdown + discussionBox.value.slice(end);
        discussionBox.dispatchEvent(new Event('input', { bubbles: true }));
        discussionBox.focus();
        const cursor = start + markdown.length;
        discussionBox.setSelectionRange(cursor, cursor);
    } else {
        discussionBox.focus();
        document.execCommand('insertText', false, markdown);
    }
}

function addFieldButton(toolbar, icon, label, type) {
    const button = document.createElement('button');
    button.innerHTML = `<i class="${icon}"></i>`;
    button.title = label;
    button.type = 'button';
    button.className = 'custom-markdown-button';
    button.onclick = () => openMarkdownForm(type);
    toolbar.appendChild(button);
}

function openMarkdownForm(type) {
    const discussionBox = document.querySelector('.beatmap-discussion-new__message-area:focus, .beatmap-discussion-post__message--editor:focus, [data-slate-editor="true"]:focus') 
        || document.querySelector('.beatmap-discussion-new__message-area, .beatmap-discussion-post__message--editor, [data-slate-editor="true"]');
    if (!discussionBox) return;

    const existing = document.getElementById('markdown-field-form');
    if (existing) existing.remove();

    const isImage = type === 'image';
    const form = document.createElement('div');
    form.id = 'markdown-field-form';
    form.className = 'markdown-field-form';
    form.innerHTML = `
        <div class="markdown-field-form__header">
            <strong>${isImage ? 'Insert image' : 'Insert link'}</strong>
            <button type="button" class="markdown-field-form__close" aria-label="Close">&times;</button>
        </div>
        ${isImage ? '<label>Alt text<input id="markdown-link-text" type="text" placeholder="Optional image description"></label>' : '<label>Text<input id="markdown-link-text" type="text" placeholder="Text to display"></label>'}
        <label>${isImage ? 'Image URL' : 'URL'}<input id="markdown-field-url" type="url" placeholder="https://..."></label>
        <div class="markdown-field-form__actions">
            <button type="button" class="btn-osu-big markdown-field-form__cancel"><span class="btn-osu-big__content"><span class="btn-osu-big__left"><span class="btn-osu-big__text-top">Cancel</span></span><span class="btn-osu-big__icon"><span class="fa fa-fw"><span class="fas fa-times"></span></span></span></span></button>
            <button type="button" class="btn-osu-big markdown-field-form__insert"><span class="btn-osu-big__content"><span class="btn-osu-big__left"><span class="btn-osu-big__text-top">Insert</span></span><span class="btn-osu-big__icon"><span class="fa fa-fw"><span class="fas fa-check"></span></span></span></span></button>
        </div>
    `;

    discussionBox.parentElement.appendChild(form);
    const closeButton = form.querySelector('.markdown-field-form__close');
    const cancelButton = form.querySelector('.markdown-field-form__cancel');
    if (closeButton) closeButton.onclick = () => form.remove();
    if (cancelButton) cancelButton.onclick = () => form.remove();
    
    const insertFields = () => {
        const urlInput = form.querySelector('#markdown-field-url');
        const linkTextInput = form.querySelector('#markdown-link-text');
        const url = urlInput ? urlInput.value.trim() : '';
        const linkText = linkTextInput ? linkTextInput.value.trim() : '';
        if (!url || (!isImage && !linkText)) return;

        insertMarkdownAtCursor(isImage ? `![${linkText}](${url})` : `[${linkText}](${url})`);
        form.remove();
    };
    
    const insertButton = form.querySelector('.markdown-field-form__insert');
    if (insertButton) insertButton.onclick = insertFields;

    const linkTextInput = form.querySelector('#markdown-link-text');
    const urlInput = form.querySelector('#markdown-field-url');

    if (linkTextInput) {
        linkTextInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (urlInput) urlInput.focus();
            }
        });
    }

    if (urlInput) {
        urlInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                insertFields();
            }
        });
    }

    const firstInput = form.querySelector('input');
    if (firstInput) firstInput.focus();
}

function toggleModHelperSettings(toolbar) {
    const existing = document.getElementById('mod-helper-settings-modal');
    if (existing) {
        existing.remove();
        return;
    }

    const features = [
        ['rcBook', 'Ranking Criteria Button', 'Adds a quick-access button to read the mode-specific Ranking Criteria guidelines.'],
        ['imageUploader', 'Image Paste & Drop', 'Automatically uploads images to s-ul.eu when pasting or dropping them into text boxes.'],
        ['discussionDownload', 'Download Button', 'Adds a quick beatmap download button to the top of the discussion page.'],
        ['headerMetadata', 'Metadata & Stats', 'Displays beatmap source, tags, genre, language, and stats in a custom panel.'],
        ['markdownTools', 'Markdown Toolbar', 'Adds handy formatting buttons (bold, italic, quote, link) directly below the text box.']
    ];
    
    const modal = document.createElement('div');
    modal.id = 'mod-helper-settings-modal';
    
    const style = document.createElement('style');
    style.textContent = `
        .kmh-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.75); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
        .kmh-modal { display: flex; flex-direction: column; width: 680px; max-height: 85vh; background: #1c242e; border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.65); overflow: hidden; color: #fff; font-family: Torus, Inter, sans-serif; border: 1px solid #2f3e52; }
        .kmh-header { background: #151b22; padding: 22px 28px; border-bottom: 2px solid hsl(200, 80%, 55%); display: flex; justify-content: space-between; align-items: center; }
        .kmh-title { font-size: 20px; font-weight: 600; color: #fff; line-height: 1.2; }
        .kmh-subtitle { font-size: 13px; color: #8aa0b8; margin-top: 4px; }
        .kmh-close { background: transparent; border: none; color: #8aa0b8; font-size: 20px; cursor: pointer; transition: 0.2s; }
        .kmh-close:hover { color: #ff6666; }
        .kmh-body { padding: 25px; overflow-y: auto; flex-grow: 1; }
        .kmh-body::-webkit-scrollbar { width: 8px; }
        .kmh-body::-webkit-scrollbar-track { background: #151b22; }
        .kmh-body::-webkit-scrollbar-thumb { background: hsl(200, 60%, 45%); border-radius: 4px; }
        .kmh-section { background: #222d3b; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #2f3e52; }
        .kmh-section-title { font-size: 15px; font-weight: 600; color: #e1ebf5; margin-bottom: 4px; display: flex; align-items: center; gap: 8px; }
        .kmh-section-desc { font-size: 12px; color: #8aa0b8; margin-bottom: 15px; line-height: 1.45; }
        .kmh-btn { background: hsl(200, 70%, 45%); color: #fff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; }
        .kmh-btn:hover { background: hsl(200, 75%, 55%); }
        .kmh-btn-red { background: #ff6666; }
        .kmh-btn-red:hover { background: #ff8585; }
        .kmh-input { width: 100%; background: #151b22; border: 1px solid #33465e; color: #fff; padding: 10px 12px; border-radius: 6px; margin-top: 8px; outline: none; transition: border 0.2s; font-family: inherit; }
        .kmh-input:focus { border-color: hsl(200, 80%, 55%); }
        .kmh-footer { background: #151b22; padding: 16px 25px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #2f3e52; }
        .kmh-dev-link { color: #8aa0b8; font-size: 12px; text-decoration: none; display: flex; align-items: center; gap: 8px; transition: color 0.2s; }
        .kmh-dev-link span { color: hsl(200, 80%, 65%); font-weight: bold; }
        .kmh-dev-link:hover { color: #fff; }
        .kmh-dev-link:hover span { text-decoration: underline; }
        .kmh-feature-label { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; padding: 14px; background: #151b22; border-radius: 6px; border: 1px solid #33465e; transition: border 0.2s; }
        .kmh-feature-label:hover { border-color: #4a6382; }
    `;
    modal.className = 'kmh-overlay';
    
    modal.innerHTML = `
        <div class="kmh-modal">
            <div class="kmh-header">
                <div>
                    <div class="kmh-title">Karin's osu! Modding Helper</div>
                    <div class="kmh-subtitle">A collection of tools to enhance your beatmap modding workflow.</div>
                </div>
                <button class="kmh-close" aria-label="Close"><i class="fas fa-times"></i></button>
            </div>
            
            <div class="kmh-body">
                <div class="kmh-section">
                    <div class="kmh-section-title"><i class="fas fa-cloud-upload-alt"></i> Image Upload & Integration</div>
                    <div class="kmh-section-desc">Set up s-ul.eu image hosting so screenshots pasted into reply boxes auto-upload and turn into markdown links.</div>
                    
                    <details style="margin-bottom: 15px; font-size: 12px; color: #d0dde8; background: #151b22; padding: 12px; border-radius: 6px; border: 1px solid #33465e;">
                        <summary style="cursor: pointer; font-weight: bold; color: hsl(200, 80%, 65%); user-select: none;">
                            <i class="fas fa-question-circle" style="margin-right: 5px;"></i>How to get your s-ul API key
                        </summary>
                        <div style="margin-top: 10px; line-height: 1.6; color: #8aa0b8;">
                            1. Log in to <a href="https://s-ul.eu" target="_blank" style="color: hsl(200, 80%, 75%); text-decoration: none; font-weight: bold;">s-ul.eu</a><br>
                            2. Go to your <strong>Account</strong> dashboard.<br>
                            3. Click the <strong>Info</strong> tab on the left sidebar.<br>
                            4. Copy the long string of text next to <strong>API Key</strong> and paste it below.
                        </div>
                    </details>

                    <label style="font-size: 13px; font-weight: bold; color: #e1ebf5;">s-ul.eu API key
                        <input type="password" id="modal-sul-key" class="kmh-input" placeholder="Paste your s-ul API key here">
                    </label>

                    <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #2f3e52;">
                        <div style="font-size: 14px; font-weight: bold; margin-bottom: 4px; color: #e1ebf5;">osu! Account Connection</div>
                        <div style="font-size: 12px; color: #8aa0b8; margin-bottom: 12px;">Log in securely to load advanced beatmap metadata directly from the osu! API.</div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <button type="button" id="mod-helper-osu-connect" class="kmh-btn">
                                <span id="mod-helper-osu-connect-bg" style="display:inline-flex; align-items:center; gap:8px;">
                                    <span id="mod-helper-osu-connect-text"><i class="fas fa-link"></i> Connect osu! Account</span>
                                </span>
                            </button>
                            <div id="mod-helper-osu-status" style="font-size: 13px; font-weight: bold; color: #ff6666;">
                                Status: Not Connected
                            </div>
                        </div>
                    </div>
                </div>

                <div class="kmh-section" style="margin-bottom: 0;">
                    <div class="kmh-section-title"><i class="fas fa-tools"></i> Discussion Enhancements</div>
                    <div class="kmh-section-desc">Turn specific tools and visual features on or off for the discussion page.</div>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                        ${features.map(([key, label, desc]) => `
                            <label class="kmh-feature-label">
                                <input type="checkbox" data-feature="${key}" ${isModHelperFeatureEnabled(key) ? 'checked' : ''} style="margin-top: 2px; accent-color: hsl(200, 80%, 55%); width: 16px; height: 16px; cursor: pointer; flex-shrink: 0;">
                                <div>
                                    <div style="font-weight: 600; color: #d0dde8; font-size: 14px;">${label}</div>
                                    <div style="font-size: 12px; color: #8aa0b8; margin-top: 4px; line-height: 1.4;">${desc}</div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="kmh-footer">
                <a href="https://osu.ppy.sh/users/28330584" target="_blank" class="kmh-dev-link">
                    <img src="https://a.ppy.sh/28330584" style="width: 24px; height: 24px; border-radius: 4px; object-fit: cover;">
                    Developed by <span>Karin-</span>
                </a>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span id="modal-settings-status" style="font-size: 13px; font-weight: bold; color: #88b300;"></span>
                    <button type="button" class="kmh-btn" id="modal-settings-save">
                        <i class="fas fa-check"></i> Save Settings
                    </button>
                </div>
            </div>
        </div>
    `;
    modal.prepend(style);
    document.body.appendChild(modal);

    const connectBtn = modal.querySelector('#mod-helper-osu-connect');
    const connectBtnText = modal.querySelector('#mod-helper-osu-connect-text');
    const statusText = modal.querySelector('#mod-helper-osu-status');

    chrome.runtime.sendMessage({ action: 'getAuthStatus' }, (response) => {
        if (chrome.runtime.lastError) {
            // The background service worker gets unloaded by Chrome after
            // ~30s idle (normal Manifest V3 behavior) and occasionally
            // isn't done waking back up yet when this fires. Harmless —
            // we just don't know the status yet, so leave the button at
            // its default state instead of assuming "not connected".
            console.warn('Modding Helper: could not reach background worker for auth status —', chrome.runtime.lastError.message);
            return;
        }
        if (response && response.data && response.data.connected) {
            connectBtnText.innerHTML = '<i class="fas fa-unlink"></i> Disconnect osu! Account';
            connectBtn.classList.add('kmh-btn-red');
            statusText.textContent = 'Status: Connected';
            statusText.style.color = '#88b300';
        }
    });

    connectBtn.onclick = () => {
        connectBtnText.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...';

        chrome.runtime.sendMessage({ action: 'getAuthStatus' }, (res) => {
            if (chrome.runtime.lastError) {
                // Worker didn't answer in time — most likely it had gone
                // idle and is still spinning back up. Reset the button
                // instead of leaving it stuck on "Please wait..." forever;
                // a second click almost always works.
                connectBtnText.innerHTML = '<i class="fas fa-link"></i> Connect osu! Account';
                statusText.textContent = 'Status: extension is waking up — try again';
                statusText.style.color = '#ff6666';
                return;
            }

            const action = (res && res.data && res.data.connected) ? 'disconnectAuth' : 'startAuthFlow';
            chrome.runtime.sendMessage({ action }, (result) => {
                if (chrome.runtime.lastError) {
                    connectBtnText.innerHTML = '<i class="fas fa-link"></i> Connect osu! Account';
                    statusText.textContent = 'Status: extension is waking up — try again';
                    statusText.style.color = '#ff6666';
                    return;
                }
                if (result && result.error) {
                    connectBtnText.innerHTML = '<i class="fas fa-link"></i> Connect osu! Account';
                    statusText.textContent = `Status: ${result.error}`;
                    statusText.style.color = '#ff6666';
                    return;
                }
                window.location.reload();
            });
        });
    };

    const sulKey = modal.querySelector('#modal-sul-key');
    
    chrome.storage.local.get(['sulApiKey'], (settings) => {
        sulKey.value = settings.sulApiKey || '';
    });

    modal.querySelector('.kmh-close').onclick = () => modal.remove();
    modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.remove();
    });
    
    modal.querySelector('#modal-settings-save').onclick = () => {
        const values = {
            sulApiKey: sulKey.value.trim()
        };
        modal.querySelectorAll('[data-feature]').forEach((input) => {
            values[input.dataset.feature] = input.checked;
        });
        
        chrome.storage.local.set(values, () => {
            modal.querySelector('#modal-settings-status').textContent = 'Reloading...';
            setTimeout(() => window.location.reload(), 300);
        });
    };
}