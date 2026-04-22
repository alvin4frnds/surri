import { ref } from 'vue'
import { logEvent } from './services/analytics.js'

export const THEMES = [
  { id: 'classic',    label: 'Classic',    swatch: '#0f1b2d' },
  { id: 'paper',      label: 'Paper',      swatch: '#0E1116' },
  { id: 'late-night', label: 'Late Night', swatch: '#2A1B6B' },
  { id: 'salon',      label: 'Salon',      swatch: '#F4EBDA' },
]
const IDS = THEMES.map(t => t.id)

// Read the theme already set by the FOUC script.
const initial = document.documentElement.dataset.theme
const theme = ref(IDS.includes(initial) ? initial : 'classic')

export function useTheme() {
  return {
    theme,
    THEMES,
    setTheme(id) {
      if (!IDS.includes(id)) return
      if (theme.value === id) return
      theme.value = id
      document.documentElement.dataset.theme = id
      try { localStorage.setItem('surri_theme', id) } catch (_) {}
      try { logEvent('theme_selected', { theme: id }) } catch (_) {}
    },
  }
}
