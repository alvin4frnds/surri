# Surri — Design Direction Decision

**Three directions, twelve captured screens each, one pick to make.** What follows is a rigorous read of what actually renders on each branch today — not a restatement of the specs.

---

## TL;DR

- **Paper** is the quietest app. It's clean, calm, and legible — and on bidding screens (04/05/06) it's hiding your hand, which is a blocker.
- **Late-Night** is the most *product-y* — feels like a 2026 mobile game. It tells the loss story best and has the strongest waiting-room moment.
- **Salon** has the most *personality* — "IO" in Garamond, "*Lost*" in italic, cream-and-brass CTAs. Also has the strongest opening (Lobby + Waiting Room) and the most consistent typographic signature across screens.
- **Same bug on two branches:** Modern and Salon both render opponent hands as broken vertical columns on the playing board (5 screens on Modern, 7 on Salon). This is a code issue, not a design decision.
- **Pick: Salon, narrowly**, if the app's goal is warmth and character. Pick Late-Night if the goal is modern-mobile-game polish. Paper isn't ready to ship as-is.

---

## Direction cards

### Paper — *minimal, typographic, monastic*

One-line essence: a dark sheet of paper with the cards doing all the work.

Mood keywords: calm, literary, monochrome, disciplined, spare, nocturnal.

Palette: bg `#0E1116` · surface `#171B22` · ink `#ECEEF2` · ink-dim `#8A919C` · accent *brass* `#C9A24B` · danger `#C7463C`. Typography: Inter only, size-and-weight-only hierarchy, tracked caps for labels and the wordmark.

Strengths:
1. **Lobby and waiting room are beautifully restrained.** "854" as a giant letter-spaced number on a flat dark canvas, with "Copy · Share" as plain text buttons, is the best pure-typography moment in any of the three directions.
2. **Round summary is the most analytical.** A 13-segment strip at the top of the modal immediately shows "where did the 13 tricks go" — a data viz Paper invents that neither Modern nor Salon attempt.
3. **Brass as the single accent works.** One hue carries "your turn", "selected", "dealer dot", CTA underline. The discipline shows.

Weaknesses observed in the capture:
1. **Bidding screens 04/05/06 show no hand.** The player deciding a bid literally cannot see their cards. The whole bottom third is blank. Hard blocker.
2. **Help modal (09) renders at ~35% screen size in the upper-left corner.** Viewport bug. Content is correct but the panel is visibly broken.
3. **No "your turn" caption on 08.** The spec's italic "your turn" inline cue isn't present — just a brass-underlined name. Readable but quieter than intended.

Effort to ship: fix the missing-hand regression on bidding screens (small), fix the Help sizing (small), add the italic "your turn" caption on playing state. Half-day to one day.

### Late-Night — *modern mobile game, aurora + lime*

One-line essence: a 2026 premium mobile game rendered in violet-black glass with one electric-lime CTA.

Mood keywords: theatrical, energetic, glassy, confident, premium, saturated.

Palette: `--bg-void #07070F` with aurora gradient to `--bg-aurora-top #1B1140` · glass `rgba(22,24,44,0.72)` · accent-lime `#C3FF3A` · accent-violet `#7A5CFF` · danger `#FF4F6D`. Typography: Space Grotesk (wordmark + numerals), Inter (body).

Strengths:
1. **Waiting Room (03) is the best single screen in any direction.** Giant lime "3 2 3", violet-ringed bots with animated "thinking" 3-dot indicators, big lime "START GAME ▶". Feels like a product trailer.
2. **Round summary (12) tells the loss story most decisively.** Red-to-violet gradient header "ROUND LOST" + "X YOU LOST / Bid failed" + overflowing red progress bar for "Bot 1 + Bot 3 13/4" + "+20" red chip + big lime "NEXT ROUND". You know exactly what happened.
3. **The lime-on-violet pairing is genuinely distinctive.** It's not a trend-follower palette — it's a commitment. CTAs glow. The app has a *signature*.

Weaknesses observed in the capture:
1. **Opponent seats on 08/10/11/12 render as vertical columns of violet-outlined squares.** These do not read as "card-back stacks" — they read as broken grids. Appears on 5 of 12 frames.
2. **Bidding screens 04 and 05 are visually identical.** The support-ask state transition didn't capture. Not fatal, but wasteful — two frames show the same thing.
3. **Partner reveal (07) lacks its theatrics.** Spec calls for a violet gradient sweep + cascade flip. The still just shows the modal over a compressed partner hand; no cinematic moment survives into the capture.

Effort to ship: fix opponent-seat rendering on the playing board (medium — likely a component-reuse issue), re-record the 04→05 transition in the capture flow, assess whether the animated reveal choreography reads on a still or needs a live demo. One to two days.

### Salon — *warm, serif, parlour*

