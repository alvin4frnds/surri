# Spec 005 — CSS-Only 4-Theme Switcher (Classic / Paper / Late-Night / Salon)

**Status**: Reviewed — approved, with a screenshot-validation gate before merge
**Authored**: 2026-04-19
**Touches**: `client/src/style.css`, `client/index.html`, `client/src/main.js`, `client/src/theme.js` (new), `client/src/components/LobbyScreen.vue`, and class-attribute swaps in ~8 other `.vue` files. No server changes. No game-logic changes. No component structure changes.

---

## 1. Problem

Three full-redesign branches now exist as evaluated captures under `docs/design-refresh/`: `design/minimal` (Paper), `design/modern` (Late-Night Card Room), and `design/salon`. Rather than pick one and lose the other two, we want all four directions — **Classic** (the current UI, unchanged) plus the three new ones — to ship concurrently as user-selectable themes.

Three constraints shape the design:

1. **Per-player, not per-room.** Four humans at one table can each pick a different theme. The theme is a local viewing preference, never transmitted to the server, never visible to other players.
2. **Default is Classic.** No existing player should see a visual change on first load after this ships. Opting into a new theme is explicit.
3. **CSS-only — no functional rewrites.** The three design branches took broad liberties (deleted components, restructured the bidding drawer, added cinematic motion). This spec pulls in only what can be delivered as a theme swap: palette, typography, surface treatment, small reusable utility classes. It leaves HTML structure untouched.

The single constraint that matters most: **the spec must be self-contained.** A single Claude implementation shot must have every hex value, every utility-class definition, and every file-level instruction in-line — no "go look at the worktree branches" breadcrumbs. The branches will be deleted after this lands.

---

## 2. Proposed Change — CSS-only theme system

### 2a. Architecture

- **One attribute on `<html>`**: `data-theme="classic" | "paper" | "late-night" | "salon"`. Default `"classic"`.
- **CSS scoping**: every theme-specific rule is keyed on `:root[data-theme="<name>"]` selectors in a single stylesheet (`client/src/style.css`). No per-component theme CSS — everything resolves through CSS custom properties declared at the theme-root scope.
- **Shared semantic token set** (defined by *all four* themes with the *same variable names*; values differ):
  ```
  --app-bg              canvas background
  --app-surface         primary surface (cards, modals, input bg)
  --app-surface-2       secondary surface (nested panels, dialog bodies)
  --app-ink             primary text
  --app-muted           secondary text
  --app-rule            hairline divider / border color
  --app-accent          primary CTA fill / brand accent
  --app-accent-ink      text color on accent fill
  --app-accent-2        secondary accent (support request, info)
  --app-danger          destructive / lose / error
  --app-team-self       "your team" indicator
  --app-team-foe        opponent-team indicator
  --app-dealer          dealer indicator (crown/dot/etc.)
  --app-success         made-bid indicator
  --app-shadow          box-shadow preset for lifted surfaces
  --app-radius-sm       small radius (chips, inputs)
  --app-radius-lg       large radius (modals, CTAs)
  --app-font-ui         body/UI font stack
  --app-font-display    display/wordmark/numerics font stack
  ```
  Components reference `var(--app-...)` via Tailwind arbitrary values (e.g., `bg-[var(--app-surface)]`) or small theme-agnostic utility classes (`.app-bg`, `.app-cta`, `.app-chip`, `.app-rule`, `.app-surface`). The class definitions in `style.css` read only from the tokens — so swapping `data-theme` flips everything.
- **Reactive switcher**: `client/src/theme.js` exports `useTheme()` returning `{ theme: Ref<string>, setTheme: (t) => void, THEMES }`. Internally it updates both a reactive ref AND `document.documentElement.dataset.theme`, and writes to `localStorage` under key `surri_theme`. Writes are synchronous; reads happen once at module init (after the FOUC guard has already set the attribute).

### 2b. FOUC guard — inline script in `index.html`

An inline, synchronous script inside `<head>` sets the theme attribute **before** Tailwind CSS loads and **before** Vue mounts. This prevents the default Classic palette from flashing for a user whose stored theme is Salon.

