# Screenshot Review — Minimal & Modern Capture Sets

Review of the 24 PNGs under `docs/design-refresh/screenshots/{minimal,modern}/` against the specs in `01-minimal.md` and `02-modern.md`.

All PNGs are 780×1688 (390×844 @ DPR 2). Verified by direct image inspection, MD5 hashing, and correlation against source in the two worktrees (`.claude/worktrees/agent-a8acef7b` for Paper/minimal, `.claude/worktrees/agent-ad068d46` for Late‑Night/modern).

---

## Verdict

- **Minimal direction is mostly intact but undersold by the capture set.** 01–07 render cleanly and match the Paper spec. 08–12 are unusable — see below.
- **Minimal 08–12 are the literal same PNG.** MD5 `32ac3b5fcf3c4ea34ba08f07bf05e7de` on all five files. This is a **capture-script failure**, not a design defect. None of the help / issue / give‑up / round‑summary overlays were ever triggered; 08's playing-state frame was re‑saved under five filenames. The user's observation that "08–12 all look the same" is correct and provable at the byte level.
- **Modern direction is broken, not merely unpolished.** On every gameplay screen (04, 07, 08, 10, 11, 12) the three opponent seats + trick area collapse into a **single vertical column of tiny tiles running down the middle of the frame.** On bidding screen 04 the panel itself never appears. The user's observation that "cards and overall layout are unintelligible" in modern is correct.
- **Root cause of the modern collapse is one CSS rule.** `.aurora-bg > * { position: relative; z-index: 1; }` in the modern branch's `client/src/style.css` (lines 94‑97) has higher specificity than Tailwind's `.absolute` utility, so every absolutely-positioned child of the board root gets forced back into normal flow. Every seat, the trick area, the partner hand, the bidding panel, the score strip — all of it stacks vertically in document order.
- **Capture-script bugs conflate with design bugs.** Minimal 08–12, modern 10, modern 11, and modern 12 are capture failures (the overlay never rendered); the underlying branches do have those overlays. Modern 09 (help), 05 (bidding drawer), 06 (suit selected), 02 (bot-count sheet), 03 (waiting room) demonstrate that individual components on the modern branch can render fine when the aurora-bg stacking bug doesn't apply to them.
- **Spec fidelity, short version:** Minimal roughly honours the Paper spec (flat, typographic, accent brass). Modern only partially honours the Late‑Night spec (glass E1/E2/E3 show up, lime CTA shows up, Space Grotesk numerals show up in room code), but the core "late‑night card room" *table* is unviewable because of the stacking bug.

---

## Minimal — per-screen notes

### 01 — Lobby
Matches the Paper spec: near-black canvas, "S U R R I" wordmark in ink with wide tracking, dim "MULTIPLAYER CARD GAME" subtitle, single-line "Alpha — send feedback via the in-game issue button." under the subtitle (exact wording of the spec). Two sections: "NEW ROOM" (label) with "Your name" above a Praveen hairline input, then a dark "Create room" button with a brass accent underline beneath the label. "JOIN EXISTING" with "Code" placeholder "779" on a hairline, and "Go" as an inline text link right. No emerald anywhere. Clean, calm, fulfils intent. The Create-room button's pill chrome (visible slate-tinted rectangle around the button) slightly contradicts the spec's "bg-surface + 1px line" treatment — the spec wanted it nearly border-less with only the accent underline. Minor.

