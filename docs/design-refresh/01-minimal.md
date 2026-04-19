# Surri — Minimal Redesign Proposal

**Direction name:** *Paper* — a calm, typographic, near-monochrome take on the table game.

---

## 1. Design direction

Strip the table to a single sheet of dark paper and let the cards, numbers, and names do the work. We optimize for **legibility on a one-handed phone**, **instant state read** (whose turn, what's trump, how far to the target), and **emotional quiet** between actions. We deliberately give up: saturated team-vs-opponent color war, decorative crowns/watermarks/trump glyphs, pill-shaped every-button CTA, and the alpha-stage scare banner. Minimal here is not "fewer pixels" — it is *fewer objects*, *fewer hues*, *more air*.

---

## 2. Color system

A six-token palette. Everything else is opacity of these.

| Token | Hex | Role | Justification |
|---|---|---|---|
| `bg` | `#0E1116` | Canvas | Near-black with a trace of blue. Kills the current radial navy gradient — flat is calmer and renders the same on OLED/LCD. |
| `surface` | `#171B22` | Cards, sheets, modals | One elevated tier. Replaces the slate-800/slate-700 two-tier scheme. |
| `line` | `#262B34` | Hairline dividers, card borders | Replaces every `border-slate-600`. Used at 1px. |
| `ink` | `#ECEEF2` | Primary text, wordmark | Off-white, not pure white — reads softer at night. |
| `ink-dim` | `#8A919C` | Secondary text, labels, disabled | Single muted tone — replaces slate-400, slate-500, slate-600. |
| `accent` | `#C9A24B` | **Your turn, selected, bid confirmation** | A warm brass — the color of the existing card-back filigree. It's the one brand cue we keep, now promoted to primary. Replaces the emerald green that currently does both CTA and "you" duty. |
| `danger` | `#C7463C` | Only: Give-Up, score-over-40 warning, TRAM-failed, Round-Lost header | Muted red. Dialed down from the current `#e24d4d`. |
| `success` | `#6B9E6E` | Only: Round-Won header, bid-met check | Sage, not emerald. Used *once per screen*, never as a button surface. |

**Colors we are deliberately removing:**
- Emerald/green CTA surface (every primary button). Gone — primary buttons are `ink` on `surface` with a 1px `accent` underline on the active state.
- Blue "your team" pill. Gone — team identity is communicated by position + name, not hue.
- Red "opponent team" pill. Same — redundant with team names already shown.
- Orange alpha banner. Gone — move to a one-line `ink-dim` footnote under the wordmark.
- Orange "Dealer Change" warning tint. Gone — use the word **DEALER** in `accent` weight 600.
- Purple / pink seat-icon emoji. Gone — all seats use the same 👤 glyph; bots get `ink-dim` name styling, humans get `ink`.
- The yellow 👑 crown emoji. Gone — dealer gets an `accent` dot before the name.
- Amber "Dhaap!" pill + amber-700 "Issue" button. Gone — both use the surface + accent pattern.
- The giant faded trump watermark behind the trick area. Gone — trump lives in one place only: a small chip in the top status bar.

---

## 3. Typography

**One family: Inter** (variable). Loaded from `/fonts/` locally — no Google Fonts CDN, keeps the Capacitor build offline-safe. System sans is fallback.

Hierarchy is size × weight only; no color changes for rank.

| Role | Size | Weight | Tracking | Example |
|---|---|---|---|---|
| Wordmark | `text-5xl` (48px) | 600 | `0.24em` | SURRI |
| Hero numeric (room code, score delta) | `text-4xl` (36px) | 500 | `0.1em` | `779` |
| Screen title (ROUND LOST, PARTNER REVEAL) | `text-sm` (14px) | 600 uppercase | `0.18em` | section tag |
| Primary body (prompts, turn-state) | `text-base` (16px) | 500 | — | "Your turn to bid" |
| Name (player) | `text-sm` (14px) | 500 | — | Praveen |
| Meta / label | `text-xs` (12px) | 500 uppercase | `0.12em` | TRUMP, BID |
| Footnote / legal | `text-[11px]` | 400 | — | "Tap to dismiss" |

No italics. No all-caps except labels and the single screen-title tag. No letter-spaced words below `text-sm`.

---

## 4. Spacing, radius, elevation

- **Rhythm: 4 pt.** Tailwind spacing `1 / 2 / 3 / 4 / 6 / 8 / 12` cover 99% of cases. Screen horizontal padding: `px-5` (20px) — slightly tighter than current `px-6` to let the hand breathe.
- **Radius: two tokens.** `rounded-lg` (8px) for buttons / inputs / info chips. `rounded-2xl` (16px) for surfaces and sheets. Cards stay at their image's intrinsic `rounded-md`.
- **Elevation: zero shadows, ever.** Elevation is communicated by `bg-surface` over `bg`. No `shadow-lg`, no `box-shadow: 0 0 40px rgba…` on the bidding panel. Sheets/modals get a `backdrop-blur-sm bg-bg/80` scrim — calmer than the current `bg-black/80`.
- **Borders**: always 1px `line`. Active state = 1px `accent`. No 2px selected-ring.

---

## 5. Component redesign notes

### LobbyScreen
- Drop the orange alpha banner; replace with a single `ink-dim` line under the wordmark: "Alpha — send feedback via the in-game issue button."
- Wordmark stays in `ink`, same tracking, but `text-5xl` (down from `text-6xl`) and weight 600 (not bold). Subtitle stays.
- Input has no pill border — just a 1px `line` bottom rule; focus promotes to `accent`. Top/left/right borders gone.
- `CREATE ROOM` button: `bg-surface` with `ink` text, 1px `line`. When `playerName` is present, the label gets an `accent` underline. This replaces the full emerald fill.
- `GO` button: identical treatment — paired with room-code input by hairline only, no separate button tile.
- **Restructure:** keep the two actions but lay them out as two labeled sections ("New room" / "Join existing") rather than an `OR` divider.

### Bot-count bottom sheet
- **Keep** the bottom sheet pattern — it's already minimal enough.
- Change: replace the 4 filled tiles with a horizontal scale: `0   1   2   3` — numbers sit on a hairline, selected number is `accent` with a 2px underline. No tile backgrounds. Removes four surfaces.

### WaitingRoom
- Kill the 3D tile around the room code. Code becomes giant `text-4xl` centered number in `ink` directly on `bg`.
- `Copy` / `Share` become two inline text buttons beside the code — weight 500, `ink-dim`, underline on press. No filled buttons.
- Seat rows lose the icon and the pill border — each row is a single line: "Praveen — you", "Bot 1", separated by `line` hairlines. Dot (`accent`) prefixes the host.
- `START GAME` button follows the lobby CTA rule.

### BiddingPanel
- **Biggest restructuring target.** Currently a modal-over-scrim-over-table. New version: **anchor to the bottom third** above the hand, no scrim, no shadow. The panel is a `surface` card with a 1px `line` top border only — it feels like a drawer, not a popup.
- Remove the uppercase "BIDDING" header strip. The prompt itself ("Your turn to bid") is the header.
- Bid-history chips shrink from pills to a single wrapped line: `Bot 2 passed · Bot 3 passed` — no chip backgrounds.
- Suit picker: four glyphs on a row, no tile backgrounds. Selected suit gets a 2px `accent` underline. Red suits (♥ ♦) keep their red character color.
- Bid stepper: remove the circular `‹ ›` buttons. Tap-left-half decreases, tap-right-half increases, center shows "BID 10" — a single pill. Halves the button count.
- `Ask Partner` / `Pass` become two plain text buttons side by side, hairline separator between them. `CONFIRM BID ♥10` is the only filled action when valid — and even then, filled means `bg-surface` + `accent` underline, not emerald.
- Support signal response row (Full/Major/Minor/Pass) — same treatment: four text labels on a row, underline on tap.

### Partner reveal
- **Keep** the idea: partner's hand appears on the north rail. But kill the "BOT 2'S HAND" uppercase label — replace with the partner's name in `text-xs ink-dim`, left-aligned above the first card.
- The "You bid 10 — increase bid?" modal becomes the same bottom-drawer as BiddingPanel. Same stepper, same accented `START` link.

### Playing phase / TrickArea
- Remove the faded trump glyph behind the trick. Trump lives in a single chip top-left: `♥ Trump` — `accent` suit glyph, `ink-dim` label.
- Score badges (`0 / 10` blue, `0 / 4` red) consolidate into **one top-bar row** instead of two floating pills: `Us 0 / 10 · Them 0 / 4`. No hue, no shadow, no border — just text.
- Trick-won dot circles under each seat: keep the dot pattern but flatten. Filled = `ink`, unfilled = `line`. Drop the team-color fill.
- "Your turn" yellow caption: move *off* the top-right float and *into* the south player pill itself — the seat name turns `accent` and gains a thin `accent` underline. No badge, no scrim.
- `Give Up` button moves into the top-right overflow menu (see below), not the playing surface.

### PlayerHand
- Card images stay. The green underline for playable cards becomes a 1px `accent` bottom border on the card image. The glow shadow (`box-shadow: 0 0 8px rgba(74, 222, 128, 0.3)`) goes.
- Unplayable cards: 55% opacity, no blur. The current implicit "cursor-not-allowed" is UX-only (touch devices don't care); keep but silent.
- "Play partner's card" contextual label: stays, but moves from top-right float to a line just above the south seat pill, in `ink-dim`.

### PlayerArea (seat pills)
- One-line chip per seat: `• Bot 1` (the dot = dealer) or `Bot 1` (no dealer). Losses counter appears as a superscript number after the name: `Bot 1²`. Drops the round badge + red pill + 👑 crown.
- Active turn = seat name in `accent`, thin underline. Drops the yellow `ring-2`.
- Disconnected/bot-filling = name in `ink-dim` + small "(bot)" suffix. Drops the 🤖📡 emoji signal glyph.

### Top-right chrome stack
- Collapse `Quit game` / `Issue` / (playing-only `Give Up`) into **one overflow icon** (three vertical dots, `ink-dim`). Tap opens a 3-row sheet from the top-right: Report an issue / Give up this round / Quit game. Same behaviors, one surface instead of three floating pills.

### RoundSummary
- Drop the red/green tinted header bar. First line becomes a single `text-sm uppercase tracking-wide accent` tag: `ROUND WON` or `ROUND LOST`.
- Replace the two colored progress bars with one: a single 13-segment strip at the top of the modal, each segment tinted `accent` (bidder team), `ink` (defender), or `line` (empty). One visual answers "where did the 13 tricks go."
- Score change block: keep the `40 → 20` pattern, but drop the internal `bg-slate-700` tile. It's a centered number on `surface`.
- Dealer-change block: drop the ⚠ icon and the `bg-slate-700` tile. Use a hairline divider + one line: "New dealer — Bot 2" with `accent` dot.
- CTA: `Next round` becomes a hairline-bordered text button, full width, `ink` label. No emerald, no filled surface.

### TramOverlay
- **Keep** the two-row "my hand / partner hand" selection pattern — it's load-bearing and already quiet.
- Drop the amber framing. Selected cards get the same 1px `accent` bottom border from PlayerHand. Ordering badges become plain digits `1 2 3` in `accent`, no circular chips.
- `CLAIM` button: the single accent-underlined action.

### Help modal & Issue modal
- **Keep** structure. Simplifications:
  - Help: replace the `✕` icon with the word `Close` at top-right — consistency with other text actions.
  - Issue: same. Dashed border and amber accents in the screenshot thumbnail go; thumbnail is just a 1px `line` framed image.
  - Drop the `?` FAB entirely. Help lives in the top-right overflow menu alongside Issue.

### Give-Up confirmation dialog
- **Keep** the center-card pattern. Change: scrim becomes `bg/70 backdrop-blur-sm` instead of `black/70`. Red `Give Up` confirm button uses `danger` as **text color**, not fill — the button is `surface` like its "Cancel" sibling. This is the one place we lean on color coding, and we earn it by not overusing red elsewhere.

---

## 6. ASCII mockups — 4 hero screens

### Lobby

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│            S U R R I                 │
│       MULTIPLAYER  CARD  GAME        │
│                                      │
│   Alpha. Report issues in-game.      │
│                                      │
│                                      │
│   NEW ROOM                           │
│   ───────────────────────────        │
│   Your name                          │
│   Praveen____________________        │
│                                      │
│                CREATE  ROOM          │
│                ─────────────         │
│                                      │
│   JOIN EXISTING                      │
│   ───────────────────────────        │
│   Code   779__        GO             │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

### Bidding (my turn, suit chosen)

```
┌──────────────────────────────────────┐
│ ♥ Trump      Us 0/10 · Them 0/4      │
│                                      │
│           · Bot 2                    │
│        [card][card][card]...         │
│                                      │
│  Bot 1                        Bot 3  │
│  passed                       passed │
│                                      │
│            [trick area]              │
│                                      │
│                                      │
│                                      │
│  ────────────────────────────────    │
│  Your turn to bid                    │
│  Bot 2 passed · Bot 3 passed         │
│                                      │
│  Ask partner          Pass           │
│  ─────────────        ────           │
│                                      │
│  OR BID                              │
│  ♠   ♥   ♦   ♣                       │
│      ─                               │
│                                      │
│       ‹     BID 10     ›             │
│                                      │
│            CONFIRM ♥ 10              │
│            ──────────                │
│  ────────────────────────────────    │
│                                      │
│  [♣2][♣7][♥3][♥10][♥A][♦5]...        │
└──────────────────────────────────────┘
```

### Playing (your turn, mid-trick)

```
┌──────────────────────────────────────┐
│ ♥ Trump    Us 2/10 · Them 1/4     ⋮  │
│                                      │
│              · Bot 2                 │
│          · · · ○ ○ ○ ○ ○ ○ ○         │
│                                      │
│                                      │
│  Bot 1              Bot 3            │
│  ○ ○ ○ · ·          ○ ○ · · ·        │
│                                      │
│              [K♥]                    │
│        [9♥]       [ ? ]              │
│              [ ? ]                   │
│                                      │
│                                      │
│                                      │
│           Praveen — your turn        │
│                                      │
│  TRAM                                │
│  ────                                │
│  [2♣][7♣][3♥][10♥][A♥][5♦][J♦]...    │
│        ─    ──    ─                  │
│       (accent underline = playable)  │
└──────────────────────────────────────┘
```

### Round summary (round lost)

```
┌──────────────────────────────────────┐
│                                      │
│          R O U N D   L O S T         │
│                                      │
│   Praveen bid 10 ♥                   │
│                                      │
│   ████████░░░░░  (bidder  0 / 10)    │
│   13 tricks to opponents             │
│                                      │
│   Praveen + Bot 2         0 / 10     │
│   Bot 1 + Bot 3          13 / 4      │
│                                      │
│   ──────────────────────────────     │
│                                      │
│            40  →  20                 │
│              −20                     │
│                                      │
│   ──────────────────────────────     │
│                                      │
│   Dealer change — score went         │
│   negative.                          │
│   · New dealer — Bot 2               │
│                                      │
│                                      │
│            NEXT ROUND                │
│            ──────────                │
│                                      │
│         tap outside to dismiss       │
└──────────────────────────────────────┘
```

---

## 7. Migration effort

**Pure Tailwind class swaps** (an afternoon, no logic touched):
- Replace every `bg-green-*`, `bg-slate-800`, `bg-slate-700`, `border-slate-600`, `text-slate-400`, `text-red-400`, `text-yellow-400` with the 6-token palette via a search/replace.
- Drop `shadow-lg`, `shadow` and the inline `box-shadow: 0 0 40px…` on `BiddingPanel.vue`.
- Remove the radial gradient on `GameBoard.vue` root (→ `bg-[#0E1116]`).
- Swap card `border-slate-600 / card-playable` green glow → 1px `accent` underline.

**Component restructures** (1–2 days each):
- `PlayerArea.vue`: consolidate the name + dealer + score + trick-dots + losses into a single-line horizontal chip. Kills the vertical stack logic.
- `BiddingPanel.vue`: remove the central modal positioning in `GameBoard.vue` (lines 458–469); re-mount the panel as a bottom drawer above the hand. Drop header strip. Flatten bid stepper.
- `RoundSummary.vue`: replace two progress bars with a single 13-segment strip — new computed that maps each trick index → team. Drop the score-change + dealer-change inset tile backgrounds.
- `GameBoard.vue`: remove the trump watermark div (lines 250–260). Remove the blue/red floating score badges (379–390) — replace with one text row under the trump chip.

**Information-architecture changes** (larger, touch multiple files):
- Collapse `Quit game` / `Give Up` / `Issue` / `?` Help FAB into **one** overflow menu component (new file, `TopMenu.vue`). This moves four floating elements into one. Touches `GameBoard.vue` and `HelpOverlay.vue`.
- Remove the alpha banner in `LobbyScreen.vue` and relocate the message to a single line beside the wordmark. Three lines deleted, one added.
- Move bidding panel from "modal-on-scrim" to "inline drawer above hand" — meaningful change to the board z-index layering; test that suit-picker / bid-stepper still feel central on tall screens.

Tailwind config additions needed (`client/tailwind.config.js`): extend `theme.colors` with the six tokens and extend `fontFamily.sans` to `['Inter', 'system-ui']`. Everything else survives as utility classes.