Exact HTML addition (placed at the very end of `<head>`, right before `</head>`):

```html
<script>
  (function () {
    try {
      var t = localStorage.getItem('surri_theme');
      var allowed = ['classic', 'paper', 'late-night', 'salon'];
      if (!t || allowed.indexOf(t) === -1) t = 'classic';
      document.documentElement.dataset.theme = t;
    } catch (e) {
      document.documentElement.dataset.theme = 'classic';
    }
  })();
</script>
```

Must be:
- Before `<script type="module" src="/src/main.js">` (it is, because module scripts are deferred — but inline is safer regardless).
- After the `<link rel="stylesheet" href="...">` tags that load Google Fonts (§2e) are in-flight — ok, because the script just sets an attribute, no race.
- Uses old-style JS (no `let`/arrow) for maximum parse speed; this runs on the critical path.

### 2c. Theme switcher UI on the lobby

Add to `LobbyScreen.vue`, placed in the existing layout **below** the player-name input and **above** the "Create Room" button. NOT in a modal — visible on first visit so people notice it.

Markup skeleton (to be dropped in, classes use existing Tailwind defaults so it renders in any theme):

```vue
<div class="my-4">
  <div class="text-xs uppercase tracking-wider text-slate-400 mb-2">
    Theme
  </div>
  <div class="grid grid-cols-4 gap-2">
    <button
      v-for="t in THEMES"
      :key="t.id"
      type="button"
      @click="setTheme(t.id)"
      :aria-pressed="theme === t.id"
      :aria-label="`Use ${t.label} theme`"
      class="flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-1 text-[11px]"
      :class="theme === t.id
        ? 'border-[var(--app-accent)] ring-1 ring-[var(--app-accent)]'
        : 'border-slate-600'"
    >
      <span class="w-6 h-6 rounded-full border border-white/10" :style="`background:${t.swatch}`"></span>
      <span>{{ t.label }}</span>
    </button>
  </div>
</div>
```

Where `THEMES` is imported from `client/src/theme.js`:

```js
export const THEMES = [
  { id: 'classic',    label: 'Classic',    swatch: '#0f1b2d' },
  { id: 'paper',      label: 'Paper',      swatch: '#0E1116' },
  { id: 'late-night', label: 'Late Night', swatch: '#2A1B6B' },
  { id: 'salon',      label: 'Salon',      swatch: '#F4EBDA' },
]
```

Switcher is **only** on the lobby. Not shown on waiting-room, not shown in-game — preventing mid-match theme flipping that could distract the table. The attribute itself can still be changed at runtime (localStorage writes, immediate CSS reflow); we just don't expose UI for it elsewhere.

### 2d. Theme token definitions — ALL FOUR themes, complete

Paste this entire block into `client/src/style.css` in place of the current `body { background: #0f1b2d; ... }` line. These blocks define the theme tokens; the utility classes in §2g consume them.

