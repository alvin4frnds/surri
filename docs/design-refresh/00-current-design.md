# Current Design — Baseline Dossier

A factual, descriptive snapshot of Surri's current UI. Sourced from the 15-screen
inventory in [screenshots.md](./screenshots.md), the layout spec in
[../Board.md](../Board.md), and the 16 Vue components under
`client/src/components/`. No recommendations; this is a reference for the
redesign team.

---

## 1. Design Language Summary

Surri reads as a **utilitarian dark-mode mobile card game**: a single fixed
390×844 frame centred on any viewport, painted in a muted navy/slate palette
with a single loud accent (emerald) reserved for progressing the game. The
tone is technical rather than playful — there is no illustration, no mascot,
no textured felt. The only "warmth" in the palette comes from the gold-edged
card-back gradient, the dealer's yellow crown, and bright red/orange warning
accents. Most surfaces are flat `slate-800` tiles with thin `slate-600`
borders and `rounded-xl`/`rounded-2xl` corners.

Density is medium-to-tight. The bidding and round-summary modals pack
multiple controls and data rows into ~320 px of width; the table itself is
overlaid with floating information (score pills, trick circles, chat
bubbles, trump watermark) rather than a persistent HUD bar. The mood is
**functional and mobile-first** — it reads like a tool more than a toy.
Legibility wins over ornament: body copy is system sans, titles are ALL-CAPS
with wide letter-spacing, and the card pips/images are standard PNG assets.

Recurring visual motifs: **pill buttons** (fully-rounded corners,
`rounded-lg` or `rounded-full`), **ghost chrome** in the corners
(semitransparent `slate-800/80` ghost buttons for quit/issue), **ALL-CAPS +
tracked titles** for section headers, **chat bubbles** (white, with a small
rotated-square tail) for AI talk, and a large **faded trump-suit glyph**
sitting behind the trick area as ambient context.

---

## 2. Color System

### Backgrounds / surfaces

| Role | Token / hex | Where |
|---|---|---|
| Outer "frame" (desktop letterbox) | `#1a1a1a` | `App.vue` outermost div |
| App background (solid) | `#0f1b2d` | `App.vue` inner frame, `body` base, `style.css` |
| Game-table radial gradient | `radial-gradient(ellipse at 50% 40%, #162d4a 0%, #0f1b2d 60%, #0a1220 100%)` | `GameBoard.vue` root |
| Card-back blue gradient | `linear-gradient(145deg, #1a3a5c, #0d2440)` | `Card.vue .card-back`, `PlayerArea.vue .card-back-mini`, `GameBoard.vue .deal-card` |
| Panel / tile base | `bg-slate-800` (≈`#1e293b`) | All modals, info tiles, seat pills |
| Inset / "darker" panel | `bg-slate-900` (≈`#0f172a`) | TRAM footer, bidding scrim top bar, drop slots |
| Secondary button fill | `bg-slate-700` (≈`#334155`) | Pass, Cancel, slot placeholders, bid ± buttons, NEXT ROUND |
| Hover elevation | `bg-slate-600` (≈`#475569`) | Hover on all slate-700 buttons |
| Modal scrim | `bg-black/60`, `/70`, `/80`, `/90` | Lobby sheet (60), Give-Up (70), Help/TRAM/Issue (80), ExplainLoss (90) |

### Borders / dividers

| Role | Token |
|---|---|
| Default border | `border-slate-600` (≈`#475569`) |
| Quieter border (bottom-of-modal, deep panels) | `border-slate-700` (≈`#334155`) |
| Focus border (text input) | `border-green-500` |
| Active seat ring | `ring-2 ring-yellow-400` |
| Card-back gold edge | `#c9a84c` outer, `#b8943f` inner |
| Winner card highlight | `border-yellow-500` + `ring-4 ring-yellow-400` |

### Text

| Role | Token |
|---|---|
| Primary body (on dark) | `text-slate-200` (App default), `text-slate-100` (headings) |
| Secondary / dim | `text-slate-300` (helper copy), `text-slate-400` (labels) |
| Muted placeholders / footnotes | `text-slate-500`, `text-slate-600` (the "Tap anywhere to dismiss" line) |
| Pure white emphasis | `text-white` (CTA labels, room-code digits, numeric stepper value) |

### Accent / primary (the emerald CTA)

Emerald is used **only for user-initiated positive CTAs** (create room, start
game, confirm bid, start play, claim TRAM, next round in GameOver, play
again). It never appears on information chrome.

| Token | Used for |
|---|---|
| `bg-green-600` (≈`#16a34a`) | All primary action buttons (resting) |
| `bg-green-500` (≈`#22c55e`) | Hover state of the same buttons |
| `text-green-400` / `text-green-300` | "(you)" tag, affirmative outcome text, positive score delta, "Major" support signal, bid history non-pass entries |
| `border-green-500`, `bg-green-500` (progress bar) | Filled drop-slots in TRAM, made-bid progress bar in RoundSummary |
| `bg-green-900/60` | RoundSummary "ROUND WON" header tint |
| Card-playable glow | `box-shadow: 0 0 8px rgba(74, 222, 128, 0.3); border-color: #4ade80;` (`Card.vue .card-playable`) |

