<!-- gitmdscribe:imported-from=docs/todos/specs/003-pwa-offline-assets.md -->
<!-- gitmdscribe:imported-at=2026-04-21T18:36:40.206546Z -->

# Spec 003 — Progressive Web App with Full Offline Assets

**Status**: Draft — awaiting review
**Authored**: 2026-04-19
**Touches**: `client/` build pipeline, `client/index.html`, new service worker + manifest, `nginx/surri2.conf`
**Capacitor**: no regressions — service worker is disabled inside the Android wrapper

---

## 1. Problem

`surri.xuresolutions.in` is today a standard SPA: every visit re-fetches `index.html`, the Vite-hashed JS/CSS bundles, the 67 card PNGs, and Firebase/gtag scripts. On a flaky connection the app boot is slow or fails outright. On Android, the Capacitor wrapper bundles assets, but on the web the first paint is dependent on a cold network round-trip.

The user's goal: after the first successful visit, the entire client — app shell, JS/CSS, card sprites, icons, fonts if any — is cached on-device. Subsequent visits open instantly and offline. The **only** runtime network requirement is the `socket.io` connection to the backend; everything else must be served from cache.

## 2. Proposed Change

Ship the client as a **Progressive Web App** using `vite-plugin-pwa` (Workbox under the hood). After the first load:

- `index.html`, `/assets/*.{js,css}`, `/cards/*.png`, `/vite.svg`, `/icon*.png`, and `/privacy-policy.html` are precached at install time and served from cache for the lifetime of the service worker generation.
- `socket.io` traffic is bypassed (NetworkOnly — must not be cached, ever).
- `/api/*` and `/dashboard` are bypassed (NetworkOnly — stats endpoints, admin view).
- Third-party scripts (gtag, Firebase) run NetworkFirst with a short timeout and silent fail so the app works with them blocked.
- A new client-side **update prompt** appears when a newer build is deployed; user taps to reload into the new version.
- A **web app manifest** lets users "Add to Home Screen" on Android/iOS and ships with the existing `icon-512.png` / `icon.png`.

### 2a. Scope — what changes

- New dev dependency: `vite-plugin-pwa` (pulls in `workbox-window` at runtime).
- `client/vite.config.js` — register the plugin with the PWA config.
- `client/index.html` — add PWA meta tags (theme-color, apple-mobile-web-app-*, manifest link).
- `client/src/main.js` — register the service worker and wire the update prompt.
- New `client/src/services/sw-update.js` — tiny helper that surfaces `onNeedRefresh` / `onOfflineReady` events.
- New `client/src/components/UpdateBanner.vue` — the "New version available — Reload" strip.
- `client/src/socket.js` — add reconnection-aware offline UX (existing socket.io auto-reconnect is fine; just surface state).
- `nginx/surri2.conf` — add `Cache-Control: no-cache` for `index.html` and the service worker file so new deploys are picked up.
- `.github/workflows/deploy.yml` — no change needed (serves whatever `dist/` contains).

### 2b. Scope — what stays the same

