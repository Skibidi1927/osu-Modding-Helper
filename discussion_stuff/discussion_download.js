// discussion_download.js - Simplified Download Button (Crash-proof)
function upgradeDownloadButton() {
    // Reuse an existing native download button when osu! provides one.
    const allLinks = Array.from(document.querySelectorAll('a.btn-osu-big'));
    const downloadBtn = allLinks.find(el => el.href && el.href.includes('/download'));

    if (downloadBtn) {
        if (downloadBtn.dataset.smartDl) return;
        downloadBtn.dataset.smartDl = 'true';

        const textSpan = downloadBtn.querySelector('.btn-osu-big__text-top');
        if (textSpan) textSpan.textContent = 'Download';
        return;
    }

    // Discussion pages may not include a download link, so build one from
    // the beatmapset ID embedded in the page.
    if (document.querySelector('.custom-download-btn')) return;

    const mapDataNode = document.getElementById('json-beatmapset');
    if (!mapDataNode) return;

    let mapData;
    try {
        mapData = JSON.parse(mapDataNode.textContent);
    } catch (error) {
        console.error('Modding Helper: Failed to read beatmapset data.', error);
        return;
    }

    if (!mapData.id) return;

    const beatmapPageLink = Array.from(document.querySelectorAll('a.btn-osu-big'))
        .find(link => link.href && link.href.includes(`/beatmapsets/${mapData.id}`));
    const detailsContainer = beatmapPageLink?.closest('.beatmap-discussions-header-bottom__details');
    if (!detailsContainer) return;

    const downloadContainer = document.createElement('div');
    downloadContainer.className = 'beatmap-discussions-header-bottom__details';
    downloadContainer.innerHTML = `
        <a class="btn-osu-big btn-osu-big--full custom-download-btn" href="/beatmapsets/${mapData.id}/download">
            <span class="btn-osu-big__content">
                <span class="btn-osu-big__left"><span class="btn-osu-big__text-top">Download</span></span>
                <span class="btn-osu-big__icon"><span class="fa fa-fw"><span class="fas fa-download"></span></span></span>
            </span>
        </a>
    `;

    detailsContainer.after(downloadContainer);
}