### Informational blue (ask-partner / Full support / share)

| Token | Used for |
|---|---|
| `bg-blue-700` hover `bg-blue-600` | "Ask Partner" button, "Full" support option |
| `bg-blue-600` hover `bg-blue-500` | Share button (waiting room), Issue Submit, "Got it" toast button |
| `bg-blue-600` border `border-blue-400/30` | Your-team score badge (top-left during play) |
| `text-blue-400` | "Full" signal label text, GitHub link in toast |
| `text-blue-200` | Secondary text inside the blue score badge |

### Danger / destructive

| Token | Used for |
|---|---|
| `bg-red-600` hover `bg-red-500` | "Give Up" confirm, "Quit game" in leave-confirm, destructive side of two-button dialogs |
| `bg-red-900/60` | "Give Up" top-right ghost button base (with `hover:bg-red-800/80`) |
| `bg-red-900/30 border-red-700/50` | Dealer-seat PlayerArea tint |
| `bg-red-700` | Loss-count badge (`player.losses` pill) |
| `bg-red-800` hover `bg-red-700` | RoundSummary "Explain Loss" button |
| `text-red-400` | Error text, "✗ YOU LOST", red-suit glyphs, failed-bid numbers, "BEATS" label |
| `text-red-300`, `text-red-200` | Red ghost button labels, failed-round header copy, red score-badge sub-label |

### Team colors

- **Your team (blue):** `bg-blue-600` score badge, blue-filled trick dots
  (`bg-blue-400 border-blue-400`), `text-blue-500` TRAM partner-order slot
  border.
- **Opponent team (red):** `bg-red-600` score badge, red-filled trick dots
  (`bg-red-400 border-red-400`).
- **Defending-team progress bar:** `bg-orange-500` (RoundSummary, also
  `BidProgressBar`).
- **Dealer:** `bg-red-900/30` tint on the seat pill + yellow crown
  (`text-yellow-400 👑`) + amber "Score: N" text (`text-yellow-400`).

### Warning / amber

| Token | Used for |
|---|---|
| `bg-amber-700/90 text-amber-100` | Lobby alpha-stage banner |
| `bg-amber-700/80` hover `bg-amber-600`, border `border-amber-600/40`, text `text-amber-100` | "Dhaap!" button in GameBoard |
| `bg-amber-600 text-white` | "Dhaap!" chip floating over played cards in TrickArea |
| `hover:bg-amber-700` | Issue ghost button's hover tint |
| `text-yellow-400` | Dealer crown, "Your turn" caption, RoundSummary dealer-change header, ALL OR NOTHING, partner-hand-revealed banner, Winner title |
| `text-yellow-300` | Trump indicator in ExplainLoss header |
| `bg-yellow-700` hover `bg-yellow-600` | "Minor" support button |
| `ring-2 ring-yellow-400` | Active-seat ring on PlayerArea; `-translate-y-2` on selected Card |

### Trump watermark (ambient)

`text-white/[0.10]` for black suits, `text-red-400/[0.10]` for red —
intentionally barely-visible giant glyph (180-220 px) behind the trick area.

---

## 3. Typography

No custom webfont. `index.html` loads no font assets; `style.css` sets
`font-family: sans-serif` on `body`. Everything resolves to the platform's
system sans (Segoe UI / Roboto / system-ui depending on device).

### Usage

| Role | Classes | Notes |
|---|---|---|
| Wordmark ("SURRI") | `text-6xl font-bold tracking-[0.3em] text-slate-100` | 60 px, extreme letter-spacing |
| Wordmark subtitle | `text-slate-400 text-sm tracking-widest` | "MULTIPLAYER CARD GAME" |
| Room code (waiting room) | `text-3xl font-bold tracking-[0.3em] text-slate-100` | Matches wordmark spacing |
| Modal/section title | `font-bold text-white text-sm uppercase tracking-wider` | BiddingPanel header, round-summary header |
| Tiny section label | `text-xs text-slate-400 uppercase tracking-wider` or `tracking-widest` | "ROOM CODE", "Your Play Order", "Score Change", "Final Standings" |
| Body copy | `text-sm text-slate-300 leading-relaxed` | Help overlay content |
| Helper copy | `text-xs text-slate-400` | Under-label dim text |
| Score-badge number | `text-white font-black text-xl` | The `X` in `X / target` |
| Score-badge target | `text-sm` muted tint | The ` / target` |
| Score-change numerals | `text-2xl font-bold text-slate-100` | "40 → 20" line in RoundSummary |
| Bid stepper value | `text-2xl font-bold text-white` (bidding) / `text-xl font-bold text-white` (reveal) | "BID: 10" |
| Suit tile glyph | `text-2xl font-bold` with `text-red-400` / `text-white` | Bidding suit picker |
| Card suit in lists | Colored text `text-red-400` / `text-white` | TRAM slot display, `cardDisplay()` |
| Winner title | `text-2xl font-bold text-yellow-400 mb-2 tracking-wider` | GameOverScreen "WINNER" |
| Winner name | `text-3xl font-bold text-white` | Inside the yellow-ringed card |
| Trophy/emoji headers | `text-5xl`, `text-3xl` | `🏆`, warning `⚠`, check `✓` in toasts |

