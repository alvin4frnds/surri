import { registerSW as registerWorkbox } from 'virtual:pwa-register'

// Tiny event bus — App.vue subscribes to render UpdateBanner.
const listeners = { needRefresh: [], offlineReady: [] }

export function onNeedRefresh(cb) { listeners.needRefresh.push(cb) }
export function onOfflineReady(cb) { listeners.offlineReady.push(cb) }

let updateSW = null

export function registerSW() {
  updateSW = registerWorkbox({
    immediate: true,
    onNeedRefresh() { listeners.needRefresh.forEach(cb => cb()) },
    onOfflineReady() { listeners.offlineReady.forEach(cb => cb()) },
  })
}

// Called when the user confirms the UpdateBanner. In default builds
// (VITE_SHOW_UPDATE_BANNER not 'true') this is never invoked — the SW
// activates silently on next natural reload.
export function applyUpdate() {
  if (updateSW) updateSW(true)
}
