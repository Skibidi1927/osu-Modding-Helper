function handleImagePaste() {
    if (window.uploaderGlobalAttached) return;
    window.uploaderGlobalAttached = true;

    // 1. ADDED 'true' to use the capture phase. This intercepts the paste BEFORE React swallows it!
    document.addEventListener('paste', (e) => {
        if (window.imagePasteEnabled === false || !isModHelperFeatureEnabled('imageUploader')) return;
        
        // 2. USE .closest() instead of .matches() so we can find the box even if the cursor is deep inside a Slate.js <span>
        const discussionBox = e.target.closest('.beatmap-discussion-new__message-area, .beatmap-discussion-post__message--editor, [data-slate-editor="true"]');
        if (!discussionBox) return;

        const clipboardData = e.clipboardData;
        if (!clipboardData) return;
        
        // 3. osu! screenshot link (Smart formatting with Regex to catch both http and https)
        const pastedText = clipboardData.getData('text');
        if (pastedText && pastedText.includes('osu.ppy.sh/ss/')) {
            const words = pastedText.trim().split(/\s+/);
            const isOnlyLinks = words.length > 0 && words.every(word => /^https?:\/\/osu\.ppy\.sh\/ss\//i.test(word));
            
            if (isOnlyLinks) {
                e.preventDefault();
                e.stopPropagation(); // Stop osu! from pasting the raw text
                words.forEach(link => {
                    insertSmartMarkdown(discussionBox, `![](${link})`);
                });
                return;
            }
        }

        // 4. actual image files
        if (clipboardData.items) {
            let hasImages = false;
            for (const item of clipboardData.items) {
                if (item.type.indexOf('image') !== -1) {
                    hasImages = true;
                    uploadImageFile(discussionBox, item.getAsFile());
                }
            }
            if (hasImages) {
                e.preventDefault();
                e.stopPropagation(); // Stop React from doing its own weird image handling
            }
        }
    }, true); // <-- CAPTURE PHASE FLAG

    // Also upgrade drag and drop to use capture phase
    ['dragenter', 'dragover'].forEach(eventName => {
        document.addEventListener(eventName, (e) => {
            if (window.imagePasteEnabled === false || !isModHelperFeatureEnabled('imageUploader')) return;
            e.preventDefault();
            e.stopPropagation();
        }, true);
    });

    document.addEventListener('drop', (e) => {
        if (window.imagePasteEnabled === false || !isModHelperFeatureEnabled('imageUploader')) return;
        
        const isReviews = window.location.href.includes('reviews');
        const targetBox = e.target.closest('.beatmap-discussion-new__message-area, .beatmap-discussion-post__message--editor, [data-slate-editor="true"]');
        
        if (isReviews && !targetBox) {
            console.log("Please select a discussion box to drop images in the reviews section.");
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        
        const discussionBox = targetBox ? targetBox : document.querySelector('.beatmap-discussion-new__message-area');
        if (!discussionBox) return;

        const files = Array.from(e.dataTransfer.files || []);
        files.forEach(file => uploadImageFile(discussionBox, file));
    }, true);
}

function insertSmartMarkdown(discussionBox, linkText) {
    if (discussionBox.tagName.toLowerCase() !== 'textarea') {
        discussionBox.focus();
        document.execCommand('insertText', false, linkText + ' ');
        return;
    }

    const textBefore = discussionBox.value.slice(0, discussionBox.selectionStart);
    const lines = textBefore.split('\n');
    const currentLine = lines[lines.length - 1];
    
    const imagesOnLine = (currentLine.match(/!\[.*?\]/g) || []).length;
    
    let prefix = '';
    if (imagesOnLine > 0) {
        if (imagesOnLine % 4 === 0) {
            prefix = '\n';
        } else {
            prefix = ' ';
        }
    }
    
    const finalInsert = prefix + linkText;
    const start = discussionBox.selectionStart;
    const end = discussionBox.selectionEnd;
    
    discussionBox.value = discussionBox.value.slice(0, start) + finalInsert + discussionBox.value.slice(end);
    discussionBox.dispatchEvent(new Event('input', { bubbles: true }));
    
    const cursor = start + finalInsert.length;
    discussionBox.setSelectionRange(cursor, cursor);
    discussionBox.focus();
}

function uploadImageFile(discussionBox, file) {
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const placeholder = isImage ? '![Uploading to s-ul...]' : '[Uploading file to s-ul...]';
    const isTextArea = discussionBox.tagName.toLowerCase() === 'textarea';
    
    if (isTextArea) {
        insertSmartMarkdown(discussionBox, placeholder);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        chrome.runtime.sendMessage({
            action: 'uploadImage',
            imageData: event.target.result,
            fileName: file.name,
            fileType: file.type
        }, (response) => {
            if (response && response.url) {
                const uploadedText = isImage ? `![](${response.url})` : `[${file.name}](${response.url})`;
                if (isTextArea) {
                    discussionBox.value = discussionBox.value.replace(placeholder, uploadedText);
                    discussionBox.dispatchEvent(new Event('input', { bubbles: true }));
                } else {
                    discussionBox.focus();
                    document.execCommand('insertText', false, uploadedText + ' ');
                }
            } else {
                if (isTextArea) {
                    discussionBox.value = discussionBox.value.replace(placeholder, '');
                    discussionBox.dispatchEvent(new Event('input', { bubbles: true }));
                }
                
                const errorMsg = response && response.error ? response.error : 'Upload failed.';
                if (errorMsg === 'missing_api_key') {
                    showMissingKeyToast();
                } else {
                    showErrorToast(errorMsg);
                }
            }
        });
    };
    reader.readAsDataURL(file);
}

function insertText(discussionBox, text) {
    if (discussionBox.tagName.toLowerCase() !== 'textarea') {
        discussionBox.focus();
        document.execCommand('insertText', false, text);
        return;
    }
    const start = discussionBox.selectionStart;
    const end = discussionBox.selectionEnd;
    discussionBox.value = discussionBox.value.slice(0, start) + text + discussionBox.value.slice(end);
    discussionBox.dispatchEvent(new Event('input', { bubbles: true }));
}

function showMissingKeyToast() {
    if (document.getElementById('kmh-auth-toast')) return;

    const toast = document.createElement('div');
    toast.id = 'kmh-auth-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 25px;
        right: 25px;
        background: #1c242e;
        border-left: 4px solid #ff6666;
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
        <div style="font-weight: bold; color: #ff6666;">
            <i class="fas fa-key" style="margin-right: 5px;"></i> Modding Helper
        </div>
        <div style="color: #a39eb5; font-size: 13px;">
            Image upload failed! You need to add your <strong>s-ul.eu API key</strong>.<br>
            Click the <strong>Gear icon</strong> <i class="fas fa-cog"></i> below the discussion box to configure it.
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
    }, 6000);
}

function showErrorToast(message) {
    const existing = document.getElementById('mod-helper-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'mod-helper-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 25px;
        right: 25px;
        background: #ff6666;
        color: white;
        padding: 12px 24px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    toast.textContent = `Modding Helper: ${message}`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Ensures the listeners are hooked up instantly when the script is loaded
handleImagePaste();