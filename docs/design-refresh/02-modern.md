# Surri — Modern Redesign Proposal

_One cohesive direction. Opinionated. No menu of options._

---

## 1. Design Direction

**A late-night card room rendered as a premium mobile product.** Surri is a card game your grandfather played, and the redesign leans into that drama — deep ink backgrounds washed with aurora-like violet-to-cyan gradients, frosted-glass panels that float over the board, and a single confident electric-lime CTA that lights up every decision moment. The hero is the **center play area** — the trump glyph is enlarged into an ambient, softly-pulsing backdrop behind the trick, and every card that lands there gets a flourish. We stay flashy on _round-changing moments_ (partner reveal, bid confirm, trick resolve, TRAM call, score count-up) and strictly quiet on the persistent chrome (info bar, seat pills, help) — the game breathes in and out.

---

## 2. Color System

All values are final. Tokens are named as Tailwind-compatible CSS variables; map them via `@theme` in Tailwind v4.

### Base / Surfaces

| Token | Hex | Purpose |
|---|---|---|
| `--bg-void` | `#07070F` | Page base (true near-black with a blue tilt) |
| `--bg-aurora-top` | `#1B1140` | Top stop of the ambient background gradient |
| `--bg-aurora-mid` | `#0A1330` | Middle stop (sits behind the table) |
| `--bg-aurora-bot` | `#07070F` | Bottom stop (merges into `--bg-void`) |
| `--surface-1` | `rgba(22,24,44,0.72)` | Glass panel base (with backdrop-blur 18px) |
| `--surface-2` | `rgba(32,36,60,0.78)` | Raised panel (modals, bidding sheet) |
| `--surface-3` | `#20243C` | Opaque inset (inside a glass panel, e.g. bid number well) |
| `--stroke-hair` | `rgba(255,255,255,0.06)` | Inner stroke on all glass |
| `--stroke-bright`| `rgba(255,255,255,0.14)` | Inner stroke on hovered/selected glass |

**Ambient gradient** (applied to `body` via a fixed pseudo-element, NOT every panel):
```
radial-gradient(120% 80% at 50% 0%, #2A1B6B 0%, #1B1140 22%, #0A1330 55%, #07070F 100%)
```
A second, very subtle `blur(80px)` noise layer sits on top at 4% opacity for texture.

### Text

| Token | Hex | Purpose |
|---|---|---|
| `--text-hi` | `#F4F5FF` | Primary text, numerics |
| `--text-mid` | `#A9ADCB` | Secondary, labels |
| `--text-lo` | `#6B6F8E` | Disabled, helper text |

### Accents

| Token | Hex | Purpose |
|---|---|---|
| `--accent` | `#C3FF3A` | **Primary CTA — electric lime.** One color. Commit. Used for: Create Room, Start Game, Confirm Bid, Start Play, Next Round. |
| `--accent-glow` | `rgba(195,255,58,0.45)` | 24px blur glow under CTAs on press |
| `--accent-2` | `#7A5CFF` | Secondary accent — violet. Used for: Ask Partner, support chips, bid history chips. |
| `--accent-2-soft` | `rgba(122,92,255,0.18)` | Violet tint fills |

The lime CTA on a violet-black ambient gradient is the signature pairing — do not dilute it with a second CTA hue.

### Team & Seat Colors

| Token | Hex | Purpose |
|---|---|---|
| `--team-self` | `#3DD8FF` | Your team (cyan — readable on dark, distinct from CTA) |
| `--team-foe` | `#FF5577` | Opponent team (warm coral-red) |
| `--dealer` | `#FFB84D` | Dealer crown/badge (amber — neither team color) |
| `--trump-hot` | `#FF6A88` | Trump suit highlight if red suit |
| `--trump-cold` | `#B9B6D4` | Trump suit highlight if black suit |

### State

| Token | Hex | Purpose |
|---|---|---|
| `--ok` | `#3DE58C` | Made bid, success toasts |
| `--warn` | `#FFB84D` | Dealer change banner, "Must Bid" forced state |
| `--danger` | `#FF4F6D` | Give Up, round lost, invalid TRAM |
| `--tram-mode` | `#C3FF3A` -> `#7A5CFF` gradient | TRAM-claim mode — board border pulses with this gradient while selecting |

### Card Face Treatment

Card faces remain the existing PNGs but are wrapped in a new `--card-frame` treatment: 1px `--stroke-hair` outer, 4px radius, subtle inset highlight `inset 0 1px 0 rgba(255,255,255,0.14)`. Card backs get a redraw — dark indigo `#1B1140` with a subtle linework pattern in `--accent-2` at 8% opacity (not gold).

---

## 3. Typography

Two families. One display, one neutral UI.

| Role | Family | Weight | Size | Letter-spacing |
|---|---|---|---|---|
| Wordmark `SURRI` | **Space Grotesk** | 700 | 56px | 0.34em |
| Display numerals (bid, score, room code) | **Space Grotesk** | 700 | 36–72px | 0 |
| Section title (ROUND LOST, PARTNER REVEAL) | Space Grotesk | 600 | 14px | 0.22em uppercase |
| Body / UI | **Inter** | 500 | 14px | 0 |
| Helper / chip | Inter | 500 | 11px | 0.06em |
| Micro-label (TRUMP, DEALER) | Inter | 600 | 10px | 0.18em uppercase |

**Why Space Grotesk for display/numerals:** its geometric caps and wide counters photograph large without feeling corporate-sans; the numerals have real personality (open 4, geometric 6/9) which makes the score-count-up animation feel cinematic. Inter for body because it reads perfectly on small Android screens and pairs cleanly without visual argument.

Both load via `@fontsource` (already npm-friendly, no CDN runtime cost). Fallback stack: `-apple-system, system-ui, sans-serif`.

---

## 4. Surface & Elevation System

We use **real glassmorphism** for overlays and the persistent info bar, but _never_ for the ambient board (that stays clean gradient + cards).

### Elevation Levels

| Level | Usage | Spec |
|---|---|---|
| E0 — Ambient | Board background, behind everything | No shadow. The aurora gradient IS the depth. |
| E1 — Seat tile | Player pills, info bar | `background: --surface-1; backdrop-filter: blur(16px) saturate(1.2); border: 1px solid --stroke-hair; box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.35);` radius 16px |
| E2 — Panel | Bidding panel, partner-reveal, help | same as E1 but `blur(22px)`, radius 20px, `box-shadow: 0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px --stroke-hair;` |
| E3 — Modal | Round summary, game over, issue report | E2 plus a backdrop scrim: `rgba(7,7,15,0.72)` with `backdrop-filter: blur(8px)`. Radius 24px. |
| E4 — Transient | Toasts, tricks-won pop | Drop-shadow only, no blur. `box-shadow: 0 12px 40px rgba(122,92,255,0.35);` |

**Inner-stroke rule:** every glass surface gets a 1px inner top-highlight (`inset 0 1px 0 rgba(255,255,255,0.06)`) — this single detail is what makes glass feel premium instead of muddy. Apply to panels, buttons, suit tiles, card wrappers.

**Buttons**
- Primary (lime CTA): solid `--accent`, text `#0A0A14` (dark on lime, NOT white — contrast ratio matters here), 14px padding, 14px radius. Inner stroke `inset 0 1px 0 rgba(255,255,255,0.55)` + outer `box-shadow: 0 10px 24px --accent-glow`. On press: scale 0.97, shadow tightens to 4px.
- Secondary: glass E1 background, text `--text-hi`, no glow.
- Destructive (Give Up): solid `--danger`, text `#FFF`, inner stroke + outer `0 8px 24px rgba(255,79,109,0.35)`.

**Card playable affordance:** replace the current thin green underline with a **soft lime drop-halo** (`filter: drop-shadow(0 0 12px rgba(195,255,58,0.55))`) on the PNG itself + a 2px lime inner ring. Unplayable cards get `filter: saturate(0.4) brightness(0.55)` — reads clearly as "off" without leaving the grid.

---

## 5. Motion & Interaction

Use **`@vueuse/motion`** (Motion One under the hood — ~10KB, Vue-native). No GSAP. Spring physics, not easings, for anything tactile.

| Moment | Spec |
|---|---|
| Card deal (round start) | Each of 13 cards flies from deck origin (center-back) to hand, stagger 30ms, spring `{stiffness: 260, damping: 22}`, duration ~600ms total. Cards rotate from `rotateY(180deg)` to `0` as they land. |
| Hand sort | FLIP animation when hand re-sorts, 220ms ease-out. |
| Bid confirm | CTA flashes lime→white→lime (80ms total), scale bump to 1.04 then settle, a lime ring ripples outward from the button at 600ms. |
| Partner reveal | Full-screen violet-gradient wash sweeps top-down in 400ms, then partner's 13 cards cascade flip face-up left-to-right (stagger 45ms, spring), the revealed hand label fades in at +500ms. The rest of the board dims to 60% brightness during the reveal, returns at +1200ms. |
| Card play (trick) | Selected card lifts 24px and rotates 4deg, then launches along a Bezier curve to its trick position, 380ms spring. Landing impact: a soft white radial flash (10% opacity, 160ms) under the card. |
| Trick resolve | Winning card pulses with `--team-self` or `--team-foe` glow (2 pulses, 800ms), then all 4 cards fade-slide toward winner's seat in 400ms. Winner's tricks-won circle fills with a lime sweep. |
| TRAM mode enter | Board border gains a 2px gradient ring (`--accent` -> `--accent-2`) that rotates slowly (8s linear). Playable cards in claim order get a numbered badge that counts up as you add them. |
| Dhaap call | Red radial flash from caller's seat (180ms), seat pill shakes ±2px at 30ms period for 300ms. |
| Round summary score count-up | Old score → new score animates over 1200ms with `easeOutExpo`, the delta (`-20` / `+16`) scales in from 0 at 600ms in with a violet glow. "YOU WON/LOST" title scales from 0.6 with a spring settle. |
| Dealer change banner | Amber banner slides down from top of round-summary modal at +1400ms with a 8px vertical bounce, crown icon spins 360deg once. |

All animations respect `prefers-reduced-motion` — fallbacks to instant state change with a 120ms opacity fade.

---

## 6. Component Redesign Notes

### Lobby (`LobbyScreen.vue`)
- Kill the orange alpha banner as a wide strip — replace with a small violet-bordered glass chip at top center: "ALPHA · tap for feedback" that opens the feedback modal.
- Wordmark `SURRI` becomes Space Grotesk 700 with the **S and final I rendered in lime `--accent`**, middle letters in white — a small signature detail that ties the CTA color to the brand.
- Name input is a glass-E1 pill, no hard borders, 56px tall. Focus state: lime inner ring + lime caret.
- `CREATE ROOM` is the one big lime CTA. `GO` (join) is glass-E1 secondary — correct hierarchy.
- Background: the aurora gradient, with a single slow-drifting blurred violet orb (80px blur, 20s ease-in-out loop) behind the wordmark.

### Bot-Count Bottom Sheet
- Sheet becomes glass-E2 with a 2px top grab-handle (violet). Four bot tiles are square glass chips; selected state is lime-fill with dark text (matches CTA). Add a tiny subhead: "Bots play while you wait for friends."
- Exit animation: sheet translates down + scrim fades in 220ms spring.

### Waiting Room (`WaitingRoom.vue`)
- Room code becomes the hero: giant 72px Space Grotesk numerals in lime, centered, tap-to-copy with a brief "Copied" violet chip flourish. `Share` button is a small glass pill beside it.
- Player list: each row is glass-E1 with a 48px circular avatar well. Your row has a lime inner ring; bots have a violet ring + a tiny animated 2-dot "thinking" indicator. Empty seats pulse gently.
- `START GAME` is the lime CTA at bottom with a ▶ glyph.

### Info Bar (`InfoBar.vue`)
- Becomes a thin glass strip (E1, blur 14px) floating 8px inset from the top edge with 16px radius — not a full-width bar touching the edges.
- Trump glyph is 32px in trump color with a matching soft glow (8px blur, 30% opacity of trump color).
- Dealer score: the number is Space Grotesk 700, 24px, amber when ≥40, red-pulsing when ≥48.

### Bidding Panel (`BiddingPanel.vue`)
- Becomes a glass-E2 modal pinned above the hand (not floating at center — it was crowding the cards). Slides up with spring.
- Suit selector: 4 square glass tiles (60×52px), suit glyph at 28px. Selected tile gets a violet gradient fill + suit glyph in full color + 1px lime inner ring. **One suit always selected by default** (highest-held suit auto-picked) — removes the disabled-CTA dead state seen in current screen #04.
- Bid number: replace ‹ › chevrons with a proper **slider-style stepper** — a violet track with a lime dot handle, labels 10/11/12/13 (or 8-13 forced). Drag or tap number to jump.
- Ask Partner: violet glass pill with a small speech-bubble glyph. Once asked, morphs into a compact chip showing the received signal ("Partner: Major") with a violet/green dot.
- Bid history chips: tiny glass pills at the top edge of the panel with seat-name + outcome. Passes are dim, bids are violet.
- Confirm CTA: lime, full-width, morphs to `CONFIRM BID ♥10` with the chosen suit in its real color inline.