```css
/* -----------------------------------------------------------
   Classic — the existing UI, extracted into theme tokens so
   nothing changes for a user on the default theme.
   ----------------------------------------------------------- */
:root[data-theme="classic"] {
  --app-bg:          #0f1b2d;   /* current body bg */
  --app-surface:     #1e293b;   /* slate-800-ish, hardcoded in App.vue */
  --app-surface-2:   #1a1a1a;   /* disconnection overlay */
  --app-ink:         #e2e8f0;   /* slate-200 (current body color) */
  --app-muted:       #94a3b8;   /* slate-400 */
  --app-rule:        #475569;   /* slate-600 (current input borders) */
  --app-accent:      #16a34a;   /* green-600 (CREATE ROOM etc.) */
  --app-accent-ink:  #ffffff;
  --app-accent-2:    #2563eb;   /* blue-600 (Ask Partner, Share) */
  --app-danger:      #dc2626;   /* red-600 */
  --app-team-self:   #3b82f6;   /* blue-500 (your team pill) */
  --app-team-foe:    #ef4444;   /* red-500 */
  --app-dealer:      #f59e0b;   /* amber-500 crown */
  --app-success:     #22c55e;
  --app-shadow:      0 4px 12px rgba(0, 0, 0, 0.35);
  --app-radius-sm:   8px;
  --app-radius-lg:   16px;
  --app-font-ui:     ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
                     Roboto, 'Helvetica Neue', Arial, sans-serif;
  --app-font-display: ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
                      Roboto, 'Helvetica Neue', Arial, sans-serif;
}

/* -----------------------------------------------------------
   Paper — near-monochrome, warm-brass accent. From
   design/minimal (agent-a8acef7b) style.css + 01-minimal.md.
   ----------------------------------------------------------- */
:root[data-theme="paper"] {
  --app-bg:          #0E1116;
  --app-surface:     #171B22;
  --app-surface-2:   #1F252E;
  --app-ink:         #ECEEF2;
  --app-muted:       #8A919C;
  --app-rule:        #262B34;
  --app-accent:      #C9A24B;   /* warm brass */
  --app-accent-ink:  #0E1116;
  --app-accent-2:    #8FA5C2;   /* cooler info accent (not in minimal,
                                   synthesised for ask-partner / chips) */
  --app-danger:      #C7463C;
  --app-team-self:   #C9A24B;
  --app-team-foe:    #C7463C;
  --app-dealer:      #C9A24B;
  --app-success:     #6B9E6E;
  --app-shadow:      0 2px 8px rgba(0, 0, 0, 0.55);
  --app-radius-sm:   6px;
  --app-radius-lg:   12px;
  --app-font-ui:     'Inter', ui-sans-serif, system-ui, -apple-system,
                     'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --app-font-display: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
}

/* -----------------------------------------------------------
   Late-Night Card Room — aurora gradient, electric lime,
   frosted-glass surfaces. From design/modern (agent-ad068d46)
   style.css + 02-modern.md.
   ----------------------------------------------------------- */
:root[data-theme="late-night"] {
  --app-bg:          #07070F;          /* --color-void */
  --app-surface:     rgba(22, 24, 44, 0.72);    /* glass-e1 */
  --app-surface-2:   rgba(32, 36, 60, 0.78);    /* glass-e2 */
  --app-ink:         #F4F5FF;          /* --color-text-hi */
  --app-muted:       #A9ADCB;          /* --color-text-mid */
  --app-rule:        rgba(255, 255, 255, 0.08);
  --app-accent:      #C3FF3A;          /* electric lime */
  --app-accent-ink:  #0A0A14;
  --app-accent-2:    #7A5CFF;          /* violet — ask-partner, chips */
  --app-danger:      #FF4F6D;
  --app-team-self:   #3DD8FF;
  --app-team-foe:    #FF5577;
  --app-dealer:      #FFB84D;
  --app-success:     #3DE58C;
  --app-shadow:      0 20px 60px rgba(0, 0, 0, 0.55);
  --app-radius-sm:   10px;
  --app-radius-lg:   20px;
  --app-font-ui:     'Inter', -apple-system, system-ui, sans-serif;
  --app-font-display: 'Space Grotesk', -apple-system, system-ui, sans-serif;
}

/* -----------------------------------------------------------
   Salon — warm parlour. Cream paper, antique brass,
   Cormorant Garamond serif. From design/salon
   (agent-afb30e3c) style.css + 04-salon.md.
   ----------------------------------------------------------- */
:root[data-theme="salon"] {
  --app-bg:          #F4EBDA;          /* cream */
  --app-surface:     #FBF4E6;          /* paper */
  --app-surface-2:   #ECDFC5;          /* vellum */
  --app-ink:         #2B2118;
  --app-muted:       #8C7B66;
  --app-rule:        #C7B590;
  --app-accent:      #7A5C23;          /* brass-deep (CTA fill) */
  --app-accent-ink:  #F4EBDA;          /* cream on brass */
  --app-accent-2:    #30563F;          /* bottle green — support / info */
  --app-danger:      #7A2230;          /* burgundy */
  --app-team-self:   #30563F;
  --app-team-foe:    #7A2230;
  --app-dealer:      #A8813A;          /* brass */
  --app-success:     #30563F;
  --app-shadow:      0 12px 28px -10px rgba(122, 92, 35, 0.22);
  --app-radius-sm:   10px;
  --app-radius-lg:   18px;
  --app-font-ui:     'Inter', system-ui, -apple-system, 'Segoe UI',
                     Roboto, sans-serif;
  --app-font-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
}
```