- Socket protocol, game logic, AI, scoring — unchanged. All server-authoritative state, as today.
- Capacitor Android build — the service worker is **not** registered when running inside the native wrapper. The APK/AAB already bundles assets locally; running a SW inside WebView would be redundant and add eviction risk.
- `/api/stats`, `/dashboard`, GitHub-issue reporting — bypass the SW, behave as today.
- Firebase Analytics and gtag — run online; fail silently offline (existing behaviour is already noisy-but-nonfatal, we just don't cache the scripts).
- Deployment (`pm2 restart surri2`, nginx static serve) — unchanged. New file: the SW is auto-generated into `client/dist/` by Vite plugin.

## 3. Build-Time Changes

### 3a. Dependency

```bash
cd client && npm i -D vite-plugin-pwa
```

`vite-plugin-pwa` ships with Workbox; no additional runtime bundle other than the service worker itself (~4 KB) and `workbox-window` (~6 KB gzipped) that we opt into.

### 3b. `client/vite.config.js`

```js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tailwindcss(),
    vue(),
    VitePWA({
      registerType: 'prompt',         // user confirms reload after new version detected
      injectRegister: false,           // we register manually from main.js
      includeAssets: [
        'vite.svg',
        'icon.png',
        'icon-512.png',
        'privacy-policy.html',
        'cards/*.png',
      ],
      manifest: {
        name: 'Surri',
        short_name: 'Surri',
        description: 'Multiplayer card game — Spades variant',
        theme_color: '#1e293b',        // slate-800, matches BiddingPanel header
        background_color: '#0f172a',   // slate-900, matches game board background
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        // Precache limit — 67 cards + bundles + icons is well under Workbox's default 2 MiB per file.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/socket\.io\//,
          /^\/api\//,
          /^\/dashboard/,
          /^\/privacy-policy\.html$/,  // static file, let it through normally
        ],
        runtimeCaching: [
          {
            // Socket.io — NEVER cache. Polling transport uses /socket.io/?... GETs.
            urlPattern: /^\/socket\.io\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/.*/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/dashboard.*/,
            handler: 'NetworkOnly',
          },
          {
            // Google tag manager / gtag — short-timeout NetworkFirst so app boot
            // never stalls on it when offline.
            urlPattern: /^https:\/\/www\.googletagmanager\.com\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gtag-runtime',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            // Firebase Analytics endpoints — NetworkOnly; analytics failures are silent.
            urlPattern: /^https:\/\/(firebase|firebaseinstallations|firebaselogging|firebaseapp)\.googleapis\.com\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: false,  // do not run SW in `npm run dev` — HMR and SW conflict in dev
      },
    }),
  ],
  server: {
    proxy: {
      '/dashboard': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
    },
  },
});
```

Note on `registerType: 'prompt'`: when a new SW is available, `workbox-window` fires `onNeedRefresh`; we show the banner and the user clicks "Reload" to activate. This avoids surprise mid-game reloads during a round.

### 3c. `client/index.html` — add PWA meta

Append inside `<head>`:

```html
<meta name="theme-color" content="#1e293b" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Surri" />
<link rel="apple-touch-icon" href="/icon.png" />
```

The manifest `<link>` and SW registration hook are auto-injected by the plugin.

## 4. Runtime Changes — client

### 4a. `client/src/main.js`

```js
import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
import { initAnalytics } from './services/analytics.js';
import { registerSW } from './services/sw-update.js';

initAnalytics();

// Skip SW in Capacitor Android wrapper — native app has bundled assets.
const isNative = !!(window.Capacitor && window.Capacitor.isNative);
if (!isNative) {
  registerSW();
}

createApp(App).mount('#app');
```

### 4b. New file — `client/src/services/sw-update.js`

```js
import { registerSW as registerWorkbox } from 'virtual:pwa-register';

// Event bus — App.vue subscribes to render UpdateBanner.
const listeners = { needRefresh: [], offlineReady: [] };

export function onNeedRefresh(cb) { listeners.needRefresh.push(cb); }
export function onOfflineReady(cb) { listeners.offlineReady.push(cb); }

let updateSW = null;

export function registerSW() {
  updateSW = registerWorkbox({
    immediate: true,
    onNeedRefresh() { listeners.needRefresh.forEach(cb => cb()); },
    onOfflineReady() { listeners.offlineReady.forEach(cb => cb()); },
  });
}

export function applyUpdate() {
  if (updateSW) updateSW(true);  // triggers skipWaiting + reload
}
```

### 4c. New component — `client/src/components/UpdateBanner.vue`

A thin strip at the top of `App.vue` that renders when `onNeedRefresh` fires. Primary button: "Reload". Secondary: "Later". Matches existing slate-800 palette.

App.vue wires it up:

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { onNeedRefresh, onOfflineReady, applyUpdate } from './services/sw-update.js';
import UpdateBanner from './components/UpdateBanner.vue';

const hasUpdate = ref(false);
const offlineReady = ref(false);

onMounted(() => {
  onNeedRefresh(() => { hasUpdate.value = true; });
  onOfflineReady(() => { offlineReady.value = true; });
});
</script>

<template>
  <UpdateBanner v-if="hasUpdate" @reload="applyUpdate" @dismiss="hasUpdate = false" />
  <!-- existing game UI -->
</template>
```

`offlineReady` can trigger a one-time toast on first visit ("Surri is ready to work offline"). Optional — fine to drop if UI clutter.

### 4d. `client/src/socket.js` — surface connection state (optional companion)

The socket client already auto-reconnects. To give the UI an "offline" badge, expose the connection state:

```js
export const connection = reactive({ state: 'connecting' });
socket.on('connect',    () => connection.state = 'online');
socket.on('disconnect', () => connection.state = 'offline');
socket.io.on('reconnect_attempt', () => connection.state = 'reconnecting');
```

Badge renders as a 6 px dot in the corner; green/yellow/red. Nothing breaks in offline mode — the user simply can't submit game actions, and existing UI elements stay rendered because they're cache-served.

## 5. Nginx Change — `nginx/surri2.conf`

Add cache headers so the SW file and `index.html` are never stale-served by the CDN / browser cache:

```nginx
location = /index.html {
    add_header Cache-Control "no-cache";
}
location = /sw.js {
    add_header Cache-Control "no-cache";
}
location = /registerSW.js {
    add_header Cache-Control "no-cache";
}
location = /manifest.webmanifest {
    add_header Cache-Control "no-cache";
}

# Hashed bundle assets — long-lived
location ~* ^/assets/.*\.(js|css|woff2?)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
}
```

Keep the existing `location /` SPA-fallback block after these — order matters.

## 6. Capacitor Native Build — no regressions

- `npm run cap:build` already builds `dist/` and syncs to Android. The SW file ships inside the APK but is **not registered** (see §4a gate on `window.Capacitor.isNative`).
- WebView will parse the manifest `<link>` harmlessly.
- The card PNGs continue to resolve from Capacitor's local file scheme; no cross-origin issues.
- `mode: 'native'` in `cap:build` — the plugin honours Vite modes. We can additionally short-circuit the plugin with a mode guard if the SW file in the APK is undesirable:

```js
VitePWA({
  disable: process.env.MODE === 'native',  // or use loadEnv
  ...
})
```

Recommend **disabling** the plugin for the native build so we don't ship dead SW code in the APK. Saves ~10 KB. Flag in Open Questions.

## 7. Assets to Pre-Cache — Inventory

Verified from the current repo:

| Category | Files | Count | Size range |
|---|---|---|---|
| Card PNGs | `client/public/cards/*.png` | 67 | small — all under 100 KB |
| App icons | `client/assets/icon.png`, `icon-512.png`, `vue.svg`, `feature-graphic.{png,svg}` | 5 | icon-512 is the largest at ~KB scale |
| SPA entry | `index.html`, `vite.svg` | 2 | tiny |
| Static page | `public/privacy-policy.html` | 1 | tiny |
| Vite output | `dist/assets/*.{js,css}` | N (build-dependent) | bundled; ~150–300 KB gzipped total |

Total precache footprint well under 5 MB. Within budget for mobile.

**Note on `client/assets/` vs `client/public/`**: Items in `client/assets/` (icon.png, icon-512.png, etc.) may not currently ship to `dist/` unless imported or placed in `public/`. **Before implementing** confirm: either move the icons into `client/public/` or reference them via `import` so Vite emits them. §9 Open Questions.

## 8. Offline Behaviour — what the user sees

Precise user-visible behaviour after the first successful visit:

1. User opens the app with no network.
2. Service worker serves `index.html` + bundles + card images + icons.
3. Vue app boots, analytics init silently no-ops (network blocked), UI renders the lobby.
4. Connection badge shows **offline / reconnecting**.
5. The "Create Room" / "Join Room" buttons remain tappable but show an inline error toast ("No connection — retry when online") when tapped, because socket.emit will queue with no ack.
6. When network returns, socket.io auto-reconnects; badge flips green; user can continue (if they were mid-game with a `playerId` stored in `localStorage` — see `socket.js:19`, that reconnect path already works).

Explicit **non-goal**: playing a full game offline. Game logic is server-authoritative. The user's sentence "all logic except socket should be done offline" is interpreted as: the app shell / UI / assets load offline; actual game flow still requires the socket. Confirm in §9.

## 9. Open Questions

1. **Native build: disable SW entirely?** §6 recommends disabling via `mode: 'native'` to avoid shipping dead SW code in the APK. Alternative: ship it but skip registration at runtime (current §4a gate). Both are safe; the "disable" option is leaner.
2. **Asset location for icons**: Current icons live under `client/assets/` (not `client/public/`). §7 flags this — do we move them into `public/` or import them? Moving into `public/` is the least-disruptive option.
3. **Update prompt — forced reload for breaking changes?** Current design: prompts user, they can dismiss. For breaking socket-protocol changes (rare, but possible if `server/gameLogic.js` phases change), we may want a hard-reload path. Could add a server-pushed version stamp that triggers forced reload when out of sync. Out of scope for v1; flagging for future.
4. **Stats page `/dashboard` behaviour**: currently NetworkOnly so it fails offline. That's fine for an admin view, but if the dashboard URL is visited offline the user gets a network error page. Do we want a minimal offline-fallback page for `/dashboard` too? Probably not — admin users are expected to be online.
5. **Game-action queuing while offline**: tapping "Create Room" with no connection — show toast and drop? Or queue the emit and replay on reconnect? Dropping is safer (less surprise); queuing risks ghost actions. Recommend drop with toast. Confirm.
6. **Test-game harness interaction**: `FAST_TEST=1 node server/test-game.js` drives sockets directly, not the browser. SW has no effect on it — no test changes needed there. Confirmed.
7. **privacy-policy.html**: currently static at `/privacy-policy.html`. §3b denylist excludes it from SPA fallback but it will still be precached per `includeAssets`. Confirm we want it cached (probably yes — tiny, read-often).

## 10. Test Cases

Dev-run and manual browser-level checks. Unit-testing a service worker is painful and low-value; we rely on Workbox's own test suite.

### 10a. Build produces SW + manifest

1. `cd client && npm run build`.
2. Assert `dist/sw.js`, `dist/manifest.webmanifest`, `dist/registerSW.js` exist.
3. Assert `dist/manifest.webmanifest` parses as JSON and has `name: "Surri"`, `icons` array non-empty.

### 10b. First visit caches assets

1. `npm run dev`? — no, SW disabled in dev. Instead: `npm run build && npm run preview`, open Chrome DevTools → Application → Service Workers → confirm `sw.js` registered.
2. Application → Cache Storage → confirm precache cache contains `/`, `/index.html`, `/assets/*.js`, `/assets/*.css`, `/cards/*.png` (sample 5 entries).

### 10c. Offline reload — full app shell renders

1. First visit online, play a move, close tab.
2. DevTools → Network → **Offline** throttling, or disable Wi-Fi.
3. Reload. App shell must load (lobby UI visible, card images render).
4. Connection badge shows offline/reconnecting.
5. "Create Room" tap shows offline toast — no spinner-of-death.

### 10d. Socket traffic bypass

1. With SW active, Network tab → filter `socket.io`.
2. Every socket request must have "from ServiceWorker: no" (or equivalent — served from network).
3. DevTools → Application → Cache Storage → confirm NO cache entry starts with `/socket.io/`.

### 10e. Update flow

1. Deploy a new build (locally: change a string, re-run `npm run build && npm run preview`).
2. Reload the already-open tab. SW detects new version, `onNeedRefresh` fires.
3. UpdateBanner appears. Click "Reload" — page reloads into the new version.
4. Click "Later" — banner dismisses; new version activates on next natural reload.

### 10f. Capacitor native build — SW not registered

1. `npm run cap:build && npm run build:apk`.
2. Install APK on device. Open app; attach Chrome remote debugger.
3. Application → Service Workers → list must be empty (SW bypassed by `isNative` gate).
4. Asset loading works as today (via Capacitor file scheme).

### 10g. Lighthouse PWA score

`npm run preview` + Chrome DevTools → Lighthouse → PWA audit. Target score ≥ 90. Key checks:

- Installable (manifest + icons + SW)
- PWA optimized (theme color, viewport, etc.)
- Works offline (fallback `index.html`)

### 10h. A/B — network-blocked analytics don't wedge boot

1. DevTools → Network → block request URL pattern `googletagmanager.com`.
2. Reload. App must still render within < 2s to first paint. Analytics just silently fail.

### 10i. Regression — existing socket reconnect flow intact

1. Start a game with 1 human + 3 bots. Play Round 1 trick 1.
2. Kill the browser tab. Reopen. Socket auto-reconnects using stored `surri_playerId` (from `localStorage`, `socket.js:19`). Player is restored to their seat.
3. This already works; confirm SW doesn't interfere.

### 10j. iOS Safari — add to home screen works

Open `https://surri.xuresolutions.in` on iOS Safari → Share → Add to Home Screen → confirm icon + name appear. Open from home screen → status bar translucent, standalone display mode. No test for actual offline-on-iOS since Safari's SW support is patchier than Chrome; document the known limitation rather than test.

## 11. Verification

After implementation:

1. **Build**: `cd client && npm run build`. Assert SW + manifest in `dist/` (10a).
2. **Local preview**: `npm run preview`. Walk through 10b–10e manually.
3. **Lighthouse**: run PWA audit, confirm ≥90 (10g).
4. **Deploy**: push to master, verify GitHub Action green, visit `https://surri.xuresolutions.in`, hard-reload once (to pick up nginx cache-control), confirm second reload is cache-served (DevTools → Network → most requests show "(ServiceWorker)").
5. **Device test**: Android Chrome → install prompt appears; install; launch from home screen; go offline; confirm app shell loads.
6. **Native regression**: `npm run build:apk`, install APK, confirm game works identically (SW not active).
7. **Data cost check**: DevTools → Network → record a full game. Second visit should transfer near-zero bytes for assets, only socket frames.

## 12. Critical Files

| Path | Change type | Summary |
|---|---|---|
| `client/package.json` | modify | Add `vite-plugin-pwa` devDependency |
| `client/vite.config.js` | modify | Register `VitePWA()` with manifest + workbox config |
| `client/index.html` | modify | PWA meta tags (theme-color, apple-mobile-web-app-*, apple-touch-icon) |
| `client/src/main.js` | modify | Register SW via new helper, gated on non-native |
| `client/src/services/sw-update.js` | new | Workbox register + event bus for refresh/offline-ready |
| `client/src/components/UpdateBanner.vue` | new | "New version — Reload" strip |
| `client/src/App.vue` | modify | Mount `UpdateBanner`, subscribe to SW events |
| `client/src/socket.js` | modify | Expose `connection` reactive state for badge |
| `client/public/` | maybe move | Relocate icons from `client/assets/` if they're not currently shipped (see §9.2) |
| `nginx/surri2.conf` | modify | Cache-control headers for SW files + hashed assets |
| `docs/Board.md` | modify | Note the offline/reconnecting badge and update-banner UI |