### Partner Reveal
- Not a modal — a **full-screen theatrical moment**. Dim the rest of the board to 40%, the partner's 13 cards fly up from the top with the cascade flip (see Motion), a glass-E2 strip sits bottom-center with: "YOU BID 10" label + stepper (10→13) + `START ▶` lime CTA.
- For non-bidders: the same cascade, but a subtle "Waiting for Praveen..." glass chip with an animated 3-dot replaces the stepper.

### Playing Phase / Trick Area (`TrickArea.vue` + `GameBoard.vue`)
- The faded trump glyph behind the trick becomes a **60% opacity, 200px, softly-pulsing** trump symbol (2s breathe loop, 95%→100% opacity). In trump color.
- Center trick cards sit on a subtle radial "table light" — a 200px radial gradient from `--accent-2-soft` to transparent. Makes the cards feel spotlit.
- Team score pills (0/10 and 0/4): become horizontal glass progress bars (one top-left, one top-right below the seat pill), filled in `--team-self`/`--team-foe`. Width animates as tricks are won.
- Dhaap chip: becomes a violet-to-red gradient pill that shakes on appearance.

### Player Hand (`PlayerHand.vue`)
- Cards arc slightly (1° per card from center, max ±6°) for a more natural fan. Currently they're dead flat.
- Zoomed card on hover/tap: the zoom lifts 32px (not 8px), scales 1.6, rotation straightens, and a violet drop-halo appears beneath. Feels like picking a card up.
- Playable affordance: lime drop-halo (described in §4). Unplayable: desaturate + darken.
- TRAM / Dhaap action buttons move to a floating glass toolbar at the **left edge** of the hand row (not crammed in-line). TRAM is violet-outlined glass; Dhaap is red-fill.

### Round Summary (`RoundSummary.vue`)
- Glass-E3 modal with a gradient header bar — lime gradient when your team won, red-to-violet when you lost. Title in Space Grotesk 700 at 28px with a 600ms scale-up entrance.
- Score delta becomes the centerpiece: `40 → 20` in giant 56px numerals with the count-up animation; the `-20` delta in lime (good for you) or red (bad for you) as a floating chip above.
- Team rows: each row is a compact glass pill with team member names and a progress bar (filled to tricks-won / total). The bar uses team color; if bid failed, the bar shows a thin red overlay "overflowed" past target.
- Dealer-change banner: amber glass strip with animated crown icon, slides in at +1.4s.
- `NEXT ROUND` is the lime CTA — not dark as in current screen #13. It's a decision point, it deserves the accent.
- Bid-13 rounds get a special variant: title "ALL OR NOTHING" in a violet-lime split-fill gradient, background particles effect (12 small violet dots drifting upward, 2s loop).

### Help Overlay (`HelpOverlay.vue`)
- Sheet slides from the right (not center modal) — glass-E3, 90% width. Header uses a lime accent underline under "How to Play Surri". Section dividers are thin violet lines. Inline rule math (`X += 2X`) gets its own glass-E0 code-like styling with Space Grotesk.

### Issue Report (`IssueReportOverlay.vue`)
- Glass-E3 dialog. Auto-captured screenshot gets a thin violet frame + a "captured just now" timestamp. Textarea has the lime-focus ring. Submit CTA is lime only once text is entered — otherwise neutral glass.

### Confirm Dialogs (Give Up)
- Small glass-E3 centered card, 280px wide max. Destructive actions get a red glass button with inner red glow; cancel is neutral glass. Icon sits left of the message body.

### TRAM Overlay (`TramOverlay.vue`)
- The board border gains the **rotating lime→violet gradient ring** (Motion §5) during TRAM mode — signals "special mode" instantly.
- Card ordering: each selected card gets a lime numbered circle at its top-right corner (1, 2, 3…). Long-press-drag to reorder with a haptic (`navigator.vibrate(8)` on supported devices).
- Claim CTA is lime with a ⚡ glyph and reads `CLAIM N TRICKS` where N is the remaining-needed count.