### Letter-spacing summary

- `tracking-[0.3em]` — wordmark + room code.
- `tracking-widest` — tiny uppercase labels, sub-title.
- `tracking-wider` — modal headers, "WINNER", body uppercase micro-labels.

Numbers are not tabular — no `font-variant-numeric`.

---

## 4. Spacing & Layout Primitives

### The mobile frame

`App.vue` enforces the whole app into a fixed mobile device frame:

```
outer : min-h-screen bg-[#1a1a1a] flex items-center justify-center
inner : w-full max-w-[390px] h-[100dvh] max-h-[844px] relative overflow-hidden bg-[#0f1b2d]
```

On wider viewports the result is a 390×844 window letterboxed against a
`#1a1a1a` surround. Inside that window, `GameBoard.vue` uses absolute
positioning almost exclusively.

### Game-board anchors

| Element | Position |
|---|---|
| Top-right chrome stack (Quit / Give Up / Issue) | `absolute top-2 right-2 z-[22]`, vertical flex, `gap-1.5` |
| Your-team score badge | `absolute top-3 left-3 z-[11]` |
| Opponent score badge | `absolute top-[55%] right-2 z-10` |
| North PlayerArea | `absolute top-2 left-1/2 -translate-x-1/2 z-10` |
| Partner hand fan (bid ≥10) | `absolute top-[11%] left-1/2 -translate-x-1/2 z-[12]` |
| West PlayerArea | `absolute left-2 top-[35%] -translate-y-1/2` |
| East PlayerArea | `absolute right-2 top-[35%] -translate-y-1/2` |
| Trick area | `absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-[30%]` (or `top-[38%]` when partner hand is showing) |
| South PlayerArea | `absolute left-1/2 -translate-x-1/2 bottom-[15%]` |
| TRAM / Dhaap column | `absolute bottom-[15%] left-3 z-20` |
| "Your turn" / "Play partner's card" label | `absolute bottom-[15%] right-3 z-20` |
| My hand | `absolute bottom-0 left-0 right-0 z-20` |
| Bidding panel | `absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-full max-w-[320px] px-3` |

### Z-index scale (as used in the codebase)

| z | Layer |
|---|---|
| 0 | Trump watermark |
| 10–12 | Player seats, score badges, partner hand |
| 18 | Bidding scrim |
| 20 | Bidding panel, my hand, action buttons |
| 22 | Top-right chrome |
| 25 | Dealing animation |
| 30 | Leave / Give-Up dialogs, RoundSummary scrim |
| 40 | TRAM overlay, ExplainLoss overlay, Help FAB |
| 50 | Help modal, Issue modal, Game Over |
| 100 | Disconnect + issue-submitted toasts (`fixed` outside game frame) |

### Padding / gap system

Tailwind defaults. Observed usage:

- **Modal bodies**: `p-4` or `p-5`, `space-y-3` / `space-y-4` vertically.
- **Panels**: header `px-4 py-2.5`, body `p-3` or `p-4`.
- **Buttons**: `px-2 py-1` (tiny ghost), `px-3 py-1.5` (action chip),
  `px-4 py-2` (secondary), `px-4 py-3` / `py-3` (primary full-width),
  `w-9 h-9` / `w-10 h-10` (round steppers).
- **Inputs**: `px-4 py-3`.
- **Suit tiles**: `w-14 h-12 rounded-xl`.
- **Bot-count tiles**: `w-14 h-14 rounded-xl`.
- **Trick drop-slots**: `w-14 h-20 rounded-lg`.

### Border radii

| Radius | Usage |
|---|---|
| `rounded-sm` | Card-back mini (opponent card stacks) |
| `rounded` / implicit `rounded-md` | None / rare |
| `rounded-lg` | Card face, most buttons, inputs, drop-slots, score tiles inset |
| `rounded-xl` | Seat pill, support-signal button, info tile in TRAM, inner insets of RoundSummary |
| `rounded-2xl` | Modals (bidding panel, help, issue, round summary, game-over card, dealer-score tile, waiting-room sheet top) |
| `rounded-full` / `rounded-t-2xl` | Chips, ± steppers; bot-sheet top corners |

### Shadows

Used sparingly:
- Bidding panel: inline `box-shadow: 0 0 40px rgba(0,0,0,0.5)`.
- Team score badges: `shadow-lg`.
- Help FAB and dialog toasts: `shadow-lg` / `shadow-2xl`.
- Chat bubbles (PlayerArea): `shadow-lg`.
- Card faces have no drop-shadow; card-back has a tiny `0 1px 3px rgba(0,0,0,0.4)`.
- Playable card: green glow `box-shadow: 0 0 8px rgba(74,222,128,0.3)`.

---

## 5. Component Inventory

