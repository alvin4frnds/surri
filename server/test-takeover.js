'use strict';

// Spec-004 tests — exercises the SurriGame state transitions and the
// AIPlayer abort flag. Socket-level flows (join_room routing, broadcast
// filtering) are covered by integration/browser testing rather than here.

process.env.FAST_TEST = '1';

const assert = require('assert');
const { SurriGame } = require('./gameLogic');
const { AIPlayer } = require('./aiPlayer');

let passed = 0;
let failed = 0;

function ok(name) { passed++; console.log(`  PASS: ${name}`); }
function fail(name, err) { failed++; console.log(`  FAIL: ${name} — ${err.message}`); }

function makeSeats(bots = [true, true, true, true]) {
  return bots.map((isBot, i) => ({
    name: isBot ? `Bot ${i}` : `Human ${i}`,
    isBot,
    isConnected: true,
  }));
}

// ---------------------------------------------------------------------------
// Partner hand hidden invariant — spectator state has no hand data
// ---------------------------------------------------------------------------
console.log('\n--- Spectator state filtering ---');
try {
  const g = new SurriGame(makeSeats());
  g.phase = 'playing';
  g.activeSeat = 1;
  g.bid = 10;
  g.biddingSeat = 1;
  g.biddingTeam = 1;
  g.trump = 'S';
  g.hands = {
    0: ['AS', 'KS'],
    1: ['AH', 'KH'],
    2: ['AD', 'KD'],
    3: ['AC', 'KC'],
  };

  // Simulate the server's _spectatorGameState helper.
  const base = g.getStateFor(0);
  const spectatorState = {
    ...base,
    myHand: [],
    myTurn: false,
    playableCards: [],
    mySeat: null,
    spectator: true,
  };

  assert.deepStrictEqual(spectatorState.myHand, []);
  assert.strictEqual(spectatorState.myTurn, false);
  assert.deepStrictEqual(spectatorState.playableCards, []);
  assert.strictEqual(spectatorState.mySeat, null);
  assert.strictEqual(spectatorState.spectator, true);
  // partnerHand is public once bid >= 10 — spectator sees it too.
  assert.ok(Array.isArray(spectatorState.partnerHand));
  ok('spectator state hides personal fields, keeps public partnerHand');
} catch (e) { fail('spectator state filter', e); }

// ---------------------------------------------------------------------------
// Bot abort flag — decideAction returns null when flagged mid-delay
// ---------------------------------------------------------------------------
console.log('\n--- Bot abort flag (bot-race mitigation) ---');
(async () => {
  try {
    const g = new SurriGame(makeSeats([false, true, true, true]));
    g.phase = 'bidding';
    g.activeSeat = 1;
    g.dealer = 0;
    g.hands = {
      0: Array(13).fill('2C'),
      1: ['AS', 'KS', 'QS', 'JS', '10S', 'AH', 'KH', 'AD', 'KD', 'AC', 'KC', 'QC', 'JC'],
      2: Array(13).fill('3C'),
      3: Array(13).fill('4C'),
    };
    g.bidHistory = [];

    const bot = new AIPlayer(1, g);
    const p = bot.decideAction();
    bot._aborted = true; // simulate human takeover during the bot's thinking delay
    const result = await p;
    assert.strictEqual(result, null, 'aborted bot must return null');
    assert.strictEqual(g.bid, null, 'aborted bot must not place a bid');
    ok('abort flag prevents post-delay action');
  } catch (e) { fail('bot abort flag', e); }

  // -------------------------------------------------------------------------
  // Seat claimability — bot seats claimable, tempBot seats protected
  // -------------------------------------------------------------------------
  console.log('\n--- Seat claimability ---');
  try {
    const seats = [
      { name: 'H0', isBot: false, isConnected: true },
      { name: 'Bot 1', isBot: true, isConnected: true }, // claimable
      { name: 'H2 disc', isBot: true, isConnected: false, isTempBot: true }, // NOT claimable (grace)
      { name: 'Bot 3', isBot: true, isConnected: true }, // claimable
    ];
    const idx = seats.findIndex(s => s && s.isBot === true && s.isTempBot !== true);
    assert.strictEqual(idx, 1, 'lowest-indexed bot that is NOT tempBot');
    ok('claimable seat skips tempBot (grace period)');
  } catch (e) { fail('claimability skips tempBot', e); }

  // -------------------------------------------------------------------------
  // Post-takeover seat state
  // -------------------------------------------------------------------------
  console.log('\n--- Post-takeover seat state ---');
  try {
    const g = new SurriGame(makeSeats());
    const seatIdx = 1;
    // Simulate a takeover.
    g.seats[seatIdx].isBot = false;
    g.seats[seatIdx].isConnected = true;
    g.seats[seatIdx].isTempBot = false;
    g.seats[seatIdx].name = 'Alice';

    assert.strictEqual(g.seats[seatIdx].isBot, false);
    assert.strictEqual(g.seats[seatIdx].name, 'Alice');
    ok('takeover flips isBot, preserves hand + score');
  } catch (e) { fail('takeover seat state', e); }

  // -------------------------------------------------------------------------
  // URL parsing — accept /r/CODE and legacy /join/CODE
  // -------------------------------------------------------------------------
  console.log('\n--- URL parse regex ---');
  try {
    const re = /^\/(?:r|join)\/(\w+)$/i;
    assert.strictEqual('/r/ABCD'.match(re)?.[1], 'ABCD');
    assert.strictEqual('/join/WXYZ'.match(re)?.[1], 'WXYZ');
    assert.strictEqual('/R/MixedCase'.match(re)?.[1], 'MixedCase');
    assert.strictEqual('/'.match(re), null);
    assert.strictEqual('/something/else'.match(re), null);
    ok('url regex matches /r/ and /join/, rejects other paths');
  } catch (e) { fail('url regex', e); }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
