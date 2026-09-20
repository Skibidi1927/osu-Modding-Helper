# Karin's osu! Modding Helper

A Manifest V3 Chrome extension for osu! beatmap discussion pages: a markdown
toolbar, one-click image uploads to s-ul.eu, a smart download button, live
beatmap metadata pulled from the official osu! API v2, and a Ranking
Criteria quick-reference panel.

## Features

- **Markdown toolbar** — bold/italic/quote buttons plus guided image and
  link insertion forms, added under every reply box (including osu!'s
  newer rich-text editor, not just the plain textarea).
- **Image uploads** — paste or drag an image into a reply box and it's
  uploaded to s-ul.eu automatically, with a toast if your API key is
  missing or the upload fails.
- **Beatmap metadata banner** — source, tags, genre, and language for the
  set, plus an HP drain / accuracy bar chart for the selected difficulty,
  fetched live from the osu! API v2.
- **Download button** — a one-click download link on pages that don't
  already show osu!'s native one.
- **Ranking Criteria panel** — a toggle button that opens the
  mode-and-difficulty-appropriate RC guidelines in a side panel, without
  leaving the page.
- **Settings modal** — turn individual features on/off, set your s-ul.eu
  key, and connect your osu! account, all from a gear icon on the toolbar.

## How osu! account connection works

This extension does **not** ask you to register your own OAuth
application. Clicking "Connect osu! Account" opens osu!'s real login/consent
screen (via `chrome.identity`); the resulting authorization is exchanged for
an access token through a Cloudflare Worker this project operates, which is
the only place the OAuth `client_secret` exists. The extension itself never
holds or sees that secret. Practically, this means your authorization code
and access/refresh tokens are routed through that Worker as a normal part of
completing sign-in — the same trust model as any "Sign in with X" flow
elsewhere on the web, just worth stating plainly since this is an
open-source extension you're installing from source.

## Installation

1. Clone or download this repository.
2. In Chrome, go to `chrome://extensions`, enable **Developer mode**, and
   click **Load unpacked**.
3. Select this folder.
4. Open any beatmap discussion page on osu! and the toolbar, metadata
   banner, and download button should appear automatically.
5. Click the gear icon on the toolbar (or the extension's toolbar-icon
   popup) to add your s-ul.eu API key and connect your osu! account.

No further configuration is required — the extension's `manifest.json` has
a locked `key`, so every install gets the same extension ID and redirect
URI, and the public `client_id` / Worker URL are already set in
`osu_auth_manager.js`.

## Project structure

```
discussion_page_extension/
├── manifest.json
├── popup.html / popup.js
├── external_web_handler.js
├── osu_auth_manager.js
├── osu_api_client.js
├── discussion_styles.css
└── discussion_stuff/
    ├── feature_settings.js
    ├── toolbar_injector.js
    ├── header_metadata.js
    ├── image_uploader.js
    ├── discussion_download.js
    ├── toggled_RC_book.js
    └── main.js
```

### Root files

**`manifest.json`**
MV3 manifest. Declares the `identity`, `storage`, and `clipboardRead`
permissions; `host_permissions` for osu.ppy.sh, s-ul.eu, and the Cloudflare
Worker; the locked extension `key`; `external_web_handler.js` as the
background service worker; and the content script bundle that runs on
`*/beatmapsets/*/discussion*` pages.

**`popup.html` / `popup.js`**
The small popup that opens from the extension's toolbar icon. A simpler,
always-available alternative to the in-page settings modal for pasting your
s-ul.eu key — both write to the same `sulApiKey` storage value, so they
stay in sync.

**`external_web_handler.js`** — *the background service worker*
The single hub every content script talks to via `chrome.runtime.sendMessage`.
Loads `osu_auth_manager.js` and `osu_api_client.js` with `importScripts`,
then routes incoming messages by `action`:
| action | what it does |
|---|---|
| `uploadImage` | uploads a pasted/dropped image to s-ul.eu (`handleImageUpload`) |
| `startAuthFlow` | begins the osu! OAuth login |
| `disconnectAuth` | clears the stored token |
| `getAuthStatus` | reports whether an account is currently connected |
| `fetchProfile` | fetches `/api/v2/me` |
| `fetchBeatmap` | fetches `/api/v2/beatmapsets/{id}` |

