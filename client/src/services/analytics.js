import { Capacitor } from '@capacitor/core'

let nativeAnalytics = null
let webAnalytics = null
let initialized = false

export async function initAnalytics() {
  if (initialized) return
  initialized = true

  try {
    if (Capacitor.isNativePlatform()) {
      const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics')
      nativeAnalytics = FirebaseAnalytics
      await FirebaseAnalytics.setEnabled({ enabled: true })
    } else {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY
      if (!apiKey) return

      const { initializeApp } = await import('firebase/app')
      const { getAnalytics } = await import('firebase/analytics')

      const app = initializeApp({
        apiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
        measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
      })
      webAnalytics = getAnalytics(app)
    }
  } catch (e) {
    console.warn('Analytics init failed:', e)
  }
}

export async function logEvent(name, params) {
  try {
    if (nativeAnalytics) {
      await nativeAnalytics.logEvent({ name, params: params ?? {} })
    } else if (webAnalytics) {
      const { logEvent: fbLogEvent } = await import('firebase/analytics')
      fbLogEvent(webAnalytics, name, params)
    }
  } catch (e) {
    console.warn('Analytics logEvent failed:', e)
  }
}

export async function setUserId(id) {
  try {
    if (nativeAnalytics) {
      await nativeAnalytics.setUserId({ userId: id })
    } else if (webAnalytics) {
      const { setUserId: fbSetUserId } = await import('firebase/analytics')
      fbSetUserId(webAnalytics, id)
    }
  } catch (e) {
    console.warn('Analytics setUserId failed:', e)
  }
}
