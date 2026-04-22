import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initAnalytics } from './services/analytics.js'
import { registerSW } from './services/sw-update.js'

initAnalytics()

// Skip SW in the Capacitor Android wrapper — the native app bundles its
// assets locally and doesn't need a service worker layered on top.
const isNative = !!(window.Capacitor && window.Capacitor.isNative)
if (!isNative) {
  registerSW()
}

createApp(App).mount('#app')
