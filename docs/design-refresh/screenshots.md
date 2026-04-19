# Current UI — Screen Inventory

Captured on https://surri.xuresolutions.in (deployed commit `547c16c`), mobile frame 390×844.

Color & style observations overall:
- Dark navy background (≈ slate-900 / `#0b1220`), subtle radial / vignette at corners.
- Primary accent = saturated emerald green (CTAs, self-highlight).
- Red (`#e24d4d`-ish) = dealer / danger / opponent team.
- Blue pill = your team. Orange tags = warnings / dealer change.
- Typography: default sans (system), bold caps for titles, letter-spaced wordmark.
- Components: rounded-2xl cards, pill buttons, heavy reliance on dark slate-800 tiles with slate-700 borders.
- Layout: full-height single column, app-header area at top, hand always anchored bottom; most overlays are modal bottom-sheets or center dialogs.
- Chrome decorations: floating "?" help FAB bottom-right, top-right stack of ghost buttons ("Quit game", "Give Up", "Issue").

---

## 01 — Lobby (initial landing)
Orange alpha-stage banner spans top with 2-line warning text.
Centered wordmark "SURRI" — large, very letter-spaced, pure white — with muted "MULTIPLAYER CARD GAME" subtitle in blue-gray.
Below: a dark-slate name input (pre-filled "Praveen"), big pill-shaped emerald "CREATE ROOM" CTA, "OR" divider, a smaller row of "ROOM CODE" input + dark "GO" button.
"?" FAB bottom-right.

## 02 — Create Room → Bot-count bottom sheet
Lobby dims (not blurred). A slate-900 panel slides up from bottom with rounded top corners.
Label "Bots to fill seats" (white bold). Four square tiles labelled 0, 1, 2, 3 — "2" is pre-selected (filled emerald, others dark slate with muted number).
Large emerald "START ROOM" CTA fills the sheet width.
No explicit dismiss on the sheet — tap outside closes it.

## 03 — Waiting room (host, pre-start)
"← Leave" link top-left.
"ROOM CODE" label, a rounded dark tile with the 3-digit room code (779) in very large letter-spaced white digits, plus "Copy" (dark) and "Share" (bright blue) buttons beside it.
Four player rows stacked vertically, each a dark pill card with an icon (purple person for you, pink robot for bots): "Praveen (you)" (green tag), "Bot 1" / "Bot 2" / "Bot 3".
Centered emerald "START GAME ▶" CTA below the list.

## 04 — Bidding panel (first turn, initial)
Game board behind: opponent (Bot 2) shown top with face-down 13-card fan + seat pill; side opponents as small dark pills (Bot 1 left, Bot 3 right) with face-down stacks.
Self row at bottom: yellow-outlined "Praveen (you)" pill + the full fanned hand showing 13 overlapping cards (white card faces).
Centered modal card "BIDDING": header strip, "Your turn to bid" subhead, a row of previous-action chips ("Bot 2: Pass", "Bot 3: Pass"), primary blue "Ask Partner" button + dark "Pass" button side-by-side, "OR BID" divider, 4 square suit-picker tiles (♠ ♥ ♦ ♣) with suit glyph in color, then "BID: 10" numeric stepper with circular ‹ › arrows, and a disabled dark-green "CONFIRM BID" CTA.

## 05 — Bidding panel (after asking partner)
Same layout. "Ask Partner" now shown as a disabled blue "Asked" pill; below it a line reads "Bot 2 says: **Major**" (Major in green).
Rest identical to #04.

## 06 — Bidding panel (suit chosen, bid confirmable)
Hearts tile now has a thick ring/outline (selected state). "CONFIRM BID" CTA goes bright emerald with updated label "CONFIRM BID ♥10".

## 07 — Partner reveal (bid ≥10)
Game board updates: Bot 2's hand revealed — the face-down fan replaced with a fanned row of actual cards (suit-colored faces), labelled "BOT 2'S HAND" above.
Team pills appear: top-left blue "0 / 10" (your team tricks vs bid), mid-right red "0 / 4" (opponents).
Bot 1 now shows dealer crown + red pill "Score: 0" + 4 empty tick circles (tricks-won dots).
"Quit game" + "Issue" ghost buttons top-right (no Give Up yet).
Centered modal "PARTNER REVEAL": "You bid **10** — increase bid?" with ‹ 10 › stepper and emerald "START ▶" CTA.

