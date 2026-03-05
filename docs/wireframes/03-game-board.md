# Screen 3 — Game Board (Playing Phase)

The persistent base layout used throughout the playing phase. Overlays are applied on top for bidding, TRAM, scoring, etc.

---

```
┌─────────────────────────┐
│  ┌──────┐   ┌─────────┐ │
│  │ ♥ 10 │   │Score: 24│ │  ← Trump suit | Dealer score (left = trump, right = score)
│  └──────┘   └─────────┘ │
│                         │
│       ┌──────────┐      │
│       │  NORTH   │      │  ← Partner avatar
│       │  Jordan  │      │
│       │ tricks:3 │      │
│       │  [loss:0]│      │
│       └──────────┘      │
│                         │
│  ┌────────┐  ┌────────┐ │
│  │  WEST  │  │  EAST  │ │  ← Opponents
│  │  Sam   │  │  Riley │ │
│  │ trk: 2 │  │ trk: 1 │ │
│  │[loss:1]│  │[loss:0]│ │
│  └────────┘  └────────┘ │
│                         │
│      ╔═══════════╗      │
│      ║  [card]   ║      │  ← North's played card
│      ║           ║      │
│  ╔═══╣           ╠═══╗  │
│  ║[c]║   CENTER  ║[c]║  │  ← West / East played cards
│  ╚═══╣           ╠═══╝  │
│      ║  [card]   ║      │  ← South's played card
│      ╚═══════════╝      │
│                         │
│       ┌──────────┐      │
│       │  SOUTH   │      │  ← Local player
│       │   Alex   │      │
│       │ tricks:2 │      │
│       │  [loss:0]│      │
│       └──────────┘      │
│                         │
│  ┌─────────────────────┐│
│  │ Bid: 10♥  You: 2/10 ││  ← Bid progress bar (bidding team / defending team)
│  │ Them: 1/4           ││
│  └─────────────────────┘│
│                         │
│ [TRAM]                  │  ← TRAM button, bottom-left, always visible during play
│                         │
│ ┌──────────────────────┐│
│ │ 5♣ 6♣ 8♥ 9♥ J♥ K♥ A♥││  ← Local player's hand (scrollable)
│ │ 2♠ 5♠ 7♦ 9♦ J♦ A♦   ││
│ └──────────────────────┘│
└─────────────────────────┘
```

---

## Info Bar (top)

| Element | Detail |
|---|---|
| Trump suit | Large suit symbol + rank (e.g. "♥") — changes each round |
| Dealer score | Only 1 score exists. Highlighted red when ≥40 (danger zone) |

## Bid Progress Bar (above hand)

Shows both teams' progress simultaneously:
- Bidding team: `tricks_won / bid` (e.g. `2 / 10`)
- Defending team: `tricks_won / (14 − bid)` (e.g. `1 / 4`)

## Player Areas

Each player shows:
- Name + "(you)" for local player
- Dealer crown icon on current dealer
- Tricks won this round
- Loss counter badge (small, persistent)
- Bot indicator if AI

## Center Play Area

4-card diamond layout. Cards appear as played, cleared after trick resolves (brief winner highlight first).

## Player Hand

- Cards sorted by suit then rank
- Playable cards: full opacity, tappable
- Unplayable cards (wrong suit when must follow): dimmed
- Scrollable if too many cards to fit

## Card Back (opponents)

Opponents' hands are not shown — only a count or fanned card backs above their avatar.

---

## Dealing Animation (transition into this screen)

Before the board becomes interactive, cards animate from a center deck outward to each player position. The local player's cards flip face-up one by one. Then bidding phase begins.

---

## First-Round Dealer Reveal (once per game)

After the waiting room, the first dealer is selected server-side (highest-card draw, off-screen). The board loads with a brief toast announcing the result:

```
╔══════════════════════════╗
║  Sam deals first   👑   ║
╚══════════════════════════╝
```

The crown icon appears on Sam's avatar. Toast auto-dismisses after ~2s, then dealing animation begins normally.

---

## Disconnection State

When a human player drops mid-game, their avatar is greyed out and a bot immediately takes their seat:

```
┌────────┐
│  WEST  │   ← greyed out, reduced opacity
│  Sam   │
│  🤖    │   ← bot icon replaces avatar
│ trk: 1 │
│(loss:1)│
└────────┘
```

- A toast appears: **"Sam disconnected — bot taking over"**
- If Sam reconnects before the game ends: **"Sam reconnected"** toast, avatar restores, bot removed
- Disconnection does not pause the game — the bot plays immediately on their turn

---

## Deferred: Deck Cut

The optional cut (player to dealer's right may cut before dealing) is skipped in this version. The server deals directly after shuffling.
