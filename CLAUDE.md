# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Surri is a multiplayer dealer-centric card game — a Spades variant with custom bidding, scoring, trump selection, and win conditions. This is a rewrite of the [Surri](../Surri) project (v3 as primary reference). Fully implemented and deployed at https://surri.xuresolutions.in.

### Docs Reference

| File | Contents |
|---|---|
| `docs/GameFlow.md` | Authoritative game rules and state machine |
| `docs/AILogic.md` | Bot hand evaluation, bidding, card-play, TRAM decisions |
| `docs/Board.md` | UI layout, component states, all screen flows |
| `docs/Spades.md` | Base trick-taking rules inherited unchanged |

## Commands

```bash
npm run install:all   # Install deps for both server and client
npm run dev           # Run server + client concurrently (dev mode)
npm run server        # Start server only
npm run client        # Start client only
```

Individual dev servers:
```bash
cd server && npm run dev   # nodemon hot-reload on port 3000
cd client && npm run dev   # Vite HMR on port 5173
```

Production:
```bash
cd client && npm run build   # Outputs to client/dist/
cd server && npm start       # Run server in production
```

Testing (headless integration — connects 1 human + 3 bots, plays 3 games):
```bash
FAST_TEST=1 node server/test-game.js
```

No linter or formatter is configured.

## Deployment

**Live URL**: https://surri.xuresolutions.in
**Server path**: `/var/www/html/surri2` on Ubuntu

- **Nginx** — serves `client/dist/` static files, proxies `/socket.io/`, `/api/`, `/dashboard` to Node. Config: `nginx/surri2.conf` (deployed at `/etc/nginx/sites-available/surri2`)
- **PM2** — runs `server/server.js` as process `surri2` on port 3000
- **GitHub Actions** — auto-deploys on push to `master` (`.github/workflows/deploy.yml`). Requires secrets: `SERVER_IP`, `SSH_PRIVATE_KEY`

Manual deploy:
```bash
ssh root@<server-ip>
cd /var/www/html/surri2
git pull origin master && npm run install:all
cd client && npm run build && cd ..
pm2 restart surri2
```

## Architecture

### Server (`server/`)

Three files, no framework beyond Express + Socket.io:

| File | Class/Role | What it owns |
|---|---|---|
| `server.js` | Room management, socket event handlers | `rooms` Map, `socketToRoom` Map, bot orchestration, REST endpoints (`/api/stats`, `/dashboard`) |
| `gameLogic.js` | `SurriGame` class | All game state and rules: dealing, bidding, playing, TRAM validation, scoring, dealer rotation |
| `aiPlayer.js` | `AIPlayer` class | Bot decisions: hand evaluation, bid/pass logic, card selection, TRAM attempts |
| `githubIssue.js` | `createIssue()` | In-game bug reporting → GitHub Issues API with screenshot upload |

**State model**: All game state is server-side, in-memory `Map` objects. No database. Rooms keyed by 4-char code; players tracked by `socketId → {roomCode, seat}`.

**Game phases** (sequential): `dealing` → `bidding` / `bidding_forced` → `partner_reveal` (if bid ≥10) → `playing` → `scoring`

**Bot loop**: `runBotTurns()` in `server.js` runs after each human action — async loop that fires bot decisions (with delays) until it's a human player's turn again. `FAST_TEST` env var reduces delays to 10-50ms.

**Key socket events**: `create_room`, `join_room`, `start_game`, `ask_support`, `give_support`, `place_bid`, `pass_bid`, `increase_bid`, `start_play`, `play_card`, `declare_dhaap`, `call_tram`, `give_up`, `next_round`, `report_issue`

**State serialization**: `game.getStateFor(seat)` returns a seat-specific view — hides opponent hands, includes `playableCards` for the active player. Partner hand is visible to all when bid ≥10.

**Disconnect handling**: Disconnected human → instantly replaced by bot (keeps seat). If all 4 seats become bots, room auto-deletes after 10s.

### Client (`client/src/`)

Vue 3 + Vite + Tailwind v4. All components use `<script setup>` composition API. Mobile-first layout (max 390×844px).

**Entry**: `main.js` → Firebase Analytics init → mount `App.vue`

**`App.vue`** manages view state (`lobby` → `waiting` → `game`) and all socket listeners. Three main screens:
- `LobbyScreen.vue` — create/join room
- `WaitingRoom.vue` — pre-game player list, host starts game
- `GameBoard.vue` — main gameplay, orchestrates all sub-components

**Key components**: `PlayerHand` (clickable cards), `BiddingPanel` (bid/pass/support UI), `TrickArea` (current trick display), `PlayerArea` (per-player info), `TramOverlay` (card selection for TRAM claims), `RoundSummary` (post-round scoring)

**Socket connection** (`socket.js`): Singleton connecting to `VITE_SERVER_URL` env var, or auto-detects localhost:3000 / current origin. Exposed as `window.__socket` for debugging.

**Vite dev proxy**: `/dashboard` and `/api/` proxied to localhost:3000.

**Native mobile**: Capacitor v8 configured for Android (`client/capacitor.config.json`). Firebase Analytics works on both web and native via `analytics.js` service.

### Game Domain

See `docs/GameFlow.md` for authoritative rules. Key points:

- 4 players, 2 teams: seats 0 & 2 vs seats 1 & 3
- **Trump chosen by bidder** each round (not always spades); any suit can be led anytime
- **Bidding**: Clockwise from left of dealer. Voluntary bid ≥10; if all pass, first player forced to bid ≥8
- **Support signals**: Before bidding, ask partner for Full/Major/Minor/Pass — visible to all
- **Bid ≥10**: Partner's hand revealed to ALL; bidder controls partner's cards; bidder leads trick 1
- **Bid 13**: Instant win/lose — special dealer rotation rules
- **Scoring**: Only dealer's team has a score (high = bad, ≥52 = lose). Non-dealer bid made → `+X`; failed → `-2X`. Dealer bid made → `-X`; failed → `+2X`
- **Dealer rotation**: Score ≥52 → dealer loses, score resets, partner deals. Score negative → becomes `|score|`, next clockwise deals
- **TRAM**: Claim remaining tricks by selecting cards in order; server validates each is unbeatable via simulation
- **Game end**: 3 unique players must each lose once — 4th player wins