### LobbyScreen — `client/src/components/LobbyScreen.vue`

Landing screen. Centred wordmark + subtitle, name input, emerald "CREATE
ROOM", an "OR" divider, and a row of code input + `slate-700` "GO" button.

- **Alpha banner**: absolutely positioned top strip `bg-amber-700/90
  text-amber-100 text-xs font-bold text-center py-2 px-4`.
- **Inputs**: `bg-slate-800 border border-slate-600 rounded-lg`, focus ring
  turns `border-green-500`; invalid code input turns `border-red-500`.
- **Disabled CTA**: `disabled:opacity-40 disabled:cursor-not-allowed` on the
  emerald button (no colour change, only alpha).
- **Bot-count bottom sheet**: `fixed inset-0 bg-black/60 flex items-end`,
  panel `bg-slate-800 border-t border-slate-600 rounded-t-2xl p-6 space-y-5`.
  Four `w-14 h-14 rounded-xl` tiles; selected one = `bg-green-600 text-white`,
  others `bg-slate-700 text-slate-300`.
- **Sheet transition**: 200 ms opacity fade (`.sheet-enter-active`).

### WaitingRoom — `client/src/components/WaitingRoom.vue`

Pre-game room. "← Leave" top-left, a large room-code tile with Copy/Share,
four seat rows, START GAME CTA.

- **Seat row**: `flex items-center gap-3 bg-slate-800 border border-slate-600
  rounded-lg px-4 py-3`; occupied seats show an emoji (`👤` human, `🤖`
  bot), name, and `(you)` in `text-green-400`.
- **Empty seat** copy: `text-slate-500 italic animate-pulse`.
- **Copy button**: `bg-slate-700` (secondary). **Share button**:
  `bg-blue-600` (informational — not emerald because it's not the primary
  flow completion).
- **START GAME**: emerald primary, disabled until `allSeatsReady()` (all
  seats bot-filled).

### BiddingPanel — `client/src/components/BiddingPanel.vue`

Central floating modal during `bidding` / `bidding_forced` / `partner_reveal`
phases. Outer: `bg-slate-800 border border-slate-600 rounded-2xl` with a
`slate-700` header bar showing `BIDDING` / `FORCED BID` / `PARTNER REVEAL`.

Variants:

1. **Someone else's turn** — shows "Bidding in progress…" and bid-history
   chips (`bg-slate-700 rounded-full px-3 py-1`, green-tinted text for bid,
   slate for pass). If partner asked *me* for support, adds a bordered
   section with 4 support buttons.
2. **Partner asked me only** — shows the support prompt alone (Full / Major
   / Minor / Pass), each colour-coded (blue / green / yellow / slate).
3. **My turn to bid** — header "Your turn to bid", bid-history chips, an
   `Ask Partner` (blue) + `Pass` (slate) pair, the support-received label,
   an "OR BID" divider, 4 suit tiles (`w-14 h-12 rounded-xl`, border-2,
   selected = `bg-slate-600 border-white`), a bid stepper (± buttons,
   `text-2xl` value "BID: 10"), and an emerald CONFIRM CTA.
4. **Partner reveal / bidder** — small label "You bid N — increase bid?",
   a smaller stepper, emerald "START ▶" CTA.
5. **Partner reveal / non-bidder** — only "Waiting for N to start…" text.

Notable states:
- Support button colors: `Full` = blue-700, `Major` = green-700, `Minor` =
  yellow-700, `Pass` = slate-700. (When partner asked *me* during my own
  bidding turn, the `Full` option is missing from the compact row.)
- Confirm disabled when no suit selected (`disabled:opacity-40`).
- Forced bid hides Ask Partner and swaps Pass label to "Must Bid" in a
  muted tone.

### PlayerHand — `client/src/components/PlayerHand.vue`

Renders the fanned card row. Used twice: south (my hand) and the revealed
partner hand on north.

- **Fan math**: cards sorted by suit (S, H, C, D) then rank (2→A). Each card
  absolutely positioned with horizontal spacing 22 px (default) or 14 px
  (compact); container height 136 px (118 on `innerHeight < 750`; 80 in
  compact).
- **Sizes**: default hand uses `lg` (`w-20 h-[116px]`); when only a subset
  is playable those cards upgrade to `xl` (`w-24 h-[139px]`) to draw
  attention. Compact mode uses `md` (`w-14 h-[81px]`).
- **Lift behaviour**: hovered / touched card lifts −24 px; when some cards
  are playable and others aren't, playable cards are pre-lifted −28 px
  and further lifted −36 px on hover.
- **Touch double-tap-to-play**: first tap selects + lifts; second tap plays.
- **Playable affordance**: handled in `Card.vue` via `.card-playable`
  (green glow + green border).
- **Read-only mode**: when I'm the bid-≥10 partner whose hand is revealed,
  my hand renders read-only with a yellow caption above: "Your hand is
  revealed to all players".

### Card — `client/src/components/Card.vue`