## 08 — Playing phase, your turn (bidder leads)
Partner reveal dismissed. A large faded trump-suit glyph (heart) sits behind the center trick area.
Your hand (bottom) has every card subtly highlighted with a thin green underline = playable; "Your turn" yellow caption to the right of your name pill.
Extra action buttons appear on the left of the hand row: dark pill "TRAM" and red pill "Dhaap!".
A red "Give Up" button joined the top-right stack.

## 09 — Mid-trick / partner control (bid ≥10)
Three cards overlap in the trick area, slightly offset (seat-ordered positions).
Partner hand top retains the "BOT 2'S HAND" label; its playable cards now have green underlines too.
Your hand greys out the non-partner cards slightly and shows label "Play partner's card" on the right where "Your turn" used to be.
Opponent pills (Bot 3) have a floating "Pass" chip above them to indicate their last action.

## 10 — Help modal ("How to Play Surri")
Full-width dark-slate modal with rounded corners, scrollable inner body.
Header "How to Play Surri" + ✕ close top-right.
Sections: Overview, Bidding (bullets), Bid 10+, Playing Tricks (bullets), Scoring (bullets with in-line `X += 2X` style math).
Dark scrim behind obscures the board.

## 11 — Report Issue modal
Centered dialog on dark scrim.
Header "Report Issue" + ✕ close.
"Screenshot (auto-captured)" — thumbnail of current board.
"Describe the issue *" label + multiline textarea (placeholder "What went wrong? What did you expect to happen?").
Footer: "Cancel" (dark), "Submit" (primary, disabled until text).

## 12 — Give Up confirmation dialog
Small centered card. Body text "Give up this round? All remaining tricks go to opponents."
Footer buttons: "Cancel" (dark), "Give Up" (red destructive).

## 13 — Round summary (round lost for your team)
Large centered modal, rounded corners, with a red-tinted header bar "ROUND LOST".
Line "Praveen bid **10 ♥**".
Two result rows: "Praveen + Bot 2  0 / 10" (red, made 0 of bid) and "Bot 1 + Bot 3  13 / 4" (with a filled orange progress bar — they took all 13 tricks).
Center headline "✗ YOU LOST" (red X + white title), sub "Bid failed".
Two inset cards in slate tint:
  - SCORE CHANGE: "40 → 20" large numerals, "-20" in small green beneath.
  - ⚠ DEALER CHANGE: "Score went negative / New dealer: **Bot 2** 👑".
Bottom: large dark pill "NEXT ROUND ▶" + muted "Tap anywhere to dismiss" footnote.

## 14 — Round 2 bidding (new dealer, new hand)
New 13-card hand dealt. Bot 2 (top) now shows dealer crown + red "Score: 20" + 6 empty tick circles; other seats have updated score state.
Bidding modal identical to #04 layout but with fewer passed-chips (since bidding restarted).

## 15 — Trump-lead trick (opponent bidder)
No modal. Opponent (Bot 2) has led the trick: their A♣ sits center-top of the trick area, big faded club glyph is the trump indicator.
Team pills: "0 / 6" blue + "0 / 8" red (opponent bidder needs 8).
Bottom hand: your cards with green-underline playable ones; tapping/hovering a club card lifts it and enlarges (the "card zoom" feature) — here 4♣ and Q♣ are shown enlarged and overlapping.
"Dhaap!" button visible, "TRAM" hidden (unavailable this turn).

---

## Key interactive states observed but not counted as separate screens
- Card-zoom micro-interaction on hover/tap of a hand card (clear in #15).
- Action chips above opponent seats flashing "Pass" / "Asked" after their turn (visible in #4, #15).
- "Your turn" vs "Play partner's card" contextual labels in the hand row.
- Tricks-won dot counter under each seat (empty circles turn solid as that team wins tricks).
- Dealer crown + red "Score: N" badge on whichever seat is current dealer.
- Playable-card affordance: thin green underline/glow on cards that can legally be played.