`handleImageUpload` builds the multipart request s-ul.eu expects (the file
under the `file` field, the API key and `wizard=true` as URL parameters)
and returns `{ url }` on success or a descriptive `{ error }` otherwise.

**`osu_auth_manager.js`**
Owns the osu! OAuth Authorization Code flow: opens the consent screen with
`chrome.identity.launchWebAuthFlow`, validates the redirect (including a
CSRF `state` check), and exchanges the code — via the Cloudflare Worker,
never directly — for a token pair it stores in `chrome.storage.local`.
Exposes `startAuthFlow()`, `getValidAccessToken()` (auto-refreshing),
`refreshAccessToken()` (single-flight, so concurrent callers share one
request), `getAuthStatus()`, and `disconnect()`.

**`osu_api_client.js`**
Thin wrappers around the two osu! API v2 endpoints this extension needs —
`fetchCurrentProfile()` and `fetchBeatmapset(setId)` — built on a shared
`apiFetch` helper that attaches the bearer token and, on a 401, forces a
token refresh and retries once before giving up.

**`discussion_styles.css`**
Styling for the toolbar, the image/link insertion forms, the metadata
banner, and the settings modal.

### `discussion_stuff/` (content scripts)

**`feature_settings.js`**
Defines the default feature toggles and loads/persists them from
`chrome.storage.local`, firing a `mod-helper-settings-changed` event
whenever they change so other scripts can react live. Also drives the
"Connect / Disconnect osu! Account" button in the settings modal — it uses
a `MutationObserver` (rather than a one-time check) so the button keeps
working every time the modal is closed and reopened, since the modal is
rebuilt from scratch each time.

**`toolbar_injector.js`**
Builds the markdown toolbar under each reply box — including osu!'s
newer editor, not just the classic textarea — and the full settings
modal: feature toggles, the s-ul.eu key field, and the osu! account
connection section. Also renders the guided image/link insertion forms
that pop up under the toolbar.

**`header_metadata.js`**
Renders the metadata banner and the HP/Accuracy stats row. Metadata
(genre, language) is fetched live through the background worker's
`fetchBeatmap` action rather than scraped from the page; while that
request is in flight the banner shows loading spinners and disables the
copy buttons, then unlocks them once data arrives. If the request comes
back `not_authenticated`, it shows a toast pointing the user at the
settings gear to connect their account.

**`image_uploader.js`**
Listens for paste and drop events on `document` in the capture phase (so
it can intercept them before osu!'s own editor handles them), matches the
event to whichever reply box it happened in, and uploads any image found
to s-ul.eu, replacing a placeholder with the resulting markdown link. Also
auto-wraps pasted `osu.ppy.sh/ss/` screenshot links, and shows toast
notifications for a missing API key or a failed upload.

**`discussion_download.js`**
Adds a labeled Download button, reusing osu!'s native one if present or
building one from the beatmapset ID embedded in the page when it's not.

**`toggled_RC_book.js`**
Adds a book-icon button to each toolbar that opens the mode- and
difficulty-appropriate Ranking Criteria guidelines in a slide-out panel,
switching link and difficulty automatically as the selected beatmap or
game mode changes.

**`main.js`**
The watchdog: re-runs all of the above on a 250ms interval, since osu!'s
single-page app can re-render the discussion view and wipe out injected
elements without a full page navigation.

## Forking this project

If you fork this repo rather than just using Karin's build, generate your
own signing key so you get your own stable extension ID (and therefore
your own OAuth redirect URI), register your own OAuth application with
osu!, and deploy your own copy of the Cloudflare Worker with your own
`client_secret`. Then update `PUBLIC_CLIENT_ID` and `WORKER_PROXY_URL` at
the top of `osu_auth_manager.js` to match.
