# Surri — Salon Redesign Proposal

**Direction name:** *Salon* — a warm, lamp-lit, character-forward card room. Think private library, members' club in the old sense — confident hospitality, not velvet ropes.

---

## 1. Direction statement

Salon optimises for **warmth, character, and hospitality** at a family game night. Paper is austere and typographic; Late-Night is theatrical and saturated; Salon is the host of the evening — a cream-coloured room lit by a single lamp, a classical serif on the wordmark and the numbers that matter, and one warm brass accent for the pleasant act of forward motion. We willingly give up dark-mode drama and the cool-glass premium feel of Late-Night, and we give up Paper's monastic single-hue discipline. What we gain: a board that feels *inhabited* — this is a game you'd play on a rainy evening with friends, not a tournament app and not a meditation.

Salon is **light-first, not dark-first** (a deliberate reversal of both other directions). It is opaque and grounded (no glass, no aurora), it uses two serif-and-sans families with conviction, and it treats every numeric moment — room code, bid, score delta — as typography-as-ornament. No wood planks, no felt, no chip iconography, no leather stitching. The "club" here is made entirely of paper, ink, brass, bottle-glass, and burgundy — the vocabulary of a good library, not a casino.

---

## 2. Color system

A warm, opaque, library-lit palette. All tokens are real hex values — no gradients, no translucent glass.

### Surfaces

| Token | Hex | Role |
|---|---|---|
| `--salon-cream` | `#F4EBDA` | Base canvas. Warm off-white — the "paper" of the whole app. Replaces `#0f1b2d`. |
| `--salon-paper` | `#FBF4E6` | Raised surface tier 1. Player pills, info chips, bidding panel body, modal bodies. Very subtly lighter than the base. |
| `--salon-vellum` | `#ECDFC5` | Raised surface tier 2. Inset wells — the score-delta box, the TRAM info tile, the room-code plinth. Slightly deeper cream. |
| `--salon-lamp` | `#F7E9C6` | Soft amber wash used once — the dealing-animation halo and the ambient glow behind the trick area (see §4). |

### Ink

| Token | Hex | Role |
|---|---|---|
| `--salon-ink` | `#2B2118` | Primary text — deep warm near-black. Never `#000`. Reads as "good coffee", not black ink. |
| `--salon-ink-soft` | `#5A4B3A` | Secondary text, labels, helper copy. Warm sepia-gray. |
| `--salon-ink-mute` | `#8C7B66` | Tertiary, footnote, disabled, "tap anywhere to dismiss". |
| `--salon-rule` | `#C7B590` | Hairlines, dividers, inactive card borders — a warm taupe that reads as "pencil line", not "gray bar". |

### Accents

| Token | Hex | Role |
|---|---|---|
| `--salon-brass` | `#A8813A` | **Primary accent. Antique brass.** Every forward-motion CTA border, the selected/active state, the dealer dot, the trump-chip text, the wordmark flourish. |
| `--salon-brass-deep` | `#7A5C23` | Brass-on-press (darker), also the *filled* CTA variant for the single hero action on each screen. |
| `--salon-bottle` | `#30563F` | **Secondary accent. Bottle green.** Support-signal positives (Full / Major), "bid made" row in RoundSummary, "(you)" tag, playable-card underline. Dignified, not emerald. |
| `--salon-burgundy` | `#7A2230` | **Danger. Deep burgundy — not scarlet.** Give Up, Round Lost header, TRAM-failed, score ≥40 warning, dealer-score alarm. Reads as "serious", not "panic". |

### Team identity

We de-emphasize team-as-color-war (Salon is a *social* aesthetic, not a rivalry one). Team context is carried by **name + seat position**, not hue. Two quiet tokens handle the minimum required differentiation:

| Token | Hex | Role |
|---|---|---|
| `--salon-us` | `#30563F` | Your-team score chip and your-team trick dots. Reuses bottle green. |
| `--salon-them` | `#7A2230` | Opponent score chip and their trick dots. Reuses burgundy. |

That's it. Two team tokens, intentionally doubling as semantic (green = progress/good, red = opposition) — no blue-vs-red scorekeeping war.

### Dealer & trump

