// osu_api_client.js - "The Fetcher"
//
// Clean, typed-ish wrappers around the osu! API v2 endpoints we need.
// Every call goes through apiFetch(), which pulls a valid token from
// OsuAuthManager, attaches it, and — on a single 401 — forces a real token
// refresh and retries exactly once before giving up.
//
// Loaded into the background service worker via importScripts() from
// external_web_handler.js, AFTER osu_auth_manager.js. Exposes a single
// global, `self.OsuApiClient`.

if (typeof self.OsuAuthManager === 'undefined') {
    // Fails loudly at load time rather than with a confusing runtime error
    // the first time something tries to fetch data.
    throw new Error('osu_api_client.js requires osu_auth_manager.js to be imported first.');
}

(() => {
    const API_BASE = 'https://osu.ppy.sh/api/v2';

    /**
     * Core request helper. Attaches a bearer token, and on a 401 forces a
     * real refresh (bypassing the cached-expiry check, since a 401 means
     * the token was rejected server-side regardless of what our local
     * clock thinks) and retries exactly once.
     *
     * Any other non-2xx status, or a second consecutive 401, is thrown as
     * an Error with a `.status` property.
     */
    async function apiFetch(path, { method = 'GET', params = null, retrying = false } = {}) {
        const accessToken = retrying
            ? (await self.OsuAuthManager.refreshAccessToken()).accessToken
            : await self.OsuAuthManager.getValidAccessToken();

        const url = new URL(`${API_BASE}${path}`);
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.set(key, String(value));
                }
            });
        }

        const response = await fetch(url.toString(), {
            method,
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9' // <--- FORCES ENGLISH HERE
            }
        });

        if (response.status === 401 && !retrying) {
            return apiFetch(path, { method, params, retrying: true });
        }

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            const err = new Error(`osu! API ${method} ${path} failed (${response.status}): ${errBody}`);
            err.status = response.status;
            throw err;
        }

        // /me on a 204 (rare, but the API reserves the right to) has no body.
        if (response.status === 204) return null;
        return response.json();
    }

    /**
     * GET /api/v2/me — the authenticated user's identity, including their
     * `groups` array (this is what tells us BN / NAT / probation status,
     * replacing the old "does a native Nominate button exist" DOM check).
     */
    async function fetchCurrentProfile() {
        return apiFetch('/me');
    }

    /**
     * GET /api/v2/beatmapsets/{id} — full beatmapset payload: genre,
     * language, tags, and each difficulty's stats (drain, accuracy,
     * star rating, etc). Returned as-is; shaping it for display is the
     * caller's job, not the Fetcher's.
     */
    async function fetchBeatmapset(setId) {
        const numericId = Number(setId);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            throw new Error(`fetchBeatmapset: invalid beatmapset id "${setId}"`);
        }
        return apiFetch(`/beatmapsets/${numericId}`);
    }

    self.OsuApiClient = {
        fetchCurrentProfile,
        fetchBeatmapset
    };
})();