Image-based card face (`/cards/<rank>_of_<suit>.png`), five sizes:
- `sm` / `small` prop: `w-10 h-[58px]`
- `md` / default: `w-14 h-[81px]`
- `lg`: `w-20 h-[116px]`
- `xl`: `w-24 h-[139px]`

Hairline `border border-slate-600` on faces; playable adds
`border-color: #4ade80` + green glow. Selected adds `ring-2 ring-yellow-400
-translate-y-2`. Card back is the diagonal gold-on-navy weave:

```
linear-gradient(145deg, #1a3a5c, #0d2440) base
+ 2px #c9a84c outer border
+ inset 1px #b8943f inner border
+ two 45°/-45° repeating-linear-gradient stripes at 8% alpha gold
```

Face image is scaled `transform: scale(1.35); transform-origin: top left;`
(the `.card-zoom` class) — the image assets are visually cropped, with the
bottom-right index hidden behind the card edge.

### PlayerArea — `client/src/components/PlayerArea.vue`

Per-seat info pill. Contains (top-to-bottom): a stacked mini card-back
row (only for non-south with `cardCount > 0`, rendered horizontally for
north and vertically for west/east); chat bubble (floats at `-top-9`);
a `bg-slate-800 border-slate-600 rounded-xl` pill with name/emoji/(you),
optional dealer tint (`bg-red-900/30 border-red-700/50`), crown, `Score:
N` line (yellow), a row of trick-circles, and an optional loss badge.

- **Active-seat indicator**: `ring-2 ring-yellow-400` wrapping the pill.
- **Bot markers**: `🤖` for bot, `🤖📡` with tooltip for temp-bot
  (disconnected player filled by bot), `👤` for human.
- **Trick circles**: `w-2.5 h-2.5 rounded-full border`; filled
  `bg-blue-400`/`bg-red-400` by team, empty ones `bg-transparent
  border-slate-500`. Wrap at `max-w-[80px]`.
- **Loss badge**: `bg-red-700 text-white text-xs rounded-full px-1.5 py-0.5`.
- **Chat bubble**: pure white with a tiny 2×2 rotated-square tail, slate-900
  text, used for bot bid announcements and support signals.

### TrickArea — `client/src/components/TrickArea.vue`

Tight cluster of up to 4 cards, arranged North / West — East / South. Each
slot is 56×80 px (`h-20 w-14`); cards inside are default `md` Card
components (the Card's internal 1.35× zoom makes them read bigger than the
frame suggests). Each card slightly rotated:

```
north: -3°,  south: 2°
west:  -5° +4px x,  east: 4° −4px x
```

Transition: `cardDeal` 0.35 s ease-out — scale 0.5 + translateY 30 px → 1.

A small amber "Dhaap!" chip (`bg-amber-600 text-white text-[9px] font-bold
rounded-full px-1.5 py-0.5`) floats under the card when the seat declared
dhaap.

### TramOverlay — `client/src/components/TramOverlay.vue`

Full-frame `absolute inset-0 bg-black/80` overlay (z-40). Top bar has a
`slate-800` header with ✕, "TRAM CLAIM" title, and a spacer. Body
scrollable with:

- Info tile (`bg-slate-800 border-slate-600 rounded-xl p-4 text-sm
  text-slate-300`) explaining how many tricks are needed.