One-line essence: a private library lit by a single lamp, with "Surri·" in Garamond on cream.

Mood keywords: warm, literary, hospitable, opaque, classical, dignified.

Palette: cream `#F4EBDA` · paper `#FBF4E6` · vellum `#ECDFC5` · ink `#2B2118` · brass `#A8813A` · brass-deep `#7A5C23` · bottle green `#30563F` · burgundy `#7A2230`. Typography: Cormorant Garamond (wordmark + display numerals + outcome headlines in italic), Inter (UI/body).

Strengths:
1. **The Lobby (01) and Waiting Room (03) are immediately different from any card-game app in the App Store.** "Surri·" in Cormorant italic on cream with a brass `·`, "A PARLOUR CARD GAME" tagline, "2 0 2" in Cormorant oldstyle inside a double-rule vellum plinth — this is design with conviction.
2. **Oldstyle numerals are the signature.** "IO" on the bid stepper (4, 5, 6), "IO" on the partner-reveal stepper (7), "0 → 2O" on the score delta (12) — the same typographic gesture reappears across every numeric moment. No other direction has a unifying display motif this consistent.
3. **The palette is brave.** Light-first on a mobile card game is risky; committing to brass-and-burgundy instead of colour-coded team pills is riskier. Both pay off — the app looks *inhabited*.

Weaknesses observed in the capture:
1. **Opponent seats render as broken vertical columns on 04/05/06/07/08/10/11/12 — 7 of 12 frames.** The bug is more visually jarring here than on Modern because the cream background makes every rectangle pop. This is the biggest single liability across the set.
2. **Playing state (08) has no visible playable-card affordance on the hand.** Spec calls for a 2px bottle-green bottom border on playable cards; no such border renders. The trick area is empty cream; the player has no cue which cards are legal to play.
3. **Round summary (12) is elegant but undersells loss.** "*Lost*" in Cormorant italic burgundy is beautiful — but on a cream canvas, the same composition reads like "Match complete" rather than "you just dropped 20 points." Modern's treatment communicates more urgency.

Effort to ship: fix the opponent-hand rendering (same bug as Modern — fix once, applies to both), wire the playable-card affordance on PlayerHand, potentially strengthen the loss-state treatment on 12 (a burgundy rule under the outcome, or a burgundy glyph). One to two days.

---

## Side-by-side screen grid

