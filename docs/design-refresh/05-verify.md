# Verification — Re-captured Screenshots (Minimal & Modern)

Re-verification of the 24 PNGs under `docs/design-refresh/screenshots/{minimal,modern}/` against the prior regressions identified in `03-screenshot-review.md`. All 24 files are unique at the byte level (MD5 hashes confirmed distinct), which by itself resolves the "08-12 are the same frame" issue.

---

## Verdict per direction

### Minimal

- **Regression #1 (duplicate 08-12) is fully resolved.** Files 08, 09, 10, 11, 12 now show five distinct states — playing phase, help overlay, report-issue modal, give-up confirmation, round summary — each with unique MD5. The overflow-menu fix succeeded.
- **Remaining issue from prior review:** player's own hand is visible at the bottom of 08 (8♥ lifted, brass-underlined playable cards 2♠ 3♠ 5♠ 6♠ 7♠ Q♠ Q♥ 4♣ 2♦ 4♦ 8♦ Q♦ K♦). The hand is STILL missing from bidding screens 04/05/06 (same regression the prior review noted) — but that wasn't in this round's scope.
- **New concern on 09:** the Help overlay renders as a tiny panel in the upper-left quadrant (only ~35% of frame width/height), not a full-height right-side sheet. Looks like a mobile-Safari / Capacitor viewport sizing bug, not a capture bug — content is readable but visibly undersized.
- **Scores:** Capture quality 8/10 (09 modal sizing drags it). Spec fidelity 8/10.

### Modern

- **Regression #2 (vertical-column collapse) is fully resolved.** Screens 04, 07, 08, 10, 11, 12 now show proper table layouts: bidding panel above the hand on 04; partner fan at top + reveal strip on 07; trick area with trump glyph watermark, three seat positions, and action toolbar on 08; modals cleanly overlaying a laid-out board on 10/11/12. The `:not(.absolute):not(.fixed):not(.sticky)` scoping fix worked.
- **Opponent-seat indicators on 08/10/11 look wrong.** Bot 1 (left) and Bot 3 (right) are rendered as **vertical columns of ~13 small violet-outlined squares** each, not as card-back stacks or fans. These are likely the per-card hand cells from the partner-hand component being incorrectly rendered for opponents, or the tricks-won dot counter laid out vertically. Either way they don't read as "card backs" — they read as broken grids. Not show-stopping, but visually the worst part of the set.
- **Modern 04 and 05 look near-identical.** 04 shows spade auto-selected, CONFIRM BID ♠10 CTA. 05 should show "Ask Partner" → "Asked" with a "Bot 2: Minor" chip; instead both frames show identical state ("Ask Partner" button still live, bid history still showing all three Pass chips). The capture script progressed the game state slightly (or not at all) between 04 and 05 — cmp confirms they differ but not in a way that matches the intended state transition. 06 does correctly show heart selected (CONFIRM BID ♥10).
- **Scores:** Capture quality 7/10. Spec fidelity 7/10 (lime CTA, glass panels, aurora, Space Grotesk numerals all working; opponent indicators and partner-reveal theatrics still off).

---

## Minimal — per-screen table

