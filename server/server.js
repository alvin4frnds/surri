'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { SurriGame } = require('./gameLogic');
const { AIPlayer } = require('./aiPlayer');
const { createIssue } = require('./githubIssue');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

// code -> {
//   code, seats:[{name,isBot,socketId,isConnected}], game, bots:{seat->AIPlayer},
//   hostSeat, gameStarted
// }
const rooms = new Map();

// socketId -> { roomCode, seat }
const socketToRoom = new Map();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function getRoomState(room) {
  return {
    code: room.code,
    seats: room.seats.map(s => ({
      name: s ? s.name : null,
      isBot: s ? s.isBot : false,
      isConnected: s ? s.isConnected : false,
    })),
    hostSeat: room.hostSeat,
    gameStarted: room.gameStarted,
  };
}

function broadcastRoomState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const state = getRoomState(room);
  for (let seat = 0; seat < 4; seat++) {
    const s = room.seats[seat];
    if (s && !s.isBot && s.socketId && s.isConnected) {
      io.to(s.socketId).emit('room_updated', { state });
    }
  }
}

function broadcastGameState(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;
  for (let seat = 0; seat < 4; seat++) {
    const s = room.seats[seat];
    if (s && !s.isBot && s.socketId && s.isConnected) {
      io.to(s.socketId).emit('game_state', { state: room.game.getStateFor(seat) });
    }
  }
}

function createBotForSeat(seat, room) {
  const bot = new AIPlayer(seat, room.game);
  room.bots[seat] = bot;
}

async function runBotTurns(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || !room.game) return;
  const game = room.game;

  // Prevent concurrent runBotTurns calls
  if (room._botRunning) return;
  room._botRunning = true;

  try {
    while (true) {
      if (game.isGameOver() !== null) break;

      if (game.phase === 'scoring') {
        // Wait for human to click next_round (30s safety timeout)
        const maxWait = process.env.FAST_TEST ? 50 : 30000;
        await new Promise(r => {
          room._scoringResolve = r;
          setTimeout(() => { room._scoringResolve = null; r(); }, maxWait);
        });
        game.round++;
        game.startRound();
        broadcastGameState(roomCode);
        continue;
      }

      if (game.activeSeat === null) break;

      const activeSeat = game.activeSeat;
      const activeSeatInfo = room.seats[activeSeat];

      // Check if it's a pending support request for a bot
      if (game.pendingSupportRequest) {
        const partnerSeat = (game.pendingSupportRequest.asker + 2) % 4;
        if (partnerSeat === activeSeat && room.seats[partnerSeat]?.isBot) {
          const bot = room.bots[partnerSeat];
          if (bot) {
            await bot.decideAction();
            broadcastGameState(roomCode);
            continue;
          }
        }
        // Human partner needs to respond — stop bot loop
        if (!room.seats[partnerSeat]?.isBot) break;
      }

      if (!activeSeatInfo?.isBot) break;

      const bot = room.bots[activeSeat];
      if (!bot) break;

      const prevPhase = game.phase;
      const prevActive = game.activeSeat;
      const prevTrickLen = game.currentTrick.length;

      const action = await bot.decideAction();
      broadcastGameState(roomCode);

      // Safety: if bot didn't change any game state, break to avoid infinite loop
      if (!action && game.phase === prevPhase && game.activeSeat === prevActive && game.currentTrick.length === prevTrickLen) {
        console.error(`Bot ${activeSeat} stuck: phase=${game.phase}, active=${game.activeSeat}, trick=${game.currentTrick.length}`);
        break;
      }

      // If trick just completed (4 cards), pause so clients see all cards, then resolve
      if (game.currentTrick.length === 4 && game.activeSeat === null) {
        const trickDelay = process.env.FAST_TEST ? 50 : 1200;
        await new Promise(r => setTimeout(r, trickDelay));
        game.resolveTrick();
        broadcastGameState(roomCode);
      }
    }
  } finally {
    room._botRunning = false;
  }
}

// ---------------------------------------------------------------------------
// REST / Dashboard
// ---------------------------------------------------------------------------

app.use(express.json());