| Token | Hex | Role |
|---|---|---|
| `--salon-brass` (reused) | `#A8813A` | Dealer dot (prefix before the dealer's name) and the **trump suit chip** label color. Trump is "the house rule this round" — a brass marker, not a watermark. |
| Red suits glyphs | `#9C2A2E` | ♥ ♦ rendered in a muted heritage red (not the current vivid `text-red-400`). Harmonises with burgundy. |
| Black suits glyphs | `#2B2118` | ♠ ♣ rendered in `--salon-ink`. |

**Trump indicator treatment:** Kill the current giant watermark. Trump is a small brass-bordered chip top-left reading `♥ TRUMP` in brass. A *single* `--salon-lamp` radial wash (18% opacity, 240px, behind the trick area) replaces the glyph watermark — it's ambient *lamplight*, not an ambient *glyph*.

---

## 3. Typography

Two families, each committed to a specific job. Loaded from Google Fonts (`<link rel="preconnect">` + one `<link>` in `index.html`).

- **Cormorant Garamond** — old-style serif, a warm and slightly eccentric Garamond revival. Used for the wordmark, all display numerics (room code, bid number, score, score delta), and the outcome headlines ("Round Won"). Cormorant's oldstyle numerals have real character — the `7` and `4` particularly — and that character *is* the brand.
- **Inter** — UI and body. Inter handles every interactive label, helper, chip, seat name, and informational line. Paired weight 400/500/600.

### Hierarchy

| Role | Family | Size | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Wordmark `Surri` | Cormorant Garamond | 64px | 500 | `-0.01em` | **Mixed case**, not all-caps. The single most important decision — `Surri` (capital S, lowercase urri) in Cormorant is instantly different from Paper's tracked caps and Late-Night's Space Grotesk. Ends with a small brass `·` after the final `i`. |
| Wordmark tagline | Inter | 11px | 500 | `0.22em` uppercase | "A PARLOUR CARD GAME" (we're changing the existing subtitle — see §6 Lobby for the subtle copy shift). |
| Room code (WaitingRoom hero) | Cormorant Garamond | 88px | 500 | `0.18em` | Oldstyle numerals explicitly on (`font-feature-settings: 'onum' 1`). This is THE hero typographic moment of the whole product. |
| Bid number ("BID 10") | Cormorant Garamond | 56px | 500 | 0 | Second hero moment. Oldstyle figures. The 10 in Cormorant reads as *literature*, not *scoreboard*. |
| Score delta (`40 → 20`) | Cormorant Garamond | 48px | 500 | 0 | Same oldstyle treatment. |
| Outcome headline ("Round Won", "Winner") | Cormorant Garamond | 32px | 500 italic | 0 | Italic. A small swash-y moment. |
| Section tag (PARTNER REVEAL, BIDDING) | Inter | 11px | 600 uppercase | `0.22em` | The only all-caps tracked labels in the design. |
| H1 / screen title | Inter | 18px | 600 | 0 | "How to Play Surri", "Report Issue". |
| Primary body / prompt | Inter | 15px | 500 | 0 | "Your turn to bid", bid-history line. |
| Seat name | Inter | 14px | 500 | 0 | Player pills. |
| Helper / chip / label | Inter | 12px | 500 | 0 | Bid chips, trick-count labels. |
| Footnote | Inter | 11px | 400 | 0 | "Tap anywhere to dismiss". |

**Numeric rule:** Any display numeric (room code, bid, score, score delta) uses Cormorant with `font-feature-settings: 'onum' 1, 'lnum' 0`. Any numeric *inside a running sentence or chip* uses Inter tabular figures (`'tnum' 1`) — so score tallies like `0 / 10` stay monospaced-legible.

**No letter-spacing theatrics.** Paper uses tracked caps as ornament; Salon uses serif character as ornament. Labels get `0.22em` tracking; nothing else.

---

## 4. Surface treatment

Salon is **opaque, matte, and slightly textured** — the opposite of Late-Night's glass and Paper's flat digital plane.

- **Paper grain.** A single reusable class `.salon-grain` applies an SVG-noise `background-image` at 4% opacity over the cream canvas. Subtle enough to read as "paper texture" on OLED phones, invisible enough not to distract. Applied to `App.vue` outer frame only — not per-component, to keep paint cost near zero.
- **Borders: hairline only, warm taupe.** 1px `--salon-rule` on every panel, input, player pill, card wrapper. Replaces every `border-slate-600`. The active/selected state promotes the single side (usually bottom) to 2px `--salon-brass` — a small "underline" motion that reads like a nib stroke.
- **Double-rule for hero tiles.** The room-code plinth (WaitingRoom) and the bid-number plinth (BiddingPanel) use a **double-rule frame**: 1px `--salon-rule`, 3px gap, 1px `--salon-rule`. This is the one decorative motif Salon gets — a nod to old book covers and certificate borders, deployed in exactly two places. Implemented via `outline` + `border` on the same element, no extra DOM.
- **Corner radii: two tokens.** `10px` for buttons/inputs/chips (slightly softer than Paper's 8px, much less than Late-Night's pill-heavy 16px). `18px` for modals and sheets. Cards stay at the image's intrinsic 4px. No fully-rounded pills anywhere except the player-pill avatar dots.
- **Shadows: one, warm, long.** A single elevation shadow `0 12px 28px -10px rgba(122, 92, 35, 0.22)` — a long warm-brass shadow, *not* a neutral gray. Applied to modals (BiddingPanel, RoundSummary, GameOver card) and to the bottom-sheet. Nothing else gets a shadow. No inner highlights, no glow rings, no neon halos.
- **Dividers:** the classic "rule". A reusable `.salon-rule` horizontal divider — 1px `--salon-rule` flanked by a 6px gutter top and bottom. Used inside BiddingPanel to separate `Ask partner / Pass` from `OR BID`, inside RoundSummary between sections, inside Help between chapters. The rule is Salon's workhorse — don't use `border-t` on everything, use `.salon-rule` so the vertical rhythm is consistent.
- **No backdrop-blur, no translucency.** This is a firm anti-pattern. Scrims behind modals are `rgba(43, 33, 24, 0.55)` — warm ink dimming the cream base, never `black/80`.

---

## 5. Motion & feel

Salon's warmth comes from **typography and surface**, not kinetics. Keep motion understated, classical, brief.

- **Modals:** 180ms opacity fade + 8px translateY from below. Ease-out cubic-bezier(0.22, 1, 0.36, 1). No spring. No scale-up.
- **Bottom sheet (bot-count):** 220ms translate from below. Same ease. Scrim fades in parallel.
- **Card-zoom on hand hover/tap:** keep the existing 24px lift, but change the timing to 140ms ease-out — slightly slower than current, reads as "picking up a card" rather than "UI reacting".
- **Card deal into trick:** 300ms translate+scale. Remove the rotation flourish; Salon cards settle flat on the table, not tossed.
- **Round-start dealing animation:** keep the 8-card radial fly, but recolor the mini card-backs to a cream-and-brass variant (see §6 Card). Duration unchanged (1.2s).
- **Score count-up:** a quiet tween — `40 → 20` tweens digit-by-digit over 700ms ease-out. No glow, no scale.
- **Active-seat indicator:** no ring, no pulse. Seat name turns `--salon-brass` weight 600 with a 2px brass underline. Underline grows from 0→100% width in 160ms when the turn changes. That's the entire animation.
- **Bidding state changes** (ask-partner → received, suit picked, confirm enabled): cross-fade the affected chip's content in 160ms. No layout shift, no bounce.
- **Explicitly not doing:** no confetti, no card flips on partner reveal (the cards appear with a 180ms fade, no rotation), no cinematic deal, no scale-up on outcome titles, no shaking, no haptics. Salon is a well-mannered app.
- **Respects `prefers-reduced-motion`:** all transitions fall back to instant state change with a 120ms opacity fade.

---

## 6. Per-screen component notes

Assume absolute component paths under `client/src/components/`.

### LobbyScreen — `LobbyScreen.vue`
- Light touch: flip the background to `--salon-cream`, the wordmark to Cormorant `Surri` (mixed case, 64px, brass `·` after the final i), tagline to "A PARLOUR CARD GAME" in Inter 11px/0.22em.
- Alpha banner becomes a small pill centred under the tagline: 1px brass border, `--salon-paper` fill, ink-soft copy "Alpha — feedback via the Report button." No amber, no full-width strip.
- Inputs: 1px `--salon-rule` border, `--salon-paper` fill, 10px radius, focus promotes border to `--salon-brass`. No pill shapes.
- **CREATE ROOM** button: filled `--salon-brass-deep`, cream text, 10px radius, one warm shadow, no gradient. The one bold move on the screen.
- **GO** button: outlined — 1px brass border, paper fill, brass text. Correct hierarchy.

### Bot-count bottom sheet
- Sheet body `--salon-paper`, top corners 18px radius, 1px `--salon-rule` top border only, warm shadow.
- Label "Bots to fill seats" in Inter 13px/500/ink-soft.
- Four tiles `w-14 h-14` become squares (10px radius) with 1px rule border. Selected tile = 2px brass border + brass `--salon-brass` numeric inside. Unselected = ink-soft numeric.
- **START ROOM** = filled brass-deep CTA.

### WaitingRoom — `WaitingRoom.vue`
- **Hero moment.** Kill the existing compact room-code tile. Replace with a large `--salon-vellum` plinth, 18px radius, double-rule frame (see §4). Room code rendered in Cormorant 88px/500/`0.18em`/oldstyle figures, centered, ink color.
- Copy / Share become two inline text buttons with underlines: "Copy" (ink-soft) and "Share" (brass). No filled buttons.
- Seat rows: each is a `--salon-paper` row, 10px radius, 1px rule border, 52px tall. Prefix `·` in brass for your row. Bots get the name in ink-soft. "(you)" tag in bottle-green Inter 11px/500.
- **START GAME** = filled brass-deep CTA, full width.

### BiddingPanel — `BiddingPanel.vue`
- Panel: `--salon-paper` body, 18px radius, 1px `--salon-rule` border, warm shadow. Remains centered (do not move to bottom drawer — Salon keeps the existing vertical layout; only Paper moved it).
- Remove the filled `slate-700` header strip. Replace with a sectioned header: small brass `· BIDDING ·` section-tag in Inter 11px/0.22em, brass color, above a `.salon-rule` divider.
- Bid-history chips: `--salon-vellum` fill, 1px rule border, 10px radius, Inter 12px. Pass chips in ink-soft, bid chips in bottle-green (bid made) / ink (neutral).
- Support-signal response buttons (Full / Major / Minor / Pass): four pill-shaped 10px-radius buttons on one row. Full = bottle-green filled; Major = bottle-green outlined; Minor = brass outlined; Pass = paper with rule border. Recolored from the current blue/green/yellow/slate palette, keeps the hierarchy.
- Suit picker: four squares `w-14 h-12`, 10px radius, 1px rule border. Selected suit = 2px brass bottom border + brass-deep text color. Red suits `#9C2A2E`, black suits ink.
- **Bid stepper = hero typography.** `‹` and `›` become small ink chevron glyphs (weight 400, 24px) either side of the number. Number is Cormorant 56px/500/oldstyle. No circular buttons, no well. The number is the centerpiece.
- **CONFIRM BID ♥10** = filled brass-deep CTA. Suit glyph rendered in suit color inline.

### Partner reveal (BiddingPanel variant)
- Same panel chrome. Heading italic Cormorant "Partner revealed" 22px. Stepper identical. **START ▶** filled brass-deep.
- Waiting-as-non-bidder: italic Cormorant "Waiting for Praveen…" 18px, ink-soft. A quiet line, not a chip.

### Playing / Trick Area — `TrickArea.vue`, `GameBoard.vue`
- Board background: `--salon-cream`. No radial navy gradient. Add a single 240px radial `--salon-lamp` wash behind the trick area at 22% opacity — this is the lamplight, centered slightly above the trick cluster.
- Trump indicator: kill the huge faded watermark entirely. Replace with a small brass-bordered chip top-left reading `♥ TRUMP`, suit glyph in heritage-red/ink, label in brass Inter 11px/0.22em.
- Team score pills consolidate onto one row next to the trump chip: `Us 0/10 · Them 0/4` — bottle-green and burgundy tabular digits, no badge fills, no shadows. One info strip.
- Trick-won dots: keep the pattern, recolor. Filled `--salon-us` / `--salon-them`; empty = 1px rule-bordered transparent circle.
- "Your turn" / "Play partner's card" label: moves off the right float and onto the south seat itself — your seat name becomes brass + 2px brass underline. A small italic Cormorant caption "your turn" appears inline after the name at 14px.
- TRAM button: outlined brass, paper fill, brass text. Dhaap! button: outlined burgundy, paper fill, burgundy text. Both at 10px radius. No filled pills, no amber.

### PlayerHand — `PlayerHand.vue`
- Keep the fan math. Swap the playable-card affordance: the green glow goes. Playable cards get a 2px `--salon-bottle` bottom border (a "bottle-green nib underline") and a subtle `filter: brightness(1.04)` to nudge them forward.
- Unplayable: `opacity: 0.62`, no blur.
- Selected: replace the yellow ring with a 2px brass outline and the existing -translate-y-2 lift.
- Partner-revealed caption ("Your hand is revealed to all players"): italic Cormorant Garamond 14px in ink-soft, above the north fan. No yellow color.

### Card — `Card.vue`
- Face border: 1px `--salon-rule` hairline (replaces `border-slate-600`). Playable: 2px bottle-green bottom border only (not full border). Selected: 2px brass outline.
- **Card back redraw.** The current navy-and-gold weave clashes with cream. New card back: `--salon-paper` base, 1px `--salon-brass` outer border, 1px `--salon-rule` inset 3px in, a small central brass monogram `S` in Cormorant italic 28px, and two brass 45° hairlines at 12% opacity forming an understated crosshatch. Warm, classical, not kitsch. Keep it as CSS — no new image asset.
- Mini card-backs (opponent hands on east/west/north): same treatment, sm size.

### PlayerArea — `PlayerArea.vue`
- Pill: `--salon-paper` fill, 1px rule border, 10px radius. Dealer variant: 2px burgundy left border only (not a full red tint). No crown emoji — dealer gets a brass `·` dot prefix before the name.
- Active seat: no yellow ring. Name turns brass with a 2px brass underline (see Motion §5).
- Score line (dealer only): "Score 20" in Inter 12px/500, ink-soft. Turns burgundy at ≥40, bold burgundy at ≥48. No separate yellow coloring.
- Loss badge: 1px burgundy border, paper fill, burgundy superscript number after the name (`Bot 1²`). No red filled pill.
- Chat bubbles (bot announcements): `--salon-vellum` fill, 1px rule border, ink text, small brass tail. Cormorant italic 13px for the content. Bot chatter suddenly reads like table talk, not a notification.

### TramOverlay — `TramOverlay.vue`
- Scrim: warm-ink `rgba(43, 33, 24, 0.55)` (not black). Panel: `--salon-paper`, 18px top radius.
- Info tile: `--salon-vellum` fill, 10px radius, 1px rule, ink-soft body copy. No dashed borders on slots.
- Drop slots: 10px radius, 1px rule border (no dash). Filled slot: 2px brass outline (my cards) or 2px bottle-green outline (partner's). Placeholder `+1`, `+2` digits in Cormorant oldstyle 18px, ink-mute.
- **CLAIM TRAM ▶** = filled brass-deep CTA.

### RoundSummary — `RoundSummary.vue`
- Modal: `--salon-paper`, 18px radius, warm shadow.
- Outcome-tinted header bar goes. Replaced with: the word **Won** or **Lost** in italic Cormorant 32px, centered, bottle-green / burgundy respectively. A small section-tag `· ROUND N ·` in brass Inter 11px sits above it. The type carries the emotion; no colored stripe needed.
- Bid info line: "Praveen bid 10 ♥" — name in ink, number in Cormorant 20px, suit glyph in suit color. Warm.
- Team rows: single-line text, ink. `n / target` in Cormorant 16px on the right. Progress bar below each at 3px height — `--salon-bottle` for bidder-made, `--salon-burgundy` for bidder-failed, `--salon-rule` track. Drop the orange defender bar.
- **Score change** = hero typographic moment #3. `--salon-vellum` inset well, double-rule frame, `40 → 20` in Cormorant 48px centered. Delta `-20` in Cormorant italic 16px below in bottle-green (good for dealer) or burgundy (bad). No arrow colors, no separate box-shadow.
- Dealer-change block: `.salon-rule` divider, then one line: "New dealer — Bot 2" with brass dot prefix. Italic Cormorant for the name. No ⚠ emoji, no amber, no second inset tile.
- **NEXT ROUND ▶** = filled brass-deep CTA. The "tap anywhere to dismiss" footnote stays in ink-mute.

### ExplainLossOverlay — `ExplainLossOverlay.vue`
- Full-frame warm-ink scrim, same paper panel chrome. Failure-frame caption: burgundy 1px top border instead of a filled red bar. "BEATS" label: burgundy Inter 11px/0.22em, defeating card gets a 2px burgundy outline (no ring).
- Prev/Next nav buttons: outlined brass, paper fill. Step counter: Cormorant oldstyle "2 / 4".

### GameOverScreen — `GameOverScreen.vue`
- Background: `--salon-cream`. No trophy emoji — replace with a brass Cormorant `· Winner ·` tag above the name.
- Winner card: `--salon-paper` tile, 18px radius, double-rule frame (reused from room-code and score), warm shadow. Winner's name in Cormorant italic 40px, ink. If it's me, the double-rule is in `--salon-brass` instead of `--salon-rule`.
- "FINAL STANDINGS" section-tag in brass Inter 11px. Each row: paper, 1px rule, 10px radius, losses as superscript.
- **PLAY AGAIN** = filled brass-deep CTA. **LEAVE ROOM** = outlined brass.

### HelpOverlay — `HelpOverlay.vue`
- FAB: replace the slate-700 `?` with a circle 1px brass border, paper fill, brass `?` glyph (Cormorant 18px). 36×36 — one size down from current.
- Modal: paper, 18px radius. `How to Play Surri` in Cormorant italic 22px. Section headings in Inter 14px/600 ink. `.salon-rule` between each section. Body copy in Inter 14px/400 ink-soft. Inline math `X += 2X` in Cormorant 14px to make the rules-as-prose feel literary.
- Close: "Close" word button (ink-soft Inter 13px with underline) top-right. No ✕.

### IssueReportOverlay — `IssueReportOverlay.vue`
- Paper panel, 18px radius. Textarea: `--salon-vellum` fill, 1px rule border, focus 2px brass.
- Screenshot thumbnail: 1px rule frame, no dashed.
- Submit button: filled brass-deep (not blue — Salon has no blue). Cancel button: text-only ink-soft with underline.

### Confirm dialogs (Give Up, Leave)
- Paper card, warm shadow. Body ink. "Give Up" confirm: filled burgundy, cream text — the one place burgundy goes bold. Cancel: text-only ink-soft.

### Top-right chrome stack (Quit / Give Up / Issue)
- Keep the stack, restyle each button. All three: 1px rule border, paper fill, ink-soft text. On hover/press, Give Up promotes to burgundy border + burgundy text; Issue to brass border + brass text; Quit stays neutral. No ghost `bg-slate-800/80`, no amber, no red fills. Quieter than current chrome, more distinct on hover.

### Overflow menu
- Salon keeps the stack — we are not consolidating into one dots-menu (that was Paper's move). Three small outlined chips sit better with Salon's vocabulary than a single overflow affordance.

---

## 7. ASCII mockups — 4 hero screens

Phone frame ~40 chars. Monospace box-drawing. Legend: `░` = cream canvas, `▒` = paper surface, `▓` = vellum inset, `[B]` = brass, `[G]` = bottle green, `[R]` = burgundy.

### Lobby

```
┌──────────────────────────────────────┐
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░  Surri ·  ░░░░░░░░░░░░░░│  Cormorant 64, · in [B]
│░░░░░░░  A PARLOUR CARD GAME  ░░░░░░░│  Inter 11/0.22em ink-soft
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░ ▒ Alpha — feedback via Report ▒░│  paper chip, 1px [B]
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ░░│
│░░ ▒ Praveen                     ▒ ░░│  paper, 1px rule
│░░ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒ ░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░ ████████████████████████████████░░│
│░░ █        CREATE ROOM          █ ░░│  filled [B-deep] CTA
│░░ ████████████████████████████████░░│
│░░░░░░░░░░░░░░░░ · or · ░░░░░░░░░░░░░│
│░░ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒ ░░░│
│░░ ▒  ROOM CODE      ▒  ▒  GO   ▒░░░░│  paper input + outlined GO
│░░ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒ ░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
└──────────────────────────────────────┘
```

### Bidding panel (my turn, ♥ selected)

```
┌──────────────────────────────────────┐
│░ ♥ TRUMP     Us 0/10 · Them 0/4  ⋮ ░│  brass chip + ink info
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░  · Bot 2 ·  ░░░░░░░░░░░░░░░│  [B] dot prefix = dealer
│░░░░░   🂠 🂠 🂠 🂠 🂠 🂠 🂠 🂠   ░░░░░░│  cream card-backs
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░  Bot 1              Bot 3       ░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│  ▒         · BIDDING ·          ▒   │  [B] section tag
│  ▒ ─────────────────────────────▒   │  .salon-rule
│  ▒  Your turn to bid             ▒   │
│  ▒  Bot 2 passed · Bot 3 passed  ▒   │
│  ▒                                ▒   │
│  ▒  ┌────────────┐ ┌────────────┐▒   │
│  ▒  │ Ask partner│ │    Pass    │▒   │  outlined buttons
│  ▒  └────────────┘ └────────────┘▒   │
│  ▒ ─────────────────────────────▒   │
│  ▒           OR BID               ▒   │
│  ▒    ♠   ♥   ♦   ♣              ▒   │  ♥ has 2px [B] underline
│  ▒        ─                       ▒   │
│  ▒                                ▒   │
│  ▒      ‹    10    ›              ▒   │  Cormorant 56, oldstyle
│  ▒                                ▒   │
│  ▒ █████████████████████████████ ▒   │
│  ▒ █      CONFIRM BID ♥ 10    █ ▒   │  filled [B-deep] CTA
│  ▒ █████████████████████████████ ▒   │
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│                                      │
└──────────────────────────────────────┘
```

### Playing / trick area (my turn, bidder leads ♥)

```
┌──────────────────────────────────────┐
│░ ♥ TRUMP     Us 2/10 · Them 1/4  ⋮ ░│  [B] trump chip
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░   · Bot 2's hand   ░░░░░░░░░░░░│  Cormorant italic 14
│░░░░   🂱 🂲 🂳 🂴 🂵 🂶 🂷   ░░░░░░░░░│  partner revealed
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░  Bot 1              Bot 3       ░░░│
│░  ● ● ○ ○           ● ○ ○ ○      ░░░│  [G]/[R] filled dots
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░  (lamp wash)  ░░░░░░░░░░░░│  radial --salon-lamp
│░░░░░░░░░░░░   🂮   ░░░░░░░░░░░░░░░░░│  north trick card
│░░░░░░░░░  🂡        🂣  ░░░░░░░░░░░░│  west + east
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│  ┌──┐  ┌──┐                          │
│  │TR│  │Dh│   Praveen your turn      │  [B] outlined / [R] outlined
│  │AM│  │! │              ───          │  name [B] + [B] underline
│  └──┘  └──┘                          │
│  🂮 🂭 🂬 🂫 🂪 🂩 🂨 🂧 🂦 🂥 🂤 🂣 🂢     │  hand
│  ── ── ── ── ── ── ── ── ── ── ── ── │  [G] nib underline = playable
└──────────────────────────────────────┘
```

### Round summary — lost

```
┌──────────────────────────────────────┐
│░ (warm ink scrim)  ░░░░░░░░░░░░░░░░░│
│                                      │
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│  ▒        · ROUND 1 ·             ▒  │  [B] section tag
│  ▒                                 ▒  │
│  ▒          Lost                   ▒  │  Cormorant italic 32, [R]
│  ▒                                 ▒  │
│  ▒   Praveen bid 10 ♥              ▒  │  Cormorant 20 + suit red
│  ▒ ───────────────────────────────▒  │
│  ▒                                 ▒  │
│  ▒  Praveen + Bot 2        0 / 10 ▒  │  Cormorant right
│  ▒  ▓▓░░░░░░░░░░░░░░░              ▒  │  [R] 3px bar (failed)
│  ▒  Bot 1 + Bot 3         13 / 4  ▒  │
│  ▒  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓            ▒  │  [G] 3px bar
│  ▒ ───────────────────────────────▒  │
│  ▒                                 ▒  │
│  ▒   ╔═══════════════════════════╗▒  │  double-rule frame
│  ▒   ║                           ║▒  │
│  ▒   ║      40   →   20          ║▒  │  Cormorant 48 oldstyle
│  ▒   ║         −20               ║▒  │  Cormorant italic 16 [G]
│  ▒   ║                           ║▒  │
│  ▒   ╚═══════════════════════════╝▒  │
│  ▒ ───────────────────────────────▒  │
│  ▒                                 ▒  │
│  ▒   · New dealer — Bot 2         ▒  │  [B] dot + Cormorant italic
│  ▒                                 ▒  │
│  ▒ ██████████████████████████████ ▒  │
│  ▒ █      NEXT ROUND  ▶       █  ▒  │  filled [B-deep] CTA
│  ▒ ██████████████████████████████ ▒  │
│  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  │
│                                      │
│         tap anywhere to dismiss      │  Inter 11 ink-mute
└──────────────────────────────────────┘
```

---

## 8. Implementation guide for the next agent

This is the handoff. Implement on a fresh branch `salon-redesign` off `master`.

### Files that MUST be edited

- `client/index.html` — add Google Fonts `<link>` for Cormorant Garamond + Inter.
- `client/src/style.css` — add the token block, the font-family defaults, `.salon-grain`, `.salon-rule`, `.salon-chip`, `.card-frame`, `.btn-primary`, `.btn-outline`, `.btn-danger`, `.double-rule`.
- `client/tailwind.config.js` — extend `theme.colors` with the salon tokens and `theme.fontFamily` with `display` + `ui`.
- `client/src/App.vue` — swap outer `bg-[#1a1a1a]` for `bg-[#1E1810]` (warm ink letterbox), inner `bg-[#0f1b2d]` for `bg-[--salon-cream]`, add `.salon-grain` class. Body `color: #2B2118`. Disconnect overlay + issue toast restyled to the paper-panel chrome.
- `client/src/components/LobbyScreen.vue` — full restyle, see §6. Most surgical change: wordmark goes mixed-case Cormorant.
- `client/src/components/WaitingRoom.vue` — full restyle, room code becomes the typographic hero (double-rule plinth).
- `client/src/components/BiddingPanel.vue` — full restyle, bid number becomes Cormorant 56px oldstyle.
- `client/src/components/RoundSummary.vue` — full restyle, score delta becomes Cormorant 48px in double-rule well.
- `client/src/components/GameBoard.vue` — remove the radial gradient root + the trump watermark div + the two floating score badges; replace with trump chip + unified info strip. Add `--salon-lamp` radial behind trick area.
- `client/src/components/PlayerHand.vue` — playable-card affordance swap (green glow → bottle-green bottom border).
- `client/src/components/PlayerArea.vue` — remove yellow ring/crown/red dealer tint; use brass dot + brass underline + burgundy left-border for dealer.
- `client/src/components/Card.vue` — redraw the card-back CSS (§6 Card); face border to `--salon-rule`.
- `client/src/components/TrickArea.vue` — recolor Dhaap chip from amber to burgundy-outlined paper.
- `client/src/components/TramOverlay.vue` — scrim warm-ink, paper/vellum panels, brass/bottle-green slot outlines.
- `client/src/components/HelpOverlay.vue` — FAB from slate-700 to paper+brass-border; modal restyle.
- `client/src/components/IssueReportOverlay.vue` — blue submit → filled brass-deep.
- `client/src/components/ExplainLossOverlay.vue` — paper panel, burgundy accents replace red.
- `client/src/components/GameOverScreen.vue` — paper background, Cormorant winner name, double-rule winner card.

### Files that stay UNTOUCHED

- `server/*` — no backend changes. Socket contract frozen.
- `client/src/socket.js`, `client/src/main.js`, `client/src/services/analytics.js` — no design surface.
- `client/src/components/InfoBar.vue`, `BidProgressBar.vue` — currently unused; leave unchanged (dead code, don't rescue).

### Tailwind v4 theme tokens

Tailwind v4 uses CSS-first theming. Put this at the top of `client/src/style.css`, replacing the current 4-line file:

```css
@import "tailwindcss";

@theme {
  --color-salon-cream: #F4EBDA;
  --color-salon-paper: #FBF4E6;
  --color-salon-vellum: #ECDFC5;
  --color-salon-lamp: #F7E9C6;

  --color-salon-ink: #2B2118;
  --color-salon-ink-soft: #5A4B3A;
  --color-salon-ink-mute: #8C7B66;
  --color-salon-rule: #C7B590;

  --color-salon-brass: #A8813A;
  --color-salon-brass-deep: #7A5C23;
  --color-salon-bottle: #30563F;
  --color-salon-burgundy: #7A2230;

  --color-salon-us: #30563F;
  --color-salon-them: #7A2230;

  --color-salon-suit-red: #9C2A2E;

  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-ui: "Inter", system-ui, sans-serif;

  --radius-salon-sm: 10px;
  --radius-salon-lg: 18px;

  --shadow-salon: 0 12px 28px -10px rgba(122, 92, 35, 0.22);
}

body {
  background: var(--color-salon-cream);
  color: var(--color-salon-ink);
  font-family: var(--font-ui);
  font-feature-settings: "tnum" 1;
}

* { touch-action: manipulation; }
```

Usage then becomes `bg-salon-paper`, `text-salon-ink`, `border-salon-rule`, `font-display`, `rounded-salon-lg`, `shadow-salon` — native Tailwind v4 utility generation.

### Fonts

Add to `client/index.html` inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

For Capacitor offline safety, consider switching to `@fontsource/cormorant-garamond` + `@fontsource/inter` in a follow-up — but the Google link ships fine for v1 and matches how the web deploy works today.

### Reusable utility classes (add to `client/src/style.css` after the `@theme` block)

```css
/* Paper grain — applied once on the app frame */
.salon-grain {
  background-image:
    var(--color-salon-cream) linear-gradient(0deg, transparent, transparent),
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.17  0 0 0 0 0.13  0 0 0 0 0.09  0 0 0 0.04 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  background-blend-mode: multiply;
}

/* The classic section rule */
.salon-rule {
  height: 1px;
  background: var(--color-salon-rule);
  margin: 10px 0;
  border: 0;
}

/* Small chip — bid history, alpha banner, trump chip */
.salon-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--color-salon-rule);
  background: var(--color-salon-paper);
  color: var(--color-salon-ink-soft);
  border-radius: var(--radius-salon-sm);
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 500;
}

/* Double-rule frame — room code plinth, score-delta well, winner card */
.double-rule {
  border: 1px solid var(--color-salon-rule);
  outline: 1px solid var(--color-salon-rule);
  outline-offset: 3px;
}

/* Card face wrapper — replaces the current border-slate-600 on Card.vue */
.card-frame {
  border: 1px solid var(--color-salon-rule);
  border-radius: 6px;
  background: var(--color-salon-paper);
}
.card-frame.is-playable {
  border-bottom: 2px solid var(--color-salon-bottle);
}
.card-frame.is-selected {
  outline: 2px solid var(--color-salon-brass);
  outline-offset: 1px;
}

/* Buttons */
.btn-primary {
  background: var(--color-salon-brass-deep);
  color: var(--color-salon-cream);
  font-family: var(--font-ui);
  font-weight: 600;
  font-size: 14px;
  padding: 12px 16px;
  border-radius: var(--radius-salon-sm);
  box-shadow: var(--shadow-salon);
  transition: background 140ms ease-out, transform 140ms ease-out;
}
.btn-primary:hover { background: var(--color-salon-brass); }
.btn-primary:active { transform: translateY(1px); }
.btn-primary:disabled { opacity: 0.45; box-shadow: none; cursor: not-allowed; }

.btn-outline {
  background: var(--color-salon-paper);
  color: var(--color-salon-brass-deep);
  border: 1px solid var(--color-salon-brass);
  font-weight: 500;
  padding: 10px 16px;
  border-radius: var(--radius-salon-sm);
}
.btn-outline:hover { background: var(--color-salon-vellum); }

.btn-danger {
  background: var(--color-salon-burgundy);
  color: var(--color-salon-cream);
  font-weight: 600;
  padding: 10px 16px;
  border-radius: var(--radius-salon-sm);
}

.btn-ghost {
  background: transparent;
  color: var(--color-salon-ink-soft);
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 500;
  padding: 6px 8px;
}

/* Oldstyle numeric moments */
.num-display {
  font-family: var(--font-display);
  font-weight: 500;
  font-feature-settings: "onum" 1, "lnum" 0;
  letter-spacing: 0;
}
.num-tag {
  font-family: var(--font-display);
  font-feature-settings: "onum" 1, "lnum" 0;
}

/* Active-seat underline (for PlayerArea) */
.seat-active-name {
  color: var(--color-salon-brass);
  font-weight: 600;
  border-bottom: 2px solid var(--color-salon-brass);
  padding-bottom: 1px;
}
```

### Anti-patterns (do not do)

- **Do not use `backdrop-filter: blur()` anywhere.** Salon surfaces are opaque cream, not glass. Scrims are warm-ink rgba, not blurred panels.
- **Do not add gradients to surfaces.** One cream, one paper, one vellum. The only gradient allowed anywhere is the single `--salon-lamp` radial behind the trick area.
- **Do not restore any slate-*, green-*, blue-*, emerald-*, amber-*, yellow-* Tailwind utilities.** If you reach for `text-yellow-400`, you've mis-keyed brass. Brass is ink-dense and warm, yellow is cheerful and cold — they're not interchangeable.
- **Do not use ALL-CAPS for anything larger than a section tag (11px).** No tracked-caps wordmark (that's Paper). No tracked-caps headings. Outcome titles are Cormorant italic, mixed case.
- **Do not use `rounded-full` on anything rectangular.** Pills go to 10px radius. The only fully-rounded shapes in Salon are the trick-won dots and the brass `·` dealer dot.
- **Do not use `shadow-lg`, `shadow-2xl`, or any Tailwind shadow utility.** Use `shadow-salon` (the one warm-brass shadow) or no shadow.
- **Do not reinstate the trump watermark glyph.** Trump lives in the brass chip, full stop. The lamplight radial is the only ambient element behind the trick.
- **Do not use emoji for UI furniture.** 🤖 👑 👤 ⚠ 🏆 📡 — all gone. Dealer is a brass `·`. Bot vs human is a typographic difference (bot names in ink-soft italic). Warning state is a word ("Dealer change") not an icon. Winner is a Cormorant `· Winner ·` tag.
- **Do not use a second accent color.** Brass does the CTA/active job. Bottle-green is reserved for support-signal + playable + "bid made". Burgundy is reserved for destructive + loss + score-alarm. If you find yourself inventing a fourth hue, stop.
- **Do not introduce motion libraries.** Vue `<Transition>` + CSS is sufficient. No `@vueuse/motion`, no GSAP, no confetti.

### "Done" acceptance criteria

A component is done when it hits its one-line check:

- **LobbyScreen**: Wordmark renders `Surri` in mixed-case Cormorant with a brass `·` after the final i; CREATE ROOM is a filled brass-deep button; no amber banner strip.
- **WaitingRoom**: Room code renders in Cormorant 88px oldstyle inside a double-rule plinth; no orange, no blue buttons.
- **BiddingPanel**: Bid number renders in Cormorant 56px oldstyle with text chevrons (no circular stepper buttons); CONFIRM is filled brass-deep.
- **Partner reveal variant of BiddingPanel**: Cormorant italic heading + same stepper treatment + brass-deep START.
- **GameBoard**: No radial navy gradient on the board root; no trump watermark glyph div in the DOM; exactly one `--salon-lamp` radial behind the trick cluster; trump + team scores live in a single brass-chip + info-text strip top-left.
- **PlayerHand**: Playable cards have a 2px bottle-green bottom border and no green box-shadow glow; unplayable cards are `opacity: 0.62`.
- **PlayerArea**: Active seat shows `.seat-active-name` (brass + underline) with no `ring-2 ring-yellow-400`; dealer shows `·` brass dot prefix with no 👑 emoji; dealer pill has a 2px burgundy left border.
- **Card**: Card-back is cream-and-brass monogram CSS with no PNG asset; face border is 1px `--salon-rule`.
- **TrickArea**: Dhaap chip is outlined burgundy on paper; no amber anywhere.
- **TramOverlay**: Scrim uses warm-ink rgba, slots use bottle-green (partner) / brass (mine) outlines, CLAIM is filled brass-deep.
- **RoundSummary**: Outcome is `Won` / `Lost` in Cormorant italic 32px (bottle-green / burgundy); score delta is in a double-rule vellum well; no ⚠ emoji; NEXT ROUND is filled brass-deep.
- **GameOverScreen**: Winner name in Cormorant italic 40px inside a double-rule card; no trophy emoji; PLAY AGAIN is filled brass-deep, LEAVE ROOM is outlined.
- **HelpOverlay**: FAB is a 36×36 paper circle with a brass `?` glyph (Cormorant); modal body is paper; section dividers are `.salon-rule`.
- **IssueReportOverlay**: Submit button is filled brass-deep (not blue).
- **ExplainLossOverlay**: "BEATS" label is burgundy tracked-caps; defeating card has a 2px burgundy outline (not a red ring).
- **Global**: No Tailwind `slate-*`, `green-*`, `blue-*`, `amber-*`, `yellow-*`, `red-*` class remains in any template. Grep check: `rg "(slate|green-[0-9]|blue-[0-9]|amber-|yellow-[0-9]|red-[0-9])" client/src/components/` returns zero matches.

Salon ships when the app opens on `--salon-cream`, the first thing your eye lands on is `Surri` in a serif, and the CREATE ROOM button looks like a brass plate on book leather — without a single wood grain or felt pixel having been used to get there.