### Game Over Screen (`GameOverScreen.vue`)
- Full-screen celebration for winner — a confetti burst in team colors (use `canvas-confetti` — 4KB), wordmark treatment of the winner's name in lime Space Grotesk at 48px, loss counter grid below showing each player's total losses with small glass tiles.

---

## 7. ASCII Mockups — Hero Screens

Legend: `░` = gradient wash (aurora/accent), `▓` = glass panel with backdrop-blur, `█` = solid CTA (lime).

### Lobby

```
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  aurora top
│░░░░░░  [· ALPHA · feedback ]  ░░░░░░│  violet chip
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░  S U R R I   ░░░░░░░░░░░░░░░░░░░│  lime S + I, white URR
│░░░░░░░ multiplayer card game ░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │
│   ▓  Praveen                  ▓     │  glass input
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓    │
│                                      │
│   ████████████████████████████████   │
│   █       CREATE ROOM        ▶█     │  lime CTA
│   ████████████████████████████████   │
│                                      │
│              · · or · ·              │
│                                      │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓      │
│   ▓  room code      ▓   ▓  GO ▓      │  glass + glass
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ▓▓▓▓▓▓▓      │
│                                      │
│░░░░░░░░  (violet orb · blur)  ░░░░░░│  slow drifting orb
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```

### Bidding Panel (your turn)

```
┌──────────────────────────────────────┐
│ ▓ ♥ TRUMP   ·  SCORE 20  ·  👑 Bot1▓│  glass info strip
│                                      │
│            [ Bot 2 · 13 ]            │
│         ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒           │  face-down fan
│                                      │
│  [Bot1]        ░░░░        [Bot3]   │
│   ·13          ░░░░         ·13     │  trump glyph wash
│                                      │
│                                      │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │
│   ▓      · BIDDING ·          ▓     │  glass panel E2
│   ▓  [Bot2 pass][Bot3 pass]   ▓     │
│   ▓                            ▓     │
│   ▓  ╔══════════╗ ╔══════════╗▓     │
│   ▓  ║ ✿ Ask P. ║ ║  Pass    ║▓     │  violet / neutral
│   ▓  ╚══════════╝ ╚══════════╝▓     │
│   ▓      — OR BID —            ▓     │
│   ▓   ♠  ♥●  ♦  ♣              ▓     │  hearts selected
│   ▓  ●═══════●═══●═══●═══●     ▓     │  violet slider
│   ▓   8  9  10  11  12  13     ▓     │
│   ▓                            ▓     │
│   ▓  ████████████████████████ ▓     │
│   ▓  █  CONFIRM BID  ♥ 10 ▶█ ▓     │  lime CTA
│   ▓  ████████████████████████ ▓     │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │
│                                      │
│  [Praveen · you]            your trn│
│   🂠 🂠 🂠 🂠 🂠 🂠 🂠 🂠 🂠 🂠 🂠 🂠 🂠     │
└──────────────────────────────────────┘
```

### Playing / Trick Area (your turn, bidder leads ♥)

```
┌──────────────────────────────────────┐
│ ▓ ♥ TRUMP · 0/10 🔵 · 0/4 🔴 · 👑 ▓ │  glass info strip
│                                      │
│         ┌─────────────────┐         │
│         │ BOT 2'S HAND ·▓ │         │  glass label
│         │ 🂡 🂢 🂣 🂤 🂥 🂦  │         │
│         └─────────────────┘         │
│                                      │
│                                      │
│  [Bot1]      ░░░░░░░░░       [Bot3] │
│   13         ░░  ♥  ░░         13   │  pulsing trump glyph
│   ○○○○       ░░░░░░░░░         ○○○○ │
│                                      │
│                   🂱                  │  north card
│                                      │
│         🂡                 🂣         │  west / east
│                                      │
│                   🂢                  │  south (yours)
│                                      │
│                                      │
│  ╔══╗  [Praveen · you]    ✦ your ✦  │
│  ║▓▓║  ╔══╗                          │  TRAM / Dhaap toolbar
│  ║TR║  ║◆ ║                          │  violet / red
│  ║AM║  ║Dh║                          │
│  ╚══╝  ╚══╝                          │
│   🂮 🂭 🂬 🂫[🂩]🂨 🂧 🂦 🂥 🂤 🂣 🂢 🂡    │  lime halo on
│   ░░ ░░ ░░ ░░ ██ ░░ ░░ ░░ ░░ ░░...   │  playable only
└──────────────────────────────────────┘
```