### 02 — Bot-count bottom sheet
Matches spec. Bottom sheet slides up; label "BOTS TO FILL SEATS" (brass dim); four numerals 0 1 2 3 on a hairline, "2" in brass with a 2px brass underline. "Start room" button in a brass-outlined rectangle with brass-underlined label. Lobby behind is **blurred** (per spec's backdrop-blur-sm). Good.

### 03 — Waiting room
Matches spec. "← Leave" top-left. "ROOM CODE" tracked label. Room code "4 9 0" in giant ink numerals on naked background (no tile chrome). "Copy · Share" as two inline text buttons with a middle-dot separator. Four seat lines separated by hairlines: "● Praveen / YOU" (brass dot prefix, brass "YOU" tag right-aligned, accent underline under "Praveen"), "Bot 1 (bot)", "Bot 2 (bot)", "Bot 3 (bot)" all in ink-dim. "Start game" button in brass-outlined rectangle with underline. Clean.

### 04 — Bidding, your turn
Mostly matches. Top shows Bot 2 with a small face-down fan and "Pass" chip above. Left/right show "Pass" chips above gold-bordered card-back stacks (Bot 1 / Bot 3). Center shows Praveen (you) pill with brass underline + "Score 0" underneath. Bottom half is the bidding drawer (per spec — not a center modal): "Your turn to bid" header, a single-line bid history "Bot 1passed · Bot 2passed · Bot 3passed" (with missing spaces — minor string bug: should be "Bot 1 passed", etc.), two side-by-side actions "Ask partner | Pass" with a hairline divider, "OR BID" divider, 4 suit glyphs in a row (♠ ♥ ♦ ♣, red suits keeping their red color), a "< Bid 10 >" stepper in a hairline-bordered pill, and a "Confirm" disabled text button.

**Issue**: the player's own hand is not visible at the bottom. The drawer occupies the space where the hand should be. The spec intended the drawer to sit *above* the hand, not *in place of* it. Implementation regression.

### 05 — Bidding, partner gave support
Same layout as 04 with three differences: Bot 2's "Pass" chip becomes "Minor" (correctly rendered in plain ink — no green tint, consistent with spec's "hue reduction"), the Ask button label swaps to "Asked" in ink-dim, and a line "Bot 2 says **Minor**" appears between the action buttons and the OR BID divider. Hearts suit shows a brass underline — that's the auto-selected default (per modern spec; minimal spec didn't mandate auto-select but it's harmless). Confirm now shows "Confirm ♥10" with brass underline. Good. Hand still missing at bottom.

### 06 — Bidding, suit selected (heart)
Identical to 05. This is actually a duplicate-looking frame because 05 already shows hearts auto-selected and Confirm ♥10 active. The capture script's "click heart tile" probably clicked an already-selected tile. Not wrong per se, just redundant — the captured frame 05 and 06 diff only in minor support-chip animation timing. Not the user's "all the same" complaint but still a weak capture.

### 07 — Partner reveal
Matches spec well. Top-left chip "♥ TRUMP" (red heart glyph + dim TRUMP label). Top-right "Us 0/10 · Them 0/4" status. Bot 2's face-down fan is replaced with an actual 13-card fan showing rank/suit faces (2♠ J♠ 4♥ 7♥ 9♥ J♥ 2♣ 10♣ Q♣ 3♦ 4♦ 5♦ A♦ — readable, though the cards are narrow). Above the fan is a small "Bot 2" label. Bot 1 / Bot 3 remain with card-back stacks + "Pass" chips. Empty trick circles visible (○○○○○○○○○ under Bot 2; ○○○○ under Bot 1). Praveen (you) in brass with "Score 0". Bottom drawer shows "You bid **10** — increase?" with "< Bid 10 >" stepper and a brass-underlined "Start play" CTA. Matches spec. Hand still absent from bottom (same regression as 04–06).

### 08 — Playing, your turn, partner hand revealed
Top info strip + partner hand + opponent seats all render cleanly. Hand at bottom now **visible and readable** — I can make out 9♠ 10♠ K♠ A♠ 2♥ 5♥ 6♥ 8♥ 9♥ (lifted card) 2♦ 9♦ (+more). The 8♥ is lifted/selected. "TRAM" and "DHAAP" buttons appear lower-left in brass underline style (spec wanted both in a floating glass toolbar — minimal says plain text with underline, which is what we got). The brass underline on 8♥ indicates playable card affordance — consistent with the spec's "1px accent bottom border." Matches intent.

### 09 — Help modal (CLAIMED)
**This screen is byte-identical to 08.** (MD5 `32ac3b5f…` for both.) The help overlay never rendered. This is a capture bug. The HelpOverlay component *does exist* on the minimal branch (`agent-a8acef7b/client/src/components/HelpOverlay.vue`), so this is not a design failure — the capture script's "click `?` FAB" step missed.

### 10 — Report Issue modal (CLAIMED)
**Byte-identical to 08 and 09.** Same capture failure. The README already flagged this ("Issue button match was greedy and matched a different element first").