| # | Paper | Late-Night | Salon |
|---|---|---|---|
| 01-lobby | ![](screenshots/minimal/01-lobby.png) | ![](screenshots/modern/01-lobby.png) | ![](screenshots/salon/01-lobby.png) |
| &nbsp; | Clean tracked-caps wordmark; brass underline on Create room. | Lime S+I, lime CTA with glow; alpha chip wraps to 3 lines. | Garamond "Surri·", brass-plate CTA — the most distinctive opener. |
| 02-bot-count | ![](screenshots/minimal/02-bot-count.png) | ![](screenshots/modern/02-bot-count.png) | ![](screenshots/salon/02-bot-count.png) |
| &nbsp; | Four digits on a hairline, brass "2" underlined — minimal win. | Glass sheet, violet handle, lime-filled 2 with dark text. | Paper sheet, Cormorant oldstyle "0 1 2 3", brass-framed 2. |
| 03-waiting-room | ![](screenshots/minimal/03-waiting-room.png) | ![](screenshots/modern/03-waiting-room.png) | ![](screenshots/salon/03-waiting-room.png) |
| &nbsp; | "854" pure type, hairlines between bot rows — very clean. | Best screen in the set: giant lime code + bot "thinking" dots. | Double-rule vellum plinth with Cormorant "2 0 2" — literary. |
| 04-bidding-your-turn | ![](screenshots/minimal/04-bidding-your-turn.png) | ![](screenshots/modern/04-bidding-your-turn.png) | ![](screenshots/salon/04-bidding-your-turn.png) |
| &nbsp; | **No hand visible.** Whole bottom third blank. Blocker. | Dense but complete; lime CONFIRM BID ♠10 commanding. | "IO" in Cormorant is the bid-screen moment; broken side columns visible. |
| 05-bidding-support | ![](screenshots/minimal/05-bidding-support.png) | ![](screenshots/modern/05-bidding-support.png) | ![](screenshots/salon/05-bidding-support.png) |
| &nbsp; | "Asked" + "Bot 2 says **Minor**" — state captured. | Identical to 04 — state transition didn't capture. | "Asked" + "Bot 2 says: **Minor**" (brass Minor) — clean. |
| 06-bidding-suit-selected | ![](screenshots/minimal/06-bidding-suit-selected.png) | ![](screenshots/modern/06-bidding-suit-selected.png) | ![](screenshots/salon/06-bidding-suit-selected.png) |
| &nbsp; | Heart brass-underlined; "Confirm ♥10" enabled. | Heart lime-ringed; "CONFIRM BID ♥10" big lime CTA. | Heart brass-underlined; "CONFIRM BID ♥10" filled brass-deep. |
| 07-partner-reveal | ![](screenshots/minimal/07-partner-reveal.png) | ![](screenshots/modern/07-partner-reveal.png) | ![](screenshots/salon/07-partner-reveal.png) |
| &nbsp; | Partner's hand rendered largest and most readable. | Compressed partner hand; broken side columns. | Italic "*Partner revealed*" headline — most ceremonial. |
| 08-playing-your-turn | ![](screenshots/minimal/08-playing-your-turn.png) | ![](screenshots/modern/08-playing-your-turn.png) | ![](screenshots/salon/08-playing-your-turn.png) |
| &nbsp; | Hand visible with brass-underline playable cards. TRAM/DHAAP as text. | Trump watermark huge; broken side columns; lime halos on playable cards. | Italic "*your turn*" caption; broken side columns; no playable affordance rendered. |
| 09-help-modal | ![](screenshots/minimal/09-help-modal.png) | ![](screenshots/modern/09-help-modal.png) | ![](screenshots/salon/09-help-modal.png) |
| &nbsp; | **Renders at ~35% size upper-left.** Viewport bug. | Full right-sheet; lime section heads; violet code chips. | Paper panel; italic "*How to Play Surri*"; salon-rule dividers. |
| 10-report-issue | ![](screenshots/minimal/10-report-issue.png) | ![](screenshots/modern/10-report-issue.png) | ![](screenshots/salon/10-report-issue.png) |
| &nbsp; | Brass "REPORT ISSUE" label; text Cancel / Submit. | Glass modal; violet-framed thumbnail; violet Submit. | "*Report Issue*" italic; warm ink scrim — best modal chrome. |
| 11-give-up-confirm | ![](screenshots/minimal/11-give-up-confirm.png) | ![](screenshots/modern/11-give-up-confirm.png) | ![](screenshots/salon/11-give-up-confirm.png) |
| &nbsp; | Compact; "Give up" as red text on surface — spec-correct. | Glass card with ⚠ icon; red-fill "Give Up". | Paper card; burgundy-fill "Give Up" cream text — most dignified. |
| 12-round-summary | ![](screenshots/minimal/12-round-summary.png) | ![](screenshots/modern/12-round-summary.png) | ![](screenshots/salon/12-round-summary.png) |
| &nbsp; | 13-segment strip + "40 → 20 · −20 green" — most analytical. | Gradient header + "X YOU LOST / Bid failed" — **best loss story**. | Italic "*Lost*" + "0 → 2O" in Cormorant — most elegant, least urgent. |

---

## Deep dives on the three hero screens

### Lobby (01)

![](screenshots/minimal/01-lobby.png)
![](screenshots/modern/01-lobby.png)
![](screenshots/salon/01-lobby.png)

Three different answers to "what kind of game is this." Paper's "SURRI" in tracked caps on black reads as "serious — a tournament tool." Modern's "S U R R I" with the S and I lit in lime on aurora-violet reads as "premium — a 2026 mobile game." Salon's "Surri·" in Cormorant italic on cream, with "A PARLOUR CARD GAME" underneath, reads as "warm — sit down and play." The difference isn't polish — all three are polished. It's positioning. Paper's CTA "Create room" underlined in brass is quiet; you have to find it. Modern's "CREATE ROOM ▶" is a lime glowing plate — unmissable. Salon's brass-deep filled button with cream text looks like a plate of leather-pressed brass on a book — literal "click here to enter the club." The one execution detail that hurts Modern: the "· ALPHA · TAP FEEDBACK TO HELP" chip wraps to three lines awkwardly in the top-right corner. Paper and Salon both handle the alpha message as a single line of quiet text and look cleaner for it.

### Bidding your turn (04)

![](screenshots/minimal/04-bidding-your-turn.png)
![](screenshots/modern/04-bidding-your-turn.png)
![](screenshots/salon/04-bidding-your-turn.png)

This is the screen where Paper actively fails: the player is being asked to place a bid and cannot see their own hand. The entire bottom two-thirds of the frame is black. In Modern, the entire hand fan (6♣ 2♣ K♣ 2♠ 5♠ 6♠ J♠ K♠ A♠ 9♥ Q♥) is visible beneath the bidding glass panel, and the lime "CONFIRM BID ♠10" is the single strong read. In Salon, the hand is visible (Q♠ 3♥ Q♥ 2♣ 4♣ 5♣ 6♣ 10♣ J♣ Q♣ K♣ 4♦ J♦), and the bid stepper shows "IO" — ten rendered in Cormorant oldstyle — which is genuinely memorable as a typographic choice. Salon and Modern are both ruined slightly by the broken vertical-column opponent rendering on either side, but Salon's version is at least partially hidden behind the modal. The right way to rank these: Paper is broken; Modern is functional and bold; Salon is functional and has the single most distinctive numeric treatment in the set. Salon wins on character; Modern wins on command (the lime CTA pulls harder).