### Round Summary — Lost

```
┌──────────────────────────────────────┐
│░ scrim (blur 8) ░░░░░░░░░░░░░░░░░░░░│
│                                      │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓     │
│   ▓ ░░░ red→violet gradient ░░░▓     │
│   ▓       · ROUND LOST ·      ▓     │  28px display
│   ▓                            ▓     │
│   ▓    Praveen bid  10 ♥       ▓     │
│   ▓                            ▓     │
│   ▓  Praveen + Bot 2           ▓     │
│   ▓  ▓▓▓░░░░░░░░░░░░░░  0/10  ▓     │  team-self bar
│   ▓  Bot 1 + Bot 3             ▓     │
│   ▓  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  13/4   ▓     │  team-foe bar (overflow)
│   ▓                            ▓     │
│   ▓        ✗  YOU LOST         ▓     │
│   ▓         bid failed          ▓     │
│   ▓                            ▓     │
│   ▓  ╔════════════════════════╗ ▓   │
│   ▓  ║    40   →   20        ║ ▓   │  Space Grotesk 56px
│   ▓  ║        -20            ║ ▓   │  lime chip (counts up)
│   ▓  ╚════════════════════════╝ ▓   │
│   ▓                            ▓     │
│   ▓ ▓▓▓ ⚠ DEALER CHANGE ▓▓▓▓▓ ▓     │  amber glass strip
│   ▓ ▓ Score went negative  ▓ ▓     │
│   ▓ ▓ New dealer: Bot 2 👑 ▓ ▓     │
│   ▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓     │
│   ▓                            ▓     │
│   ▓  ████████████████████████ ▓     │
│   ▓  █    NEXT ROUND  ▶   █   ▓     │  lime CTA
│   ▓  ████████████████████████ ▓     │
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓       │
│                                      │
└──────────────────────────────────────┘
```

---

## 8. Migration Effort

**Straight Tailwind class swaps** (1-2 days, one component at a time):
- Color-token replacement: every `bg-slate-*`, `text-slate-*`, `bg-green-*`, `bg-red-*` → new semantic tokens. Define palette in `src/style.css` via `@theme` (Tailwind v4's CSS-first theming) so all utility classes resolve to the new values without changing markup.
- Radius bumps: `rounded-lg` → `rounded-2xl` on panels; `rounded-2xl` → `rounded-3xl` on modals.
- Button rebuilds: new `.btn-primary`, `.btn-secondary`, `.btn-danger` utility classes — mostly class swaps in each component.
- Typography: add `@fontsource/space-grotesk` + `@fontsource/inter`, wire two CSS classes `.font-display` / `.font-ui`, swap existing weight/size utilities in templates.

**New component wiring** (3-5 days):
- `backdrop-filter: blur()` is native CSS — zero dependency, but needs an iOS/Android sanity pass (Capacitor WebView supports it on Android 10+ and iOS 9+; we're fine).
- Install `@vueuse/motion` for springs — ~10KB. Wrap card deal, trick play, score count-up, partner-reveal cascade. Each animation becomes a `<Motion :initial=… :animate=… :transition=…>` wrapper.
- Install `canvas-confetti` — 4KB — for Game Over screen celebration.
- Install `@fontsource/space-grotesk` + `@fontsource/inter` — ~60KB each woff2, subset if concerned.
- New card-back PNG (replace `card-back` CSS in `Card.vue`) — one asset.
- Aurora background: a single fixed `<div>` in `App.vue` with the CSS radial gradient + one CSS-animated violet orb (pure CSS `@keyframes`, no JS).
- TRAM rotating gradient ring: pure CSS — `conic-gradient` + `@keyframes rotate`. No lib.

**No backend changes required.** The server contract (`game.getStateFor(seat)`) already exposes everything the redesign needs — this is strictly presentation layer.

**Total estimated effort**: ~1 engineering week for a cohesive v1 cut, with follow-up passes per component.

---

_Commit to one direction. Ship the drama._