### 11 — Give Up confirmation (CLAIMED)
**Byte-identical to 08, 09, 10.** Same capture failure.

### 12 — Round summary (CLAIMED)
**Byte-identical to 08, 09, 10, 11.** Same capture failure. The README flags this for both directions.

**Minimal 08–12 conclusion**: the user is right — they are the same — but the cause is the capture script never progressing past the playing state, not the design collapsing those five views into one. Re-running the capture script with fixed selectors will produce five distinct frames from the existing branch.

---

## Modern — per-screen notes

### 01 — Lobby
Matches the Late-Night spec reasonably well. Top-center shows a violet-bordered glass chip reading "ALPHA · TAP FEEDBACK TO HELP". "S U R R I" wordmark: the **S and the final I are in lime `#C3FF3A`**, middle URR in off-white (per spec). "MULTIPLAYER CARD GAME" subtitle in dim text. A glass pill input showing "Praveen". A full-width lime CTA "CREATE ROOM ▶" with visible lime drop-glow. "OR JOIN" divider. A glass pill "ROOM CODE" with inline "GO" glass button. "?" FAB bottom-right (modern spec didn't kill the FAB). Aurora violet gradient washes from top to bottom. Mostly on-spec; only deviation is the alpha chip text breaking awkwardly onto two lines ("· ALPHA · TAP FEEDBACK / TO HELP").

### 02 — Bot count bottom sheet
Matches spec. Glass-E2 sheet from bottom with a small violet grab-handle on top. "Bots to fill seats" header, subhead "Bots play while you wait for friends." (taken verbatim from spec §6.2). Four glass chips 0 1 2 3; "2" is filled lime with dark text (correctly contrasting). Lime CTA "START ROOM ▶" fills sheet bottom. Good.

### 03 — Waiting room
Matches spec and is arguably the single strongest modern frame. Room code "9 5 9" is a giant **lime Space Grotesk** numeric — you can read it from the back of the room. "Copy" glass pill + violet-filled "Share" pill beside it (spec calls for glass-only Share; this deviation is minor). Praveen row has a circular violet avatar well with 👤 and a lime outer ring on the row; Bot 1/2/3 rows show a violet-ringed bot avatar + "··· thinking" indicator. Lime "START GAME ▶" CTA at bottom with lime drop-glow. "?" FAB in glass pill bottom-right. Genuinely looks like a premium card-room product at this scale. This screen proves the direction can work when the stacking bug doesn't apply.

### 04 — Bidding, your turn
**Broken.** No bidding panel is visible. What renders: "Quit / Issue" top-right glass ghost buttons; then a long **vertical column of dark tiles down the page center** — each is a violet-tinted mini card-back — intermixed with a "Bot 2" pill, a small "Praveen t1" pill, a brass-underlined "Praveen (you)" pill, another small "Praveen" pill with a card-back pair, and finally, at the very bottom, the player's actual hand as a fan (readable: 2♠ 9♠ A♠ 3♥ 5♥ 9♥ J♥ A♥ 2♣ 5♣ 10♣ J♣ A♦).

Per the Late-Night spec, the frame should show: glass-E2 bidding panel pinned above the hand, suit selector with one suit auto-selected, a violet slider stepper, and an enabled lime "CONFIRM BID ♥10" CTA. None of that renders here. The bidding panel's absolute positioning (`class="absolute left-1/2 ..."` in `GameBoard.vue` line 482) is being neutralized by the `.aurora-bg > * { position: relative }` rule, so the panel collapses into the middle column with everything else.

**Likely code-level cause (high confidence):** `.aurora-bg > * { position: relative; z-index: 1; }` at `agent-ad068d46/client/src/style.css:94-97` has specificity (0,1,1), beating Tailwind's `.absolute { position: absolute }` (0,1,0). Every seat, the trick area, the bidding panel, the partner-hand-fan container, the score strip — each of them uses `class="absolute …"` as a direct child of `.aurora-bg` (line 244 of GameBoard.vue) — all get flattened into normal flow and stack top-down. The `::before` pseudo escapes the rule (it's not a direct child in the `> *` sense), so only the aurora gradient keeps rendering correctly behind the stack.