app.get('/api/stats', (req, res) => {
  const activeRooms = [];
  let totalPlayers = 0;
  let totalBots = 0;

  for (const [code, room] of rooms) {
    const players = room.seats.filter(s => s && !s.isBot);
    const bots = room.seats.filter(s => s && s.isBot);
    const connectedPlayers = players.filter(s => s.isConnected);
    totalPlayers += connectedPlayers.length;
    totalBots += bots.length;
    activeRooms.push({
      code,
      gameStarted: room.gameStarted,
      phase: room.game?.phase || null,
      round: room.game?.round ?? null,
      trick: room.game ? room.game.tricksWon[0] + room.game.tricksWon[1] + 1 : null,
      players: players.map(s => ({ name: s.name, connected: s.isConnected })),
      botCount: bots.length,
    });
  }

  res.json({
    timestamp: new Date().toISOString(),
    totalRooms: rooms.size,
    totalPlayers,
    totalBots,
    connectedSockets: io.engine?.clientsCount ?? socketToRoom.size,
    rooms: activeRooms,
  });
});

app.get('/dashboard', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Surri - Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1b2d; color: #e2e8f0; padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 8px; color: #93c5fd; }
    .subtitle { color: #64748b; font-size: 0.85rem; margin-bottom: 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #60a5fa; }
    .stat-label { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .rooms-section h2 { font-size: 1.1rem; color: #93c5fd; margin-bottom: 12px; }
    .room-card { background: #1e293b; border-radius: 10px; padding: 16px; margin-bottom: 12px; }
    .room-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .room-code { font-weight: 700; font-size: 1.1rem; color: #f59e0b; font-family: monospace; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; }
    .badge-waiting { background: #1e3a5f; color: #60a5fa; }
    .badge-playing { background: #064e3b; color: #34d399; }
    .room-details { font-size: 0.8rem; color: #94a3b8; }
    .room-details span { margin-right: 16px; }
    .player-list { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
    .player-tag { background: #334155; padding: 2px 10px; border-radius: 6px; font-size: 0.75rem; }
    .player-tag.disconnected { opacity: 0.5; text-decoration: line-through; }
    .empty-state { color: #475569; text-align: center; padding: 40px; }
    .refresh-info { color: #475569; font-size: 0.75rem; text-align: center; margin-top: 24px; }
    .pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <h1>Surri Dashboard</h1>
  <p class="subtitle">Real-time server stats <span id="status" class="pulse">&#9679;</span></p>

  <div class="stats-grid">
    <div class="stat-card"><div class="stat-value" id="totalRooms">-</div><div class="stat-label">Active Rooms</div></div>
    <div class="stat-card"><div class="stat-value" id="totalPlayers">-</div><div class="stat-label">Human Players</div></div>
    <div class="stat-card"><div class="stat-value" id="totalBots">-</div><div class="stat-label">Bots</div></div>
    <div class="stat-card"><div class="stat-value" id="connectedSockets">-</div><div class="stat-label">Connections</div></div>
  </div>

  <div class="rooms-section">
    <h2>Active Rooms</h2>
    <div id="roomsList"><div class="empty-state">Loading...</div></div>
  </div>

  <div class="refresh-info">Auto-refreshes every 5 seconds</div>

  <script>
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        document.getElementById('totalRooms').textContent = data.totalRooms;
        document.getElementById('totalPlayers').textContent = data.totalPlayers;
        document.getElementById('totalBots').textContent = data.totalBots;
        document.getElementById('connectedSockets').textContent = data.connectedSockets;
        document.getElementById('status').style.color = '#34d399';

        const container = document.getElementById('roomsList');
        if (data.rooms.length === 0) {
          container.innerHTML = '<div class="empty-state">No active rooms</div>';
          return;
        }

        container.innerHTML = data.rooms.map(room => {
          const phase = room.gameStarted
            ? (room.phase || 'playing')
            : 'waiting';
          const badgeClass = room.gameStarted ? 'badge-playing' : 'badge-waiting';
          const details = room.gameStarted
            ? '<span>Round ' + (room.round ?? '?') + '</span><span>Phase: ' + phase + '</span>'
            : '<span>Waiting for players</span>';
          const players = room.players.map(p =>
            '<span class="player-tag ' + (p.connected ? '' : 'disconnected') + '">' + p.name + '</span>'
          ).join('');

          return '<div class="room-card">'
            + '<div class="room-header">'
            + '<span class="room-code">' + room.code + '</span>'
            + '<span class="badge ' + badgeClass + '">' + (room.gameStarted ? 'In Game' : 'Lobby') + '</span>'
            + '</div>'
            + '<div class="room-details">' + details + '<span>Bots: ' + room.botCount + '</span></div>'
            + '<div class="player-list">' + players + '</div>'
            + '</div>';
        }).join('');
      } catch (e) {
        document.getElementById('status').style.color = '#ef4444';
      }
    }

    fetchStats();
    setInterval(fetchStats, 5000);
  </script>
</body>
</html>`);
});

// ---------------------------------------------------------------------------
// Socket events
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // -------------------------------------------------------------------------
  // create_room
  // -------------------------------------------------------------------------
  socket.on('create_room', ({ name, botCount }) => {
    try {
      botCount = Math.max(0, Math.min(3, botCount ?? 3));

      let code;
      do { code = generateCode(); } while (rooms.has(code));

      const seats = [];

      // Host takes seat 0
      seats[0] = { name, isBot: false, socketId: socket.id, isConnected: true };

      // Fill remaining seats with bots (seats 1..botCount)
      for (let i = 1; i <= botCount; i++) {
        seats[i] = { name: `Bot ${i}`, isBot: true, socketId: null, isConnected: true };
      }

      // Fill any remaining empty seats as null (waiting for humans)
      for (let i = botCount + 1; i < 4; i++) {
        seats[i] = null;
      }

      const room = {
        code,
        seats,
        game: null,
        bots: {},
        hostSeat: 0,
        gameStarted: false,
        _botRunning: false,
      };

      rooms.set(code, room);
      socketToRoom.set(socket.id, { roomCode: code, seat: 0 });
      socket.join(code);

      const state = getRoomState(room);
      socket.emit('room_created', { code, seat: 0, state });
    } catch (err) {
      console.error('create_room error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // join_room
  // -------------------------------------------------------------------------
  socket.on('join_room', ({ name, code }) => {
    try {
      code = code?.toUpperCase();
      const room = rooms.get(code);
      if (!room) {
        return socket.emit('error', { message: 'Room not found' });
      }
      if (room.gameStarted) {
        return socket.emit('error', { message: 'Game already started' });
      }

      // Find next open human seat
      let seat = -1;
      for (let i = 0; i < 4; i++) {
        if (!room.seats[i] || (room.seats[i].isBot === false && !room.seats[i].socketId)) {
          seat = i;
          break;
        }
      }

      // If no empty slot, try replacing a null slot
      if (seat === -1) {
        for (let i = 0; i < 4; i++) {
          if (!room.seats[i]) {
            seat = i;
            break;
          }
        }
      }

      if (seat === -1) {
        return socket.emit('error', { message: 'Room is full' });
      }

      room.seats[seat] = { name, isBot: false, socketId: socket.id, isConnected: true };
      socketToRoom.set(socket.id, { roomCode: code, seat });
      socket.join(code);

      const state = getRoomState(room);
      socket.emit('room_joined', { seat, state });
      broadcastRoomState(code);
    } catch (err) {
      console.error('join_room error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // start_game
  // -------------------------------------------------------------------------
  socket.on('start_game', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room) return socket.emit('error', { message: 'Room not found' });
      if (info.seat !== room.hostSeat) return socket.emit('error', { message: 'Only host can start' });
      if (room.gameStarted) return socket.emit('error', { message: 'Game already started' });

      // Fill any remaining empty seats with bots
      for (let i = 0; i < 4; i++) {
        if (!room.seats[i]) {
          room.seats[i] = { name: `Bot ${i}`, isBot: true, socketId: null, isConnected: true };
        }
      }

      // Create game
      room.gameStarted = true;
      const gameSeats = room.seats.map(s => ({ name: s.name, isBot: s.isBot, isConnected: s.isConnected }));
      room.game = new SurriGame(gameSeats);

      // Create bots
      for (let i = 0; i < 4; i++) {
        if (room.seats[i]?.isBot) {
          createBotForSeat(i, room);
        }
      }

      // Pick first dealer randomly
      const firstDealer = Math.floor(Math.random() * 4);
      room.game.startRound(firstDealer);

      broadcastGameState(info.roomCode);
      runBotTurns(info.roomCode);
    } catch (err) {
      console.error('start_game error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // ask_support
  // -------------------------------------------------------------------------
  socket.on('ask_support', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.askSupport(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('ask_support error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // give_support
  // -------------------------------------------------------------------------
  socket.on('give_support', async ({ signal }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.giveSupport(info.seat, signal);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('give_support error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // place_bid
  // -------------------------------------------------------------------------
  socket.on('place_bid', async ({ bid, trump }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.placeBid(info.seat, bid, trump);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('place_bid error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // pass_bid
  // -------------------------------------------------------------------------
  socket.on('pass_bid', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.passBid(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('pass_bid error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // increase_bid
  // -------------------------------------------------------------------------
  socket.on('increase_bid', async ({ bid }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.increaseBid(info.seat, bid);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('increase_bid error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // start_play
  // -------------------------------------------------------------------------
  socket.on('start_play', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.startPlay(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('start_play error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // play_card
  // -------------------------------------------------------------------------
  socket.on('play_card', async ({ card }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.playCard(info.seat, card);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);

      // If trick just completed, pause so clients see all 4 cards, then resolve
      if (result.trickComplete) {
        const trickDelay = process.env.FAST_TEST ? 50 : 1200;
        await new Promise(r => setTimeout(r, trickDelay));
        room.game.resolveTrick();
        broadcastGameState(info.roomCode);
      }

      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('play_card error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // declare_dhaap
  // -------------------------------------------------------------------------
  socket.on('declare_dhaap', () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.declareDhaap(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
    } catch (err) {
      console.error('declare_dhaap error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // call_tram
  // -------------------------------------------------------------------------
  socket.on('call_tram', async ({ cards }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.callTram(info.seat, cards);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('call_tram error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // give_up — concede remaining tricks to opponent
  // -------------------------------------------------------------------------
  socket.on('give_up', async () => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const result = room.game.giveUp(info.seat);
      if (!result.ok) return socket.emit('error', { message: result.error });

      broadcastGameState(info.roomCode);
      await runBotTurns(info.roomCode);
    } catch (err) {
      console.error('give_up error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // next_round — skip scoring delay
  // -------------------------------------------------------------------------
  socket.on('next_round', () => {
    const info = socketToRoom.get(socket.id);
    if (!info) return;
    const room = rooms.get(info.roomCode);
    if (room && room._scoringResolve) {
      room._scoringResolve();
      room._scoringResolve = null;
    }
  });

  // -------------------------------------------------------------------------
  // report_issue
  // -------------------------------------------------------------------------
  socket.on('report_issue', async ({ description, screenshot }) => {
    try {
      const info = socketToRoom.get(socket.id);
      if (!info) return socket.emit('error', { message: 'Not in a room' });
      const room = rooms.get(info.roomCode);
      if (!room || !room.game) return socket.emit('error', { message: 'No game in progress' });

      const gameState = room.game.getStateFor(info.seat);
      const result = await createIssue({
        description,
        screenshot,
        gameState,
        mySeat: info.seat,
        roomCode: info.roomCode,
      });

      if (result.ok) {
        socket.emit('issue_reported', { issueNumber: result.issueNumber, url: result.url });
      } else {
        socket.emit('error', { message: result.error || 'Failed to create issue' });
      }
    } catch (err) {
      console.error('report_issue error:', err);
      socket.emit('error', { message: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // disconnect
  // -------------------------------------------------------------------------
  socket.on('disconnect', async () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const info = socketToRoom.get(socket.id);
    if (!info) return;

    socketToRoom.delete(socket.id);

    const room = rooms.get(info.roomCode);
    if (!room) return;

    const seatInfo = room.seats[info.seat];
    if (seatInfo && !seatInfo.isBot) {
      seatInfo.isConnected = false;

      if (room.game) {
        // Bot takes over the seat
        seatInfo.isBot = true;
        // Update game's seat info
        if (room.game.seats[info.seat]) {
          room.game.seats[info.seat].isBot = true;
          room.game.seats[info.seat].isConnected = false;
        }
        createBotForSeat(info.seat, room);
        broadcastGameState(info.roomCode);

        // If all 4 players are now bots, drop the game after 10 seconds
        const allBots = room.seats.every(s => s?.isBot);
        if (allBots) {
          console.log(`Room ${info.roomCode}: all players are bots, dropping in 10s`);
          setTimeout(() => {
            const r = rooms.get(info.roomCode);
            if (r && r.seats.every(s => s?.isBot)) {
              console.log(`Room ${info.roomCode}: dropped (all bots)`);
              rooms.delete(info.roomCode);
            }
          }, 10000);
        } else {
          await runBotTurns(info.roomCode);
        }
      } else {
        broadcastRoomState(info.roomCode);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Surri2 server running on port ${PORT}`);
});