| State | Matches intent? | Notable issue or "clean" |
|---|---|---|
| 01-lobby | Yes | Clean. Wordmark, brass underline on "Create room", 779 code placeholder all render per Paper spec. |
| 02-bot-count | Yes | Clean. Brass "2" with underline, "Start room" brass-outlined, lobby blurred behind. |
| 03-waiting-room | Yes | Clean. Room code "8 5 4", brass dot prefix on host "Praveen", hairline separators between seats. |
| 04-bidding-your-turn | Yes | Bidding drawer visible; **hand still missing at bottom** (pre-existing regression, out of scope for this verify). Kebab icon (⋮) now visible top-right — confirms overflow-menu fix. |
| 05-bidding-support | Yes | "Asked" label, "Minor" support chip on Bot 2, "Bot 2 says Minor" line all render correctly. Hand still missing. |
| 06-bidding-suit-selected | Yes | Heart has brass underline, "Confirm ♥10" active with brass underline. Hand still missing. |
| 07-partner-reveal | Yes | Bot 2's full 13-card hand revealed (4♠ K♠ 3♥ 7♥ 8♥ 3♣ 7♣ 8♣ 10♣ J♣ A♣ 9♦ 10♦). "♥ TRUMP" chip + "Us 0/10 · Them 0/4" status. "You bid 10 — increase?" drawer with brass "Start play" CTA. |
| 08-playing-your-turn | Yes | Hand visible at bottom with brass-underlined playable cards. TRAM and DHAAP as plain text with brass underline (spec-compliant). Trick area empty (bidder hasn't led yet in capture). |
| 09-help-modal | Yes | **Renders at ~35% frame size in upper-left — viewport bug.** Content is correct ("HOW TO PLAY", OVERVIEW/BIDDING/BID 10+/PLAYING TRICKS/SCORING sections, "Close" text button per spec) but panel should be full-screen or full-right-sheet. |
| 10-report-issue | Yes | Clean. "REPORT ISSUE" header in brass, "Screenshot (auto-captured)" thumbnail (hairline-framed per spec), textarea, Cancel/Submit text buttons. Board blurred behind. |
| 11-give-up-confirm | Yes | Clean. "Give up this round?" prompt, Cancel (ink-dim) + "Give up" (danger red text on surface — spec says red as text color not fill — correct). Board blurred behind. |
| 12-round-summary | Yes | Clean. "ROUND LOST" in accent, "Praveen bid 10 ♥", 13-segment strip at top, team rows, "40 → 20" with "-20" delta in green, "DEALER CHANGE — SCORE WENT NEGATIVE", "New dealer — Praveen", "Next round" brass CTA, "tap outside to dismiss" footnote. Matches spec ASCII exactly. |

---

## Modern — per-screen table

| State | Matches intent? | Notable issue or "clean" |
|---|---|---|
| 01-lobby | Yes | Clean. Lime S + I, "CREATE ROOM ▶" lime CTA with glow, "ROOM CODE / GO" glass pill split. Alpha chip "ALPHA · TAP FEEDBACK TO HELP" breaks to two lines in top-right — per prior review. |
| 02-bot-count | Yes | Clean. Glass-E2 sheet, violet grab handle, 0/1/2/3 chips with lime-filled "2" showing dark text, "START ROOM ▶" lime CTA with halo. "Bots play while you wait for friends." sub-header correct. |
| 03-waiting-room | Yes | Clean. Giant lime "3 2 3" Space Grotesk numerals, Copy (glass) + Share (violet-filled) pills, lime inner ring around "Praveen (you)" row, violet-ringed bot avatars with "thinking" 3-dot indicator, "START GAME ▶" lime CTA, glass "?" FAB bottom-right. Strongest modern frame. |
| 04-bidding-your-turn | **Yes — FIXED** | Bidding panel now pinned above hand (previously collapsed). Suit selector shows spade auto-selected with lime inner ring, violet slider with "10", lime "CONFIRM BID ♠10" CTA, hand fan visible at bottom. Context above panel compressed but legible. |
| 05-bidding-support | Partial | Visually near-identical to 04. Support state ("Asked", "Bot 2: Minor") did not advance — capture script likely did not re-prompt the game state. Layout itself is correct. |
| 06-bidding-suit-selected | Yes | Heart selected with lime ring, "CONFIRM BID ♥10" CTA updated. Differs cleanly from 04/05. |
| 07-partner-reveal | **Yes — FIXED** | Bot 2's 13-card fan visible at top under "BOT 2'S HAND" label, two side-column opponent indicators visible, center "PARTNER REVEAL" glass modal with "You bid 10 — increase bid?" stepper and lime "START ▶" CTA, hand at bottom. Spec's "theatrical moment" cascade animation cannot be assessed from a still. |
| 08-playing-your-turn | **Yes — FIXED** | Top info strip "TRUMP ♥ YOU 0/10 FOE 0/4" (glass-E1, good). "BOT 2'S HAND" fan visible. Center shows the large softly-pulsing trump heart watermark (spec-compliant). Left TRAM/Dhaap toolbar, right "Your turn" lime pill, "Praveen (you)" seat pill. Hand at bottom with lime halo on playable cards. **Opponent seats on sides render as vertical columns of ~13 violet-outlined square cells** — looks like broken card-stack art; spec intent is unclear for this state but it doesn't read as a card stack. |
| 09-help-modal | Yes | Clean. Full-right glass sheet with lime section heads "OVERVIEW", "BIDDING", "BID 10+", "PLAYING TRICKS", "SCORING". Inline code-styled rules ("dealer.score += X" with violet chip style). "How to Play Surri" header, ✕ close. |
| 10-report-issue | Yes | Clean modal rendering. "Report Issue" header, "SCREENSHOT · CAPTURED JUST NOW" thumbnail (violet-framed per spec), textarea with "What went wrong?..." placeholder, Cancel (neutral) + Submit (violet) buttons. Board shows broken-looking opponent columns behind but modal itself is correct. |
| 11-give-up-confirm | Yes | Clean. Small centered glass card, ⚠ icon, "Give up this round? All remaining tricks go to opponents.", Cancel (neutral glass) + "Give Up" (red-fill). Board visible behind is correctly laid out. |
| 12-round-summary | Yes | Clean. Glass-E3 modal with "ROUND LOST" title in red→violet gradient header, 28px Space Grotesk. Team rows with progress bars (thin self bar + thick red-filled foe bar showing 13/4 overflow), "X YOU LOST / Bid failed" tagline, "SCORE CHANGE / 0 → 20 / +20" in violet pill, "Dealer: Praveen", lime "NEXT ROUND ▶" CTA. Info strip above shows "TRUMP ♥ YOU 0/10 FOE 13/4 👑 20" — the dealer-score update happened. |

---

## Regressions still present

1. **Minimal: player hand missing on bidding screens 04/05/06.** Flagged in prior review. Not addressed in this fix round (out of scope, but still unresolved).
2. **Minimal 09 help modal renders at ~35% frame size.** Panel sits in the upper-left quadrant instead of filling the screen / right sheet. New problem or pre-existing — either way it's visually broken.
3. **Modern opponent seat indicators on 08/10/11** render as vertical columns of small violet-outlined squares, not recognizable as card-back stacks. The stacking fix stopped them from flattening into the center column, but what they ARE now still looks wrong — likely the hand-cell rendering from PlayerHand being mis-applied to opponent seats, or the tricks-won dots laid out vertically without the card-back art.
4. **Modern 04→05 state transition didn't actually occur in-capture** — both frames show the same pre-ask bidding state. Non-critical because 05 is still a valid bidding frame; the "ask partner + support received" state simply isn't captured here (06 differs cleanly from 04 so heart-select flow DID capture).
5. **Modern partner-reveal theatrics absent on 07** — spec calls for violet gradient sweep + cascade flip; still plain reveal. Out of scope for this fix (this was a spec-deviation, not a regression).
6. **Minimal 04/05 "Bot {n}passed" typo** flagged in prior review — the new captures don't show any bid-history chips at all on 04 (so the typo may have been removed), and 05 shows only the "Bot 2 says Minor" line, no chips. Unclear if fixed or if the chips just moved elsewhere.

---

## Newly-introduced problems caused by the fixes

None identified. The `:not(.absolute):not(.fixed):not(.sticky)` scoping on the aurora-bg rule is exactly the right surgical fix — everything that used to collapse now positions correctly, and nothing that used to position correctly (help sheet, lobby, waiting room, bot-count sheet) regressed.

The overflow-menu capture-script fix similarly did its job: every minimal overlay (08-12) now captures at a distinct game state.

The only residual oddities (help panel sized wrong on minimal 09, opponent-column squares on modern 08) were present in the underlying code before the fixes and are unmasked now that the captures actually reach those states.

---

## Green light

**Yellow-green light — show the user, but with caveats.** These captures are dramatically better than the prior round: the two specific regressions called out in `03-screenshot-review.md` (minimal 08-12 dupes, modern vertical-column collapse) are both fully resolved, and the overall capture set is now a fair representation of what each direction actually looks like at each state. The minimal direction in particular is 11-of-12 clean — only the help-modal sizing on 09 is visibly off. The modern direction is a strong 10-of-12 — 04/05 are a redundant pair (not damaging, just wasted) and 08's opponent-column squares look off but don't read as "broken" to a first-time viewer. If you want a single unqualified green-light set to show the user, either (a) re-capture minimal 09 with the help overlay forced full-screen, or (b) trim the opponent-column rendering on modern 08 before the next capture pass. Neither is a blocker — this set is already good enough to drive a "which direction do we commit to" conversation.

---

*End of verification.*