### 2e. Font loading

One combined Google Fonts URL in `<head>`, before the FOUC script, that loads every font used by any theme. Total cost: ~120KB gzipped on first visit; cached across sessions.

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&display=swap" />
```

The Classic theme does **not** reference any of these families in `--app-font-*` — Classic uses system fonts, so a user on Classic isn't visually affected by the fonts being loaded (and modern browsers download font files lazily only when a glyph using the family is rendered, via `font-display: swap`).

**Rejected alternative**: loading only the active theme's fonts on demand via dynamically-injected `<link>` tags. Adds complexity, causes a second FOUC on theme switch (fonts fetch after the flip), and saves ~120KB that's cached within a day anyway. Not worth it.

### 2f. Component migration — hardcoded-color inventory

Grep patterns the implementer should run from repo root:

```
grep -rE "#[0-9A-Fa-f]{6}" client/src/
grep -rE "bg-(slate|green|red|blue|amber|emerald|yellow|orange)-" client/src/
grep -rE "text-(slate|green|red|blue|amber|emerald|yellow|orange)-" client/src/
grep -rE "border-(slate|green|red|blue|amber|emerald|yellow|orange)-" client/src/
```

Every hit is a candidate for replacement with a `var(--app-...)` reference. Examples (not exhaustive — the grep is authoritative):

| Current | Replacement |
| --- | --- |
| `bg-[#1a1a1a]`, `bg-[#0f1b2d]`, `bg-[#1e293b]` in `App.vue` | `bg-[var(--app-surface)]` or `bg-[var(--app-surface-2)]` (use the darker for backdrops) |
| `bg-amber-700/90` (lobby alpha banner) | `bg-[var(--app-dealer)]/80` (colour-coded warn/highlight — or keep amber literally, it's explicitly a "this is beta" signal; §7 flags) |
| `bg-green-600` (Create Room, Start Game) | `bg-[var(--app-accent)] text-[var(--app-accent-ink)]` |
| `bg-blue-600` (Share, Ask Partner) | `bg-[var(--app-accent-2)]` |
| `bg-red-600` / `text-red-400` (Give Up, errors) | `bg-[var(--app-danger)]` / `text-[var(--app-danger)]` |
| `border-slate-600` (inputs) | `border-[var(--app-rule)]` |
| `text-slate-100` / `text-slate-200` / `text-white` on surfaces | `text-[var(--app-ink)]` |
| `text-slate-400` / `text-slate-500` | `text-[var(--app-muted)]` |
| `bg-slate-800`, `bg-slate-700` | `bg-[var(--app-surface)]` / `bg-[var(--app-surface-2)]` |
| Team-color highlights (your team blue / opponent red) | `bg-[var(--app-team-self)]` / `bg-[var(--app-team-foe)]` |
| Dealer crown amber | `text-[var(--app-dealer)]` |

Suit colours on cards (`text-red-400` vs `text-white` from `suitColor(s)`) are a special case — these are for suit glyphs on card FACES, and we keep them as hard-coded red/black to match the PNG card assets. Don't touch those.

**File list** (approximate — grep output is authoritative):
- `client/src/App.vue`
- `client/src/components/LobbyScreen.vue`
- `client/src/components/WaitingRoom.vue`
- `client/src/components/GameBoard.vue`
- `client/src/components/BiddingPanel.vue`
- `client/src/components/PlayerArea.vue`
- `client/src/components/PlayerHand.vue`
- `client/src/components/TrickArea.vue`
- `client/src/components/RoundSummary.vue`
- `client/src/components/TramOverlay.vue`
- `client/src/components/HelpOverlay.vue`
- `client/src/components/IssueReportOverlay.vue`
- `client/src/components/ExplainLossOverlay.vue`
- `client/src/components/GameOverScreen.vue`

Touch only colour/font class attributes. Do **not** rename components, reorganise DOM, alter computed properties, or change emit signatures.

### 2g. Reusable theme-scoped utility classes

Five named classes in `style.css` — all read from `--app-*` tokens OR from theme-scoped selectors. Defined ONCE; components just use them.

```css
/* Body + html already apply the theme tokens. */
html, body {
  background: var(--app-bg);
  color: var(--app-ink);
  font-family: var(--app-font-ui);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Canvas: the outermost app frame. Classic/Paper/Salon: flat colour
   via --app-bg. Late-Night: aurora gradient. */
.app-canvas {
  min-height: 100vh;
  min-height: 100dvh;
  background: var(--app-bg);
}
:root[data-theme="late-night"] .app-canvas {
  background:
    radial-gradient(120% 80% at 50% 0%,
      #2A1B6B 0%, #1B1140 22%, #0A1330 55%, #07070F 100%);
}
:root[data-theme="salon"] .app-canvas {
  background:
    var(--app-bg)
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.17  0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-blend-mode: multiply;
}

/* Primary filled CTA — the single button treatment across themes. */
.app-cta {
  background: var(--app-accent);
  color: var(--app-accent-ink);
  font-family: var(--app-font-ui);
  font-weight: 600;
  border-radius: var(--app-radius-lg);
  padding: 12px 20px;
  box-shadow: var(--app-shadow);
  border: 0;
  transition: filter 140ms ease-out, transform 140ms ease-out;
}
.app-cta:hover:not(:disabled) { filter: brightness(1.06); }
.app-cta:active:not(:disabled) { transform: translateY(1px); }
.app-cta:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
/* Late-Night adds a lime glow */
:root[data-theme="late-night"] .app-cta {
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.55),
    0 10px 24px rgba(195, 255, 58, 0.45);
}

/* Destructive CTA (Give Up confirmation, etc.) */
.app-cta-danger {
  background: var(--app-danger);
  color: #FFFFFF;
  font-family: var(--app-font-ui);
  font-weight: 600;
  border-radius: var(--app-radius-sm);
  padding: 10px 16px;
  border: 0;
}

/* Surface — modals, input backgrounds, pills. */
.app-surface {
  background: var(--app-surface);
  color: var(--app-ink);
  border: 1px solid var(--app-rule);
  border-radius: var(--app-radius-lg);
}
:root[data-theme="late-night"] .app-surface {
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}

/* Small pill — chips, badges, "Pass" tags, "Asked" tags. */
.app-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--app-rule);
  background: var(--app-surface);
  color: var(--app-muted);
  border-radius: var(--app-radius-sm);
  font-family: var(--app-font-ui);
  font-size: 12px;
  font-weight: 500;
}

/* Hairline horizontal rule. */
.app-rule {
  height: 1px;
  background: var(--app-rule);
  border: 0;
  margin: 10px 0;
  width: 100%;
}

/* Classic has no display-font distinction from UI-font; the other
   three want big numerics in the display face. Provide a utility. */
.app-num {
  font-family: var(--app-font-display);
}
:root[data-theme="salon"] .app-num {
  font-feature-settings: "onum" 1, "lnum" 0;
  font-weight: 500;
}

/* Reduced motion — respect in all themes. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 120ms !important;
    transition-duration: 120ms !important;
  }
}
```

That's the full `style.css` rewrite (plus the theme token blocks from §2d). Everything else is a class-swap in components.

Use these utility classes wherever a Vue template currently hardcodes the equivalent visual. E.g., `<div class="bg-slate-800 rounded-2xl">` becomes `<div class="app-surface">`. Mix-and-match with Tailwind utilities is fine as long as no hardcoded colour survives.

### 2h. Theme wiring — `client/src/theme.js` (new, ~25 lines)

```js
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
```

`main.js` imports nothing extra — the FOUC script has already set the attribute before Vue runs. No need to touch `main.js`.

`LobbyScreen.vue` imports `useTheme` and renders the 2×4 tile grid shown in §2c.

---

## 3. Gotchas

1. **Tailwind v4 purge / safelist.** Arbitrary values like `bg-[var(--app-surface)]` must appear literally in source files to survive the v4 content-scan purge. Don't string-concatenate them. Every swap in §2f produces literal class strings — fine. The `theme.js` module only touches a dataset attribute, not class strings.

2. **Mid-game theme change blocked by UI but not by code.** A curious user could manually call `localStorage.setItem('surri_theme','salon'); location.reload()` mid-round. Because theme is entirely local and CSS-only, this is safe (and actually works). We don't defend against it. The no-picker-in-game rule is purely UX ("don't distract the table").

3. **Invalid localStorage values.** If a user tampers with `localStorage.surri_theme` to `"banana"`, the FOUC guard's `indexOf(t) === -1` check falls back to `'classic'`. `theme.js`'s `setTheme` rejects invalid IDs.

4. **Capacitor / Android WebView.** WebView caches aggressively. Existing release users will get the update on next app-launch after the AAB is re-deployed — they will still see Classic (unchanged). Bump `versionCode` + `versionName` in `client/android/app/build.gradle` as usual before rebuilding the AAB. LocalStorage on WebView persists — users' theme choice survives app restarts.

5. **Google Fonts + offline.** If a user plays offline (spec 003 PWA), Google Fonts may fail to load. `font-display: swap` + the system-font fallback in every `--app-font-*` value means the app still renders — just without Cormorant/Space-Grotesk/Inter. Acceptable degradation.

6. **Analytics.** `services/analytics.js` isn't touched. We could log theme selection as an event later; flagged in §7, not in scope.

7. **Card face PNGs stay the same across themes.** The card assets in `client/public/cards/` are designed for a white/bright background and a dark-ish app chrome. On the Salon cream canvas they read well enough (see `docs/design-refresh/screenshots/salon/08-playing-your-turn.png` for a captured reference). Do **not** attempt to re-tint card PNGs or ship theme-specific card assets — that's out of scope and would cross the "CSS-only" line.

8. **Card backs.** The three design branches added custom card-back treatments (Paper: plain; Late-Night: violet cross-hatch; Salon: cream monogram S). CSS-only scope means we use the SAME card-back treatment across all four themes — whatever the current app ships. The individual branch card-back experiments are **out of scope** for this spec (§9).

9. **The classic `bg-amber-700/90` alpha banner** in `LobbyScreen.vue` is a semantic "this is beta, read this" element, not a theme decoration. Keep its colour hard-coded (or map to `--app-dealer` which is also amber in Classic) — worth a single Open Question either way.

10. **TailwindCSS v4 theme tokens** (`@theme { --color-... }` blocks) from the branch `style.css` files are **not** reused here. That mechanism emits Tailwind utility classes like `bg-accent`. For this spec the unambiguous approach is to route via CSS custom properties and arbitrary values — no new Tailwind utilities. Simpler, more portable, theme swap is instant.

---

## 4. Test cases

**4a. Default theme on first visit.** Clear localStorage, load `/`. Expect `data-theme="classic"` on `<html>` (DevTools → Elements). Expect the lobby to look identical to the current production UI.

**4b. Switcher writes theme + persists.** On lobby, click the "Paper" tile. Expect immediate repaint — canvas darkens to `#0E1116`, CTAs turn brass. `localStorage.surri_theme === "paper"`. Hard refresh — expect still Paper, no flash of Classic.

**4c. Switcher works for all four themes.** Click each tile in sequence (classic → paper → late-night → salon → classic). Each click must produce a visible repaint. No errors in console.

**4d. Theme survives navigation into game.** Pick Late Night, create a room, start a solo bot game. Every screen (waiting room, bidding, playing, round summary, modals) must render in Late Night theme. No classic-palette leakage.

**4e. Cross-player isolation.** In two browser windows, one set to Paper and one set to Salon, create + join the same room. Each window shows its own theme; neither player sees the other's theme.

**4f. FOUC-free reload.** On each of the four themes, hard refresh the page and watch for a flash of Classic. Expect no flash — the FOUC script sets the attribute synchronously before CSS paints.

**4g. Invalid localStorage fallback.** Set `localStorage.surri_theme = "banana"`. Reload. Expect `data-theme="classic"` and normal lobby. Switcher still works.

**4h. Switcher a11y.** Tab to the switcher tiles; each is reachable via keyboard. Arrow keys or tab cycles through them. Enter/Space activates. Screen-reader announces the label (`aria-label="Use Salon theme"`) and pressed state (`aria-pressed="true"` for the active one).

**4i. Reduced-motion users.** With OS "reduce motion" enabled, any theme-specific animations (none introduced in this spec, but future-proof) respect the media query.

**4j. No layout shift on theme change.** Switching between themes must NOT cause any element to resize in a way that affects document layout. Fonts have the same metrics or at least similar enough that line heights don't shift. (Known risk with Cormorant serif vs Inter sans — verify on lobby and round summary.)

**4k. Bundle size.** After build (`npm run build`), compare gzipped size to master. Expect delta under **+8 KB** for the CSS additions (no code logic added). Google Fonts are not in our bundle — they're third-party.

---

## 5. Verification

Manual checklist:

- [ ] Lobby renders correctly in all 4 themes. Swatch tiles show distinct colours.
- [ ] Create-room → waiting-room → bidding → playing → round-summary flow works end-to-end in all 4 themes.
- [ ] Round summary uses the `--app-danger` colour for "You lost" and `--app-success` for "You won" in all 4 themes.
- [ ] Dealer indicator uses `--app-dealer` in all 4 themes.
- [ ] No hardcoded hex colors remain in any `.vue` file under `client/src/components/` (grep `#[0-9A-Fa-f]{6}` returns zero lines there — matches may survive in App.vue for gameplay-specific things like card suit glyphs and analytics blocks; those are ok).
- [ ] `npm run build` succeeds in `client/`. Delta to dist CSS gzipped < 8 KB.
- [ ] Compare against captured reference screenshots at `docs/design-refresh/screenshots/{minimal,modern,salon}/` — the implementation should visually match within ±10% (perfect pixel match is not the goal; theme fidelity is).
- [ ] **Screenshot-matrix gate (load-bearing).** Capture fresh screenshots for **every theme × every screen**: Lobby, WaitingRoom, Bidding, PartnerReveal (bid ≥10), Playing (mid-trick), TramOverlay, RoundSummary, GameOver, HelpOverlay, ExplainLossOverlay, IssueReportOverlay. 4 themes × 11 screens = 44 shots. Save under `docs/design-refresh/screenshots/v1-shipping/<theme>/<screen>.png`. Reviewer must eyeball all 44 before merge — no screen may look broken or regressed in any theme. This is the primary sign-off criterion.
- [ ] Capacitor `npm run cap:build` still succeeds; native AAB build (`./gradlew bundleRelease`) is clean.

---

## 6. Resolved Decisions

1. **Default theme**: **Classic.** Don't surprise existing players. Opting into a new theme is explicit.
2. **"Beta" label on non-Classic themes**: **Leave as is (no label)** for v1. Re-evaluate if users report confusion after shipping.
3. **Analytics event on theme selection**: **Yes.** One line in `setTheme()`: `logEvent('theme_selected', { theme: id })`. Trivial and helps us see which themes players stick with.
4. **Alpha banner colour**: **Keep hard-coded** `bg-amber-700/90`. It's a universal "read this" signal, not a theme decoration.
5. **Hover preview on switcher**: **No, for v1.** Click-to-commit is fine. Revisit in v2 if users express interest.
6. **Switcher on waiting-room**: **No, for v1.** Lobby-only keeps the scope tight; reconsider after shipping if users ask for it.
7. **Card-back per theme**: **No.** Confirmed out of scope — would break the CSS-only constraint. Shared card-back across all four themes.

---

## 7. Critical files

| File | Change | Summary |
| --- | --- | --- |
| `client/src/style.css` | edit | Replace current 3-line content with the full theme-token blocks (§2d) + utility classes (§2g). |
| `client/index.html` | edit | Add Google Fonts preconnect + stylesheet link (§2e). Add inline FOUC script at end of `<head>` (§2b). |
| `client/src/theme.js` | **new** | `useTheme()` composable + `THEMES` constant (§2h). |
| `client/src/components/LobbyScreen.vue` | edit | Add 4-tile theme picker between name input and Create Room (§2c). Swap hardcoded colour classes to `var(--app-...)`. |
| `client/src/App.vue` | edit | Swap hardcoded `#0f1b2d` / `#1e293b` / `#1a1a1a` to `var(--app-surface)` / `var(--app-surface-2)` / `var(--app-bg)`. |
| `client/src/components/WaitingRoom.vue` | edit | Swap hardcoded slate/green/red/blue Tailwind classes to `var(--app-...)` equivalents. |
| `client/src/components/GameBoard.vue` | edit | Same swaps. |
| `client/src/components/BiddingPanel.vue` | edit | Same swaps. |
| `client/src/components/PlayerArea.vue` | edit | Same swaps. Dealer crown colour → `var(--app-dealer)`. |
| `client/src/components/PlayerHand.vue` | edit | Keep card-face text colours (`text-red-400` / `text-white`) as-is — those match the card PNG assets. Swap surrounding chrome colours. |
| `client/src/components/TrickArea.vue` | edit | Same swaps. |
| `client/src/components/RoundSummary.vue` | edit | Win/lose colours → `var(--app-success)` / `var(--app-danger)`. Team pills → `var(--app-team-self)` / `var(--app-team-foe)`. |
| `client/src/components/TramOverlay.vue` | edit | Same swaps. |
| `client/src/components/HelpOverlay.vue` | edit | Same swaps. |
| `client/src/components/IssueReportOverlay.vue` | edit | Same swaps. |
| `client/src/components/ExplainLossOverlay.vue` | edit | Same swaps. |
| `client/src/components/GameOverScreen.vue` | edit | Same swaps. |
| `client/tailwind.config.js` | no change | Empty `theme.extend` is fine. We route through CSS vars, not Tailwind theme tokens. |
| `client/src/main.js` | no change | FOUC guard lives in `index.html`, runs before `main.js`. |
| `client/android/app/build.gradle` | edit | Bump `versionCode` + `versionName` before next AAB upload. |
| `server/**` | no change | Confirmed: zero server changes. |

---

## 8. Explicit non-goals

Things the three design branches did that are **not** coming in with this spec. If the implementer finds themselves reaching into the branches to pull any of these, stop.

- **Salon's card-back redesign** (`.card-back-salon` with cream paper + italic-S monogram). Requires HTML change in `PlayerArea.vue` / `PlayerHand.vue` — out of CSS-only scope.
- **Late-Night's cinematic animations** — bid flash ripple, partner-reveal sweep, score count-up, trump breathe, dealer crown spin. All defined in `.anim-*` keyframes in modern's `style.css`. Adds real complexity; the CSS is mechanical but the Vue components need `<Transition>` wiring that's HTML change.
- **Paper's bidding drawer restructure.** The minimal branch moved the bidding panel into a bottom drawer that covers the hand. That's HTML-layout, not styling. Out.
- **Late-Night's TRAM rotating gradient ring** (`.tram-ring` conic-gradient). Pure CSS but the current `TramOverlay.vue` doesn't have the DOM structure to host it — would need a wrapper. Out.
- **Salon's double-rule framing** (`double-rule` + `outline-offset: 3px`) around the room code plinth and score-delta well. Requires adding a wrapper div on those elements. Keep as a stretch goal for a v2 pass.
- **Salon's paper-grain overlay** via SVG noise — actually included above in §2g on `.app-canvas` for Salon. That one CSS rule crosses the line because it's self-contained; everything else in this list requires DOM changes and is out.
- **Late-Night's violet drifting orb** on the lobby (`.violet-orb` with `orb-drift` keyframes). Decorative; adds a fixed-position element to the lobby. HTML change. Out. If we decide it's worth it, add it in a follow-up.
- **Deletion of `InfoBar.vue` and `BidProgressBar.vue`.** All three branches deleted these as confirmed dead components. Leave them on master for now — file deletions aren't CSS-only and are safe to defer.

Keep this list in mind: the spec deliberately ships a quieter, more portable subset of each direction. Users who want the full cinema/grain/monogram experience can be told "picking Late-Night or Salon gives you the palette and typography; the full direction ships in a later release."