### 05 — Bidding, partner gave support
**Partially broken.** The bidding panel actually renders here — a glass-E2 drawer at the bottom showing "BIDDING" header, "Your turn to bid" prompt, "Asked · Pass" two-button row, "Bot 2: Minor" chip, "OR BID" divider with four suit tiles (spade selected with violet fill + lime inner ring — spec's auto-select working), a violet progress-track stepper below showing "10", and a lime CTA "CONFIRM BID ♠10" with lime glow.

The rest of the board above the drawer is still ruined: the player's hand (2♠ 9♠ A♠ 3♥ 5♥ 9♥ J♥ A♥ 2♣ 5♣ 10♣ J♦ A) sits **at the top of the frame** instead of the bottom, and the column of tiles continues down to where the drawer begins. So the drawer rendered correctly because it has `position: absolute` inside a parent that's *inside* a child of `.aurora-bg` — `BiddingPanel.vue` mounts from `GameBoard.vue` wrapped in a `<div class="absolute ...">` that gets flattened, but the panel's own internal elements don't. Net result: the bidder CAN see the panel but the board context above them is incomprehensible.

### 06 — Bidding, suit selected
Same as 05 but heart is selected (violet fill + lime inner ring). CTA shows "CONFIRM BID ♥10". Confirms the auto-select behaviour advances from spade (05) to heart (06) when the capture clicks the heart tile. The bidding panel looks clean in isolation. Everything said about 05's board context still applies.

### 07 — Partner reveal
Broken. Should show a theatrical full-screen moment with Bot 2's 13 cards cascading face-up and a "You bid 10 — increase?" glass strip. Instead we see: the flattened column of tiles; a small "Praveen t1" pill in mid-frame; a brass-outlined "Praveen (you)" pill; another "Praveen" pill with 2 card-back minis below; and the hand at the very bottom (2♠ 9♠ A♠ 3♥ 5♥ 9♥ J♥ A♥ 2♣ 5♣ 10♣ J♦ A). No partner reveal panel, no increase-bid stepper, no "Start play" CTA. The partner's 13 cards *are* somewhere in the mess of tiles but they're rendered as narrow dark rectangles, not a fan of card faces.

### 08 — Playing, your turn
Partially useful. Top shows "BOT 2'S HAND" label with a small face-up fan (7 8 0 Q K 4 7 8 1 0 9 J Q — some legible, some not, the card scaling is tight). Below that, the column of tiles runs down. A "Praveen t1" pill, then a brass-outlined "Praveen (you)" pill, then the left-column action stack: "+ TRAM" (glass violet button), "Dhaap!" (violet-to-red gradient pill), "Your turn" (lime pill). Hand at very bottom (2♠ 9♠ A♠ 3♥ 5♥ 9♥ A♦? 0♦? J♦ — cards look glowing with lime halo, consistent with playable affordance).

The center of the board — where the trick should appear — is the vertical column of card-back tiles. A player cannot tell whose turn it is except via the "Your turn" pill, cannot see where cards have been played, cannot see which seat is active. This is unplayable.

### 09 — Help modal
**This one works.** Full-height slide-over glass panel from the right with lime "OVERVIEW", "BIDDING", "BID 10+", "PLAYING TRICKS", "SCORING" section heads (lime because spec calls for lime accent underline on section headers). Body text in light-cyan-ish, rules listed as bullets. Close ✕ top-right. Readable and well-composed. Matches spec §6 HelpOverlay treatment. This works because `HelpOverlay.vue` Teleport-to-body renders outside `.aurora-bg`, so the `> *` rule doesn't apply to it.

### 10 — Report Issue (CLAIMED)
Capture failure — shows the playing board (glass info strip "TRUMP ♥ YOU 0/10 FOE 0/4 👑"), a "Minor" chip, "Bot 2" pill, empty trick circles, "BOT 2'S HAND" fan (7 8 0 Q K 4 7 8 1 0 9 J Q), and the column of tiles below — but no Issue modal. The README already flagged this. `IssueReportOverlay.vue` exists and Teleports to body so it would render correctly if the script actually opened it.

### 11 — Give Up confirmation (CLAIMED)
Capture failure — visually near-identical to 10 (MD5 differs by tiny amounts, likely a subpixel glass render), no Give Up confirm dialog visible. The give-up-confirm is inline in `GameBoard.vue` at z-30 with its own scrim, so it would have rendered if opened.

### 12 — Round summary (CLAIMED)
Capture failure — shows the top strip with "FOE 13/4 👑 20" (round 1 completed, opponents took all 13 tricks, dealer score is now 20), plus column of tiles, plus a "Praveen (you) 20" seat pill at bottom. But the `RoundSummary` modal itself didn't render. Of the capture failures, this is the most interesting artifact because it shows the game DID transition to scoring — the capture just snapped a frame after the modal was dismissed, not while it was open.

---

## Cross-screen issues per direction

### Minimal

- **The player's own hand is invisible on bidding screens 04/05/06.** Regression from the current UI, which shows the fanned hand at the bottom even during bidding. The Paper spec explicitly wanted the bidding drawer to sit *above* the hand ("anchor to the bottom third above the hand, no scrim, no shadow"). The drawer is now *instead of* the hand. See the ASCII mock in `01-minimal.md` §6 "Bidding (my turn)" — the hand row was supposed to remain at the bottom.
- **Bid history string bug:** "Bot 1passed" / "Bot 2passed" / "Bot 3passed" (missing space between name and "passed"). Consistent across 04 and 05. Likely a template string in the minimal branch's `BiddingPanel.vue` that dropped a space when the spec's chip bubbles collapsed into a single line of plain text.
- **Capture 08–12 is a single frame re-saved.** The minimal branch's Help / Issue / Give-Up / RoundSummary components were never triggered. This is not a design defect but **the review cannot assess those four states** until the capture script is fixed and re-run.

### Modern

- **`.aurora-bg > * { position: relative; z-index: 1; }` breaks every gameplay screen.** This one CSS rule is the root cause of the vertical-column collapse on 04, 07, 08, 10, 11, 12. Removing that rule (or replacing it with `.aurora-bg > *:not(.absolute) { position: relative; z-index: 1; }`, or raising specificity of the direct-child positioning) would almost certainly un-break the trick area, the 4 seat pills, the partner hand fan, and the floating score strip in one stroke. **This is the single most important fix.**
- **Card-back tiles are too small and too similar to read.** Even on frames where the layout is intact (modern 10/11, where you can see the "BOT 2'S HAND" fan), individual cards are narrow and the rank/suit corners compress — at 56×80 scale the Space Grotesk numerals fight with the PNG's native rank. The spec's "subtle 1° per card arc fan" wasn't implemented either.
- **Spec fidelity deviations, modern-specific:**
  - Spec §4 said primary CTAs get a lime drop-glow; that renders on 01, 02, 03 — good.
  - Spec §6 BiddingPanel said "slider-style stepper — a violet track with a lime dot handle, labels 10/11/12/13"; captured 05/06 show what looks more like a thin violet progress bar with a numeric "10" — functional but doesn't read as a slider.
  - Spec §6 "Partner reveal · full-screen theatrical moment" is completely absent from 07 — no cascade, no violet sweep, no dim.
  - Spec §6 "Trump glyph becomes a 60% opacity, 200px, softly-pulsing" — visible at the very top of 10/11/12 as a large violet heart silhouette; that *does* work.
  - Spec §6 Info Bar "thin glass strip floating 8px inset from the top edge with 16px radius" — on 10/11/12 this renders correctly, reading "TRUMP ♥ YOU 0/10 FOE 0/4 👑 N". Good.

---

## Spec fidelity check

### Paper / minimal
- Palette: faithful. Near-black canvas, single brass accent, dim secondary text, muted red used only on destructive affordances (invisible in captures since 11 failed).
- Typography: Inter-like sans across the board, letter-spaced wordmark + labels, numeric "779"/"490" room codes in the promised Space-Grotesk-lite weight.
- Shadows: none — good.
- Borders: 1px hairlines — good.
- CTA treatment: surface + accent underline — implemented.
- **Deviations:**
  - Create/Start buttons retain a slate-tinted pill background that the spec wanted removed (spec: "no pill border — just a 1px line bottom rule").
  - Player's hand missing from bidding drawer screens (biggest functional regression).
  - Bid history "Bot Npassed" typo.
- **Not assessable:** help modal, issue modal, give-up confirm, round summary — capture failure.

### Late-Night / modern
- Palette: faithful to the dossier. Void/aurora/violet/cyan/coral/amber/lime all show up somewhere.
- Typography: Space Grotesk wordmark and numerics render (visibly the "959" room code on 03). Inter body. Good.
- Glassmorphism E1/E2/E3: panels visibly use blur + inset top highlight (see lobby alpha chip, bidding panel in 05/06, help panel in 09, bot-count sheet in 02).
- Lime CTA: renders with the correct drop-glow on 01 CREATE ROOM, 02 START ROOM, 03 START GAME, 05 CONFIRM BID.
- Trump watermark: visible on 10/11/12.
- Floating info strip: visible on 10/11/12 and is actually the best piece of modern UI in the captures — matches spec.
- **Deviations that matter:**
  - Table itself (seats + trick + partner hand) is broken by the aurora-bg stacking rule on 04, 07, 08, 10, 11, 12. Every frame where you need to see the game state as a player, you can't.
  - Partner reveal's "theatrical moment" is completely missing on 07 — just the broken stacked column.
  - Bidding panel never appears on 04 (the primary "act" state for the bidder).
  - Bid stepper is not the violet-track/lime-dot slider the spec wanted.
- **Not assessable:** issue modal, give-up confirm, round summary modal — capture failure (10, 11, 12). Help modal (09) is the only overlay that DID capture, and it looks good.

---

## What I'd re-screenshot vs what I'd re-build

### Capture script only (no code changes needed, just re-run)

These branches already contain the components; the script just didn't reach them.

- **Minimal 09** — HelpOverlay. Re-trigger: click the `?` FAB or whatever the minimal branch uses (spec moved it to the overflow menu — script may need to open the overflow first).
- **Minimal 10** — IssueReportOverlay. Re-trigger: open overflow, click "Report an issue".
- **Minimal 11** — Give Up confirm. Re-trigger during playing phase.
- **Minimal 12** — RoundSummary. Needs the Give Up confirm to succeed first; the capture script's chain broke at 11, so 12 fell through.
- **Modern 10** — IssueReportOverlay (README flagged the greedy match). Fix selector to exact "Issue" label.
- **Modern 11** — Give Up confirm.
- **Modern 12** — RoundSummary. Same chain issue as minimal.

### Code fix required on the branch (then re-screenshot)

- **Modern `style.css:94-97`** — remove or scope `.aurora-bg > * { position: relative; z-index: 1; }`. This is the single line that ruins the modern table. Suggested replacement: move the rule to `.aurora-bg > *:not([style*="position:absolute"]):not(.absolute)` or restructure so absolutely-positioned children sit inside a relatively-positioned wrapper rather than direct children of `.aurora-bg`. High confidence this one fix resolves 04 / 07 / 08 / 10 / 11 / 12 layout collapse.
- **Modern 04 bidding panel visibility** — will likely fix itself once the above rule is removed, because the panel's absolute positioning will take effect. If not, check `GameBoard.vue:482` for any additional specificity issue.
- **Minimal bidding screens (04/05/06)** — the player's own hand must remain visible at the bottom. Current implementation is hiding it behind the drawer or the drawer is filling its vertical slot. Decide between (a) drawer above hand (spec intent), or (b) drawer displacing hand (current behavior) — if (a) is chosen, shrink the drawer vertically or move the hand into a taller z-index.
- **Minimal bid-history typo** — add the missing space in whatever template renders "Bot {n}passed".
- **Minimal CTA chrome** — consider stripping the slate-tinted pill around Create Room / Start Game / Start Play / Next Round. Spec wants bare surface + accent underline. Low priority but reinforces the Paper direction.
- **Modern card legibility** — even after the stacking fix, the trick cards and partner-hand cards are small enough that Space Grotesk + the PNG's native rank glyph compete visually. Consider either (a) bumping card size by ~15% on the trick area, or (b) letting Card.vue's native rank show without overlaying UI labels.
- **Modern partner reveal theatrics** — the cascade-flip animation and violet sweep from the spec aren't implemented on `agent-ad068d46`. Re-screenshotting 07 after the stacking fix will still give a plain reveal, not the theatrical one.

---

*End of review.*
