# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Surri is a multiplayer dealer-centric card game — a Spades variant. This is a fresh rewrite of the [Surri](../Surri) project (see v3 as the primary reference).

**Status**: Pre-implementation — only `docs/` exists. The Commands and Architecture sections below describe the intended design to build toward.

### Docs Reference

| File | Contents |
|---|---|
| `docs/GameFlow.md` | Authoritative game rules and state machine |
| `docs/AILogic.md` | Bot hand evaluation, bidding, card-play, TRAM decisions |
| `docs/Board.md` | UI layout, component states, all screen flows |
| `docs/Spades.md` | Base trick-taking rules inherited unchanged |

## Commands

From the repo root:

```bash
npm run install:all   # Install dependencies for both server and client
npm run dev           # Run server + client concurrently
npm run server        # Start server only
npm run client        # Start client only
```

For server hot-reload during development:
```bash
cd server && npm run dev   # nodemon auto-restart
```

For client HMR during development:
```bash
cd client && npm run dev   # Vite dev server
```

Production build:
```bash
cd client && npm run build   # Outputs to client/dist/
cd server && npm start       # Run server in production
```

## Architecture

### Structure

```
Surri2/
├── server/          # Express + Socket.io backend (port 3000)
│   ├── server.js    # Room/player management, socket event handlers
│   ├── gameLogic.js # SurriGame class — all game state and rules
│   └── aiPlayer.js  # AIPlayer class — bot bidding and card-play decisions
├── client/          # Vue 3 + Vite frontend (port 5173)
│   ├── src/
│   │   ├── App.vue        # Room join UI
│   │   ├── socket.js      # Socket.io-client (connects to localhost:3000)
│   │   └── components/    # GameBoard, GameTable, BiddingPanel, Card, PlayerHand
│   └── tailwind.config.js
└── docs/            # Game rules, design docs
```

### Key Patterns

- **All game state lives on the server** — client is purely a view layer
- **No REST API** — all communication is via Socket.io events
- **In-memory state** — rooms and games stored in `Map` objects on the server
- **Player identity** — tracked by socket ID mapped to room ID
- **AI bots** — fill empty seats; 0–3 bots configurable at room creation

### Game Domain

Surri is a trick-taking game that inherits its trick engine from Spades but replaces bidding, scoring, trump selection, and win conditions. See `docs/GameFlow.md` for the authoritative rules.

- 4 players, 2 teams: seats 0 & 2 vs seats 1 & 3
- **First dealer**: highest-card draw at the very start of each game
- **Trump chosen by bidder** each round (not always spades); no breaking rule — any suit can be led anytime
- **Bidding**: Sequential clockwise starting left of dealer. Voluntary bid ≥10; if all 4 pass, first player is **forced to bid ≥8**
- **Support signals**: Before bidding, a player may ask their partner for Major/Minor/Pass — visible to all
- **Bid ≥10**: Partner's hand revealed to ALL players; bidder controls partner's card selection
- **Bid 13**: Instant win/lose — existing score stops mattering, losing side takes a loss; special dealer rotation (see `docs/GameFlow.md` §6 table)
- **Defending team target**: ≥(14 − bid) tricks to break the bid (e.g., bid 10 → defense needs ≥4)
- **Scoring**: Only the dealer's team has a score (high = bad, ≥52 = lose)

  | Who bid? | Outcome | Score change |
  |---|---|---|
  | Non-dealer's team bids X | Made | dealer_score **+= X** |
  | Non-dealer's team bids X | Failed | dealer_score **−= 2X** |
  | Dealer's team bids X | Made | dealer_score **−= X** |
  | Dealer's team bids X | Failed | dealer_score **+= 2X** |

- **Dealer rotation triggers**: score ≥52 → dealer loses, score resets to 0, partner deals; score goes negative → score becomes `|score|`, next clockwise player deals (no loss); bid-13 → special table in `docs/GameFlow.md`
- **Game end**: Runs indefinitely; 3 unique players must each lose at least once — 4th player wins
- **TRAM**: Any team can claim the *remaining needed tricks* mid-play by selecting cards in order; server validates each card is unbeatable — if invalid, all remaining tricks go to opponents
- Card shuffling uses cut shuffles (15 for first deal, 5 for subsequent)
