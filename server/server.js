'use strict';

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { SurriGame } = require('./gameLogic');
const { AIPlayer } = require('./aiPlayer');

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
        const scoringDelay = process.env.FAST_TEST ? 50 : 2000;
        await new Promise(r => setTimeout(r, scoringDelay));
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

      await bot.decideAction();
      broadcastGameState(roomCode);

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
        await runBotTurns(info.roomCode);
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