- One or two "Play Order" rows of drop-slots (`w-14 h-20 rounded-lg border-2`).
  Empty slot: dashed `border-slate-600 bg-slate-900` with `+N` placeholder.
  Filled: solid `border-green-500` (my cards) or `border-blue-500`
  (partner's). Tap a filled slot to clear it.
- "Your Hand" section: small cards in wrap layout, tap to toggle (selected
  cards go to 30% opacity).
- Optional "Partner's Hand" section (bid ≥10, I'm bidder) with the same
  behaviour.
- Fixed footer: `bg-slate-900 border-t border-slate-700` with an emerald
  `CLAIM TRAM ▶` button, disabled until enough slots filled.

### RoundSummary — `client/src/components/RoundSummary.vue`

Centered modal, `max-w-sm bg-slate-800 border-slate-600 rounded-2xl`. The
header bar is **outcome-tinted**:
- Won: `bg-green-900/60 text-green-200`, title "ROUND WON".
- Lost: `bg-red-900/60 text-red-200`, title "ROUND LOST".
- Bid 13: `bg-slate-700 text-slate-100`, title "⚡ BID OF 13".

Body sections (top-down):
1. **TRAM result** (if present): `bg-slate-700 rounded-xl p-3` tile with a
   green/red title (✓/✗), caller name, card list, optional fail reason and
   defeater hand, and a red "🔍 Explain Loss" button when invalid.
2. **Bid info line**: "NAME bid 10 ♥" — rank colored, suit coloured by
   `SUITS` mapping (just plain Unicode glyphs rendered in default white).
3. **Tricks**: two rows, each with team names left, `n/target` right (green
   when made, red when failed; defender always slate-200), plus a 2-px thin
   progress bar under each (`bg-slate-700` track, fill
   green/red for bidders, orange for defenders).
4. **Outcome headline**: `text-xl font-bold` `✓ YOU WON` (green) or `✗
   YOU LOST` (red), with "Bid was made / Bid failed" subtitle.
5. **Score Change tile**: inset `bg-slate-700 rounded-xl p-3 text-center`,
   displays `OLD → NEW` in `text-2xl font-bold`. The `NEW` value turns
   `text-red-400` when `>= 40`. Delta shown below: red if positive
   (points added to dealer = bad), green if negative.
6. **Dealer-change tile** (when applicable): yellow ⚠ header, reason text,
   loser name in red, "New dealer: NAME 👑".

Footer: slate `NEXT ROUND ▶` button, then a muted "Tap anywhere to dismiss"
hint (clicking the scrim also dismisses).

### ExplainLossOverlay — `client/src/components/ExplainLossOverlay.vue`

Full-frame (`bg-black/90 z-40`) step-through player for a failed TRAM. Top
bar `bg-slate-800` with "Explain Loss", step counter, and ✕. A caption
strip under the header turns red `bg-red-900/60` on the failure frame.

Three compass positions show each seat's remaining hand (cards sized `sm`
rendered in a wrap grid), with the trick/tram cards rendered mid-center
at `md` size. The defeating card is ringed `ring-2 ring-red-500` with a
"BEATS" label. Nav: two `bg-slate-700` prev/next buttons at bottom.
Keyboard arrows and Esc are wired.

### GameOverScreen — `client/src/components/GameOverScreen.vue`

Full-frame `bg-[#0f1b2d] z-50` winner screen. Large 🏆 emoji, "WINNER"
headline in `text-yellow-400`, a `bg-slate-800 border-yellow-500
rounded-2xl` card with the winner's name; if it's me, a `ring-4
ring-yellow-400` outer ring emphasises that. Below: "FINAL STANDINGS"
tracked label, seat-sorted list of players (each row a `bg-slate-800
rounded-xl`), then emerald "PLAY AGAIN" and slate "LEAVE ROOM" buttons.

### HelpOverlay — `client/src/components/HelpOverlay.vue`

Always-mounted FAB + modal. FAB: `fixed bottom-4 right-4 z-[40] w-10 h-10
rounded-full bg-slate-700/90` with a big "?" character. Opens a
`max-w-[360px] max-h-[80vh] overflow-y-auto` modal with dark scrim
(`bg-black/80`). Content is five text sections (Overview, Bidding, Bid
10+, Playing Tricks, Scoring, Winning, Special Moves) using `h3` slate-100
titles and `text-sm text-slate-300 leading-relaxed` `ul` lists.

### IssueReportOverlay — `client/src/components/IssueReportOverlay.vue`

`z-[50]` Teleport-to-body modal, `max-w-[360px]`. Header "Report Issue" +
✕. A small screenshot thumbnail (`h-20 rounded border-slate-600`) is
displayed if `toPng()` succeeded (`GameBoard.vue` captures it *before*
mounting the overlay so the scrim isn't in the shot). A 3-row textarea
(`bg-slate-700 border-slate-600 focus:border-blue-500 resize-none`).
Footer has a slate Cancel and a blue Submit — Submit is
`disabled:bg-slate-600 disabled:text-slate-400` until description is typed.
This is a **blue** primary, not emerald — a deliberate carve-out (see §7).

### InfoBar / BidProgressBar — currently unused in the render tree

`client/src/components/InfoBar.vue` and `client/src/components/BidProgressBar.vue`
exist but are not imported anywhere. The persistent info-bar role is
instead filled by the floating score pills inside `GameBoard.vue`.

### Inline dialogs inside GameBoard

- **Give Up confirm** (`bg-black/70 z-[30]`): slate card, two buttons
  (slate Cancel / red Give Up).
- **Leave confirm** when solo human (`bg-black/70 z-[30]`): slate card,
  slate "Stay" / red "Quit game".

### App-level overlays (`App.vue`)

- **Disconnect maintenance** (`fixed inset-0 z-[100] bg-black/80`): `⚠`,
  heading, spinner (CSS-rotating ring).
- **Issue-submitted toast** (`z-[100]`): ✓, "Issue Submitted!" heading,
  github link, blue "Got it" dismiss button. Auto-dismisses after 8 s.

---

## 6. Interaction Patterns / Micro-interactions

### Card-level
- **Hover / first-tap lift** on playable cards (−18 to −36 px translateY,
  see `fanStyle()` in `PlayerHand.vue`).
- **Enlarge playable** when a subset is playable: `xl` instead of `lg`
  size, pre-lifted.
- **Green glow** on playable cards (`card-playable` box-shadow).
- **Card-deal transition** in `TrickArea` — 350 ms scale-and-rise from
  below.
- **Double-tap-to-play** on touch devices (first tap select, second play).

### Board-level
- **Dealing animation** (`GameBoard.vue`): 8 miniature card backs radiate
  outward with staggered 80 ms delays, rotating 360°, scaling down,
  fading out. Runs 1.2 s whenever the phase transitions into `bidding` /
  `bidding_forced` from outside of those phases. The word "Dealing..." sits
  behind them.
- **Trump watermark**: 180-220 px suit glyph at 10% alpha behind the trick
  area — ambient, not interactive.
- **Active-seat ring**: yellow ring-2 on the currently-acting seat.
- **Chat bubbles**: appear above opponent seats when they bid/pass/respond.
  Bounce-in via `bubbleIn` keyframes (300 ms), fade-out `bubbleOut`
  (500 ms). Persist until signal clears.
- **Trick-won dots**: empty-to-filled circles under each seat; one per
  required trick, filled by team colour.
- **"Your turn" / "Play partner's card"** yellow caption pinned bottom-right
  when acting.

### Modal conventions
- **Bottom-sheet** for bot-count picker (lobby): slides from bottom, tap-
  outside dismisses.
- **Centered dialogs** for everything else (bidding panel, round summary,
  TRAM, help, issue, leave/give-up confirms, game over).
- **Full-frame takeovers** for TRAM, ExplainLoss, GameOver — they cover the
  game board entirely rather than floating over it.
- **Outside-tap dismiss** on RoundSummary, Help, Issue, bot-sheet scrim.
  TRAM and ExplainLoss have explicit ✕ only.

### Button patterns
- Primary CTA: `bg-green-600 hover:bg-green-500 disabled:opacity-40
  disabled:cursor-not-allowed text-white font-bold rounded-lg px-4 py-3`.
- Secondary: `bg-slate-700 hover:bg-slate-600 text-slate-200 ... rounded-lg
  py-2`.
- Ghost chrome: `bg-slate-800/80 hover:bg-<semantic>-700 text-slate-400
  hover:text-white text-xs rounded-lg px-2 py-1`.
- Round stepper: `w-9 h-9` or `w-10 h-10` `rounded-full bg-slate-700` with
  a big `‹` / `›` chevron character.
- Disabled style universally is `opacity-40` (no separate colour) plus
  `cursor-not-allowed`.

### Transitions

- `toast-fade` (App.vue) — 300 ms opacity + translate.
- `sheet` (LobbyScreen) — 200 ms opacity.
- `bubble` (PlayerArea) — 300 ms in / 500 ms out via keyframes.
- `card-deal` (TrickArea) — 350 ms scale/translate.
- `deal-fade` + `dealFly` (GameBoard) — 200/400 ms fades, 0.8 s radial fly.
- `help-fade`, `issue-fade` — 200 ms opacity.
- `* { touch-action: manipulation; }` in `style.css` disables double-tap
  zoom gestures.

---

## 7. Design Choices and Their Apparent Rationale

1. **Fixed 390×844 frame on all viewports** (`App.vue` inner div
   `max-w-[390px] h-[100dvh] max-h-[844px] overflow-hidden`). Makes the
   layout identical on desktop, tablet, Android, and iPhone — absolute
   positioning math can assume a single device footprint, and Capacitor/web
   deploys share one layout.
2. **Emerald = forward-motion CTA only.** Create Room, Start Game, Confirm
   Bid, Start Play, Claim TRAM, Next Round, Play Again — all emerald. Every
   informational or navigational action uses slate or blue. Destructive
   uses red. The Issue Report Submit is deliberately blue (it's a
   contextual, not flow-forward, action). The result is that a new player
   can locate "what to do next" by colour alone.
3. **Dark radial table, not green felt.** Instead of mimicking a physical
   card table, the board uses a cool navy radial vignette — reads as
   "digital product" rather than "virtual card game", matching the rest of
   the UI.
4. **Ambient trump glyph instead of a HUD bar.** The unused `InfoBar.vue`
   component points to an earlier design that surfaced trump and dealer
   score in a top strip. The current design moved those into
   (a) the large faded watermark behind the trick area and (b) the dealer's
   yellow `Score: N` text on their seat pill — freeing the top chrome for
   ghost buttons (Quit / Give Up / Issue).
5. **Two independent score badges instead of one scoreboard.** Your team
   (blue, top-left) vs opponents (red, mid-right) — placed asymmetrically
   so they read as *team context*, not as an objective scoreboard. They
   only appear once a bid exists.
6. **Ghost chrome stack top-right.** Quit / Give Up / Issue are all small,
   low-contrast `bg-slate-800/80` buttons so they stay out of the primary
   interaction zone and only recede until the user looks for them. Give Up
   (red-tinted) and Issue (amber on hover) are visually heavier than Quit
   (pure slate) — roughly proportional to how destructive / unusual they
   are.
7. **Partner hand on top, my hand on bottom, fan-matched.** During bid-≥10
   play the partner's hand uses the `compact` `PlayerHand` variant (tighter
   spacing, `md` card size) so it reads as a **secondary** source while my
   own remains the primary focus at the bottom.
8. **Trick area is small and cluster-tight.** The TrickArea cluster is
   only ~240 px tall, leaving vertical room for hand + player pills. The
   tiny per-card rotation gives a "dealt on a table" feel without demanding
   the space a real diamond layout would.
9. **Dealing animation pre-bidding signals "new round".** Rather than a
   skeleton or loading state, a quick 1.2 s radial card-fly plays when
   transitioning into bidding from any other phase — reinforces the pacing
   of hand-dealt play.
10. **"Explain Loss" as a post-hoc learning tool.** A dedicated step-
    through overlay is only surfaced after a failed TRAM — the rest of the
    app is minimal, but this particular moment gets a full interactive
    replay because TRAM failure is a rules-heavy outcome players tend to
    dispute.
11. **Suit-colour uniformity.** Red suits always render `text-red-400`;
    black suits `text-white`. Applies in bid picker, TRAM slots, trick
    display, round summary — consistent pairing.
12. **Letter-spacing used as ornament.** The only visual "brand"
    expression is `tracking-[0.3em]` on SURRI + room code + the various
    `tracking-wider`/`widest` ALL-CAPS labels. No decorative type at all —
    the wide tracking *is* the logo.
13. **No assets besides card PNGs.** No SVG icons (emoji used for 🤖 👤
    👑 🏆 ⚠ 📡 ⚡ ✓ ✗ 🔍 🎉), no logo file, no illustrations. This keeps the
    bundle tiny and Capacitor-friendly.

---

## 8. Rough Edges / Factual Observations

- **Card-image 1.35× scale-crop (`Card.vue .card-zoom`).** The card PNGs
  are visually zoomed from the top-left, clipping the bottom-right index.
  It reads intentional at a glance, but the crop is load-bearing for
  legibility — without it the PNGs render small.
- **Card indices are trimmed** to fit the frames. On compact / small
  cards, only the top-left rank+suit remains readable.
- **Disabled CTA contrast is low.** Primary buttons' disabled state is
  `opacity-40` over emerald — on the dark background this leaves the
  button clearly visible but colour-muted rather than clearly "off", so
  it can look tappable on shorter screens.
- **Score change direction is counterintuitive.** In RoundSummary, a losing
  round for your team shows the score moving *up* (bad), but the delta
  line shows `+20` in **red** (correct — score up is bad for you as
  dealer). Conversely `-20` shows in **green**. When the dealer *wins*,
  `40 → 20` with green `-20` can momentarily read as "you lost 20 points"
  because the arrow points left/down — the direction and colour are
  correct but require domain knowledge to parse.
- **`newScore >= 40` is the red-threshold**, not 52. So a dealer score of
  41 already reads as red in RoundSummary (`text-red-400`) even though the
  game-losing line is at 52.
- **Opponent score pill at `top-[55%] right-2`** sits between the east
  seat (which is at `top-[35%]`) and the hand. It can feel pinned to the
  east player's *body* rather than belonging to the overall table.
- **Bidding modal overlaps the trick area** during play transitions — the
  `top-[50%]` anchor plus `-translate-y-1/2` is the same vertical as the
  centre trick; a `top-[55%]` override is applied only when partner hand
  is showing.
- **InfoBar + BidProgressBar dead code.** Two components exist in
  `client/src/components/` but no import references them — they represent
  an older layout direction that no longer ships.
- **Support signal button set is inconsistent across contexts.** On an
  `isSupportResponseOnly` panel (partner asked during my turn), only
  Major/Minor/Pass render — Full is omitted. On the general support
  response, all four (Full/Major/Minor/Pass) render.
- **"Tap anywhere to dismiss" hint on RoundSummary** coexists with a
  dedicated `NEXT ROUND ▶` button; the instruction is strictly true
  (scrim click → `emit('continue')`) but some users will read it and then
  scan for the button regardless.
- **GameOver uses `absolute inset-0` inside the 390×844 frame**, with
  `overflow-y-auto`. On very short screens, the winner card + standings +
  two CTAs can overflow and require scrolling even within the mobile
  frame.
- **No persistent HUD** for phase / round number / cumulative losses
  during play — that information lives on each player's seat pill (losses
  badge, dealer crown, score text) and nowhere else.
- **Ghost-chrome buttons stack vertically top-right** and grow/shrink
  depending on phase: Quit + Issue always, Give Up only during
  `isPlaying`. When Give Up appears, the Issue button jumps one row down.
- **Help FAB** (`position: fixed`) is anchored to the viewport, not the
  in-app 390×844 frame; on a desktop viewport the `?` floats in the
  bottom-right of the window rather than hugging the app column.
- **Disconnect overlay and issue-submitted toast** both use `position:
  fixed` at `z-[100]` and render outside the game frame — they're
  viewport-anchored while everything else is frame-anchored. They use
  `transform: translate(-50%, 10px)` in their leave-state, which is
  relative to a non-centred container (App has no translate origin set),
  so the exit slide is a very short offset rather than a dramatic
  departure.
- **`style.css` is 4 lines.** Virtually all styling lives in component
  `<script>`-derived class bindings. No design tokens, no theme layer,
  no `@apply` rules — refactoring the palette means touching every
  component.
- **Tailwind config is empty.** `client/tailwind.config.js` has
  `theme: { extend: {} }` and no plugins — the project is using stock
  Tailwind v4 defaults only.

---

*End of dossier.*
