import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { initAnalytics } from './services/analytics.js'

initAnalytics()
createApp(App).mount('#app')