### Round summary — Lost (12)

![](screenshots/minimal/12-round-summary.png)
![](screenshots/modern/12-round-summary.png)
![](screenshots/salon/12-round-summary.png)

All three handle this well, and each one tells a different story. Paper opens with "ROUND LOST" in a muted red, then a 13-segment strip showing *all white bars* (opponents took every trick) — this is the most information-dense treatment; you immediately see the round shape. Modern opens with a red-to-violet gradient header "ROUND LOST" and an explicit "X YOU LOST / Bid failed" tagline, pairs it with the clearest team progress bar (Bot 1 + Bot 3's bar fills past "13/4" in solid red), and closes with a big lime "NEXT ROUND". This is the best storytelling — a beginner would understand what just happened from this screen alone. Salon renders "· ROUND ·" in brass, then "*Lost*" as large Cormorant italic burgundy — an understated *verdict*, not an event. The "0 → 2O" in the double-rule vellum well is the most beautiful numeric moment in any of the three captures. But: Salon treats a lost round the same way a library treats a book being returned — classically. Modern treats it as a *moment* where something went wrong. For a game people learn by losing, Modern's urgency reads better. For a game people play over tea, Salon's does.

---

## When to pick which

**Pick Paper if** the audience is players who want the game to get out of the way. This is the direction for someone who'll play 200 rounds and wants the interface to be invisible. It's also the cheapest to maintain — one accent colour, one typeface, simple component primitives. The bidding-screen regression needs to be fixed before ship, but once fixed, Paper is the most resilient direction against future scope creep.

**Pick Late-Night if** the goal is to look like a 2026 premium mobile game in the App Store alongside other card apps. This direction photographs the best in a screenshot carousel, has the strongest first-time-user waiting-room moment, and tells the loss/win story with the most urgency. It's the direction most likely to generate a "that looks cool" reaction from a friend over your shoulder. Budget for the broken-column opponent bug and the motion work (cascade flips, confetti, count-ups) to actually earn the "premium" label.

**Pick Salon if** the goal is a game that has a *voice* — something that feels different from every other mobile card app. This is the direction with the strongest typographic identity (Cormorant oldstyle numerals across every display moment), the warmest lobby, and the most literary outcome screens. The effort cost is similar to Late-Night, but the payoff is uniqueness rather than polish. Risk: on loss-heavy screens the aesthetic can underplay urgency. Worth it for most audiences who aren't pro Spades tournament players.

---

## Residual issues to fix before any direction ships

**Independent of design choice** — these are implementation bugs that exist on specific branches:

1. **Opponent hand rendering as broken vertical columns** on the playing board. Affects Modern (5 screens: 07, 08, 10, 11, 12) and Salon (7 screens: 04, 05, 06, 07, 08, 10, 11, 12). One component fix, likely in `PlayerArea.vue` or the opponent-hand mini-stack renderer, that applies to both branches. This is the single biggest visual problem across the capture set.
2. **Paper bidding screens 04/05/06 missing the player's own hand.** Same component used for 08 works; the bidding panel mounting in 04/05/06 appears to be covering or replacing the hand container. Pre-existing regression called out in 05-verify and still unfixed on the `design/minimal` branch.
3. **Paper help modal 09 rendering at ~35% screen size in upper-left.** Viewport/sizing bug on Capacitor WebView or a missing `h-screen`/`w-screen` on the modal root.
4. **Modern 04 → 05 state transition didn't capture.** The support-ask flow never fires in the capture script, so both screens render the same pre-ask state. Non-critical (the state itself exists elsewhere) but the capture set is wasting a frame.
5. **Salon 08 playable-card affordance not wired.** No visible bottle-green bottom border on legal-to-play cards. Either the trick hasn't started in this frame or the affordance logic hasn't shipped. Worth verifying on a trick-in-progress capture.
6. **Modern 07 partner-reveal theatrics absent.** Spec calls for a violet cascade flip. Still captures cannot show motion, but if this moment is a selling point, record a video or a GIF.

---

## Closing note

None of the three directions have a state where the game *can't be played* — all twelve states across all three directions are functional. The decision is about voice, not capability. My honest read: **Salon, narrowly, over Late-Night**, because "Surri·" in Cormorant with brass-plate CTAs and "IO" in oldstyle is a design with a point of view, and point-of-view designs age better than trend-forward designs. But if the audience skew is young-and-mobile-first, Late-Night will perform better in the store.

Paper is the safest choice; it's not the best choice.
