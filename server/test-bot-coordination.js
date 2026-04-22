'use strict';

// Spec 002 — Bot-pair shared hand visibility tests.
// Mirrors test-dhaap.js structure: direct SurriGame/AIPlayer instantiation, no sockets.

process.env.FAST_TEST = '1';

const assert = require('assert');
const { SurriGame } = require('./gameLogic');
const { AIPlayer } = require('./aiPlayer');

let passed = 0;
let failed = 0;

function ok(name) { passed++; console.log(`  PASS: ${name}`); }
function fail(name, err) { failed++; console.log(`  FAIL: ${name} — ${err.message}`); }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSeats(botFlags) {
  // botFlags: [bool, bool, bool, bool]
  return botFlags.map((isBot, i) => ({
    name: (isBot ? 'Bot' : 'Human') + i,
    isBot,
    isConnected: true,
  }));
}

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['S', 'H', 'D', 'C'];
function buildDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  return d;
}

/**
 * Build 4 hands of 13 cards. `pinned` maps seat → cards that MUST be in that seat.
 * Other seats get remaining cards padded up to 13 each.
 */
function pinHands(pinned) {
  const used = new Set();
  const hands = { 0: [], 1: [], 2: [], 3: [] };
  for (let s = 0; s < 4; s++) {
    if (!pinned[s]) continue;
    for (const c of pinned[s]) {
      if (used.has(c)) throw new Error(`card ${c} pinned twice`);
      used.add(c);
      hands[s].push(c);
    }
  }
  const leftover = buildDeck().filter(c => !used.has(c));
  let i = 0;
  for (let s = 0; s < 4; s++) {
    while (hands[s].length < 13) {
      hands[s].push(leftover[i++]);
    }
  }
  if (i !== leftover.length) throw new Error(`deck not consumed: ${leftover.length - i} cards remaining`);
  return hands;
}

function gameInBidding({ dealer = 0, botFlags = [true, true, true, true], hands } = {}) {
  const game = new SurriGame(makeSeats(botFlags));
  game.phase = 'bidding';
  game.dealer = dealer;
  game.activeSeat = (dealer + 1) % 4;
  game.hands = hands || { 0: [], 1: [], 2: [], 3: [] };
  game.bid = null;
  game.trump = null;
  game.biddingSeat = null;
  game.biddingTeam = null;
  game.bidHistory = [];
  game.supportSignals = { 0: null, 1: null, 2: null, 3: null };
  game.supportAsked = { 0: false, 1: false, 2: false, 3: false };
  game.pendingSupportRequest = null;
  game.raiseSeatsRemaining = [];
  return game;
}

// ---------------------------------------------------------------------------
// §7a. Fairness gate — bot with human partner does NOT peek
// ---------------------------------------------------------------------------

console.log('\n--- 7a. Fairness gate: human-partner bot does NOT peek ---');
try {
  // Seats: 0 = human, 1 = bot, 2 = bot (0's partner), 3 = bot
  const game = gameInBidding({
    dealer: 3,
    botFlags: [false, true, true, true],
    hands: {
      0: ['AS', 'KS', 'QS', '2H', '2D', '2C', '3S', '4S', '5S', '6S', '7S', '8S', '9S'],
      1: ['AH', 'KH', 'QH', '3H', '4H', '5H', '6H', '7H', '8H', '9H', 'JH', '3D', '4D'],
      2: ['AD', 'KD', 'QD', 'JD', '3C', '4C', '5C', '6C', '7C', '8C', '9C', '10C', 'JC'],
      3: ['AC', 'KC', 'QC', '10H', '10D', '10S', '5D', '6D', '7D', '8D', '9D', 'JS', '2S'],
    },
  });
  game.activeSeat = 0; // dealer=3 → first bidder is seat 0 (human)

  // Spy on _visiblePartnerHand calls per-bot
  const visibleCallsBySeat = { 0: [], 1: [], 2: [], 3: [] };
  for (let s = 0; s < 4; s++) {
    if (!game.seats[s].isBot) continue;
    const bot = new AIPlayer(s, game);
    const orig = bot._visiblePartnerHand.bind(bot);
    bot._visiblePartnerHand = function () {
      const v = orig();
      visibleCallsBySeat[s].push(v);
      return v;
    };
    // Stash the spy to run later
    game[`__bot${s}`] = bot;
  }

  // Bot 1's partner is bot 3 → peek enabled
  assert.strictEqual(game.partnerIsBot(1), true, 'bot 1 partner is bot');
  assert.strictEqual(game.partnerIsBot(3), true, 'bot 3 partner is bot');
  // Bot 2's partner is human 0 → peek disabled
  assert.strictEqual(game.partnerIsBot(2), false, 'bot 2 partner is human');

  // Invoke the peek helper on each bot — bot 2 must get null
  assert.ok(Array.isArray(game.__bot1._visiblePartnerHand()), 'bot 1 peek returns hand');
  assert.ok(Array.isArray(game.__bot3._visiblePartnerHand()), 'bot 3 peek returns hand');
  assert.strictEqual(game.__bot2._visiblePartnerHand(), null, 'bot 2 peek returns null');

  // Every recorded call for seat 2 must be null
  assert.ok(visibleCallsBySeat[2].every(v => v === null), 'bot 2 never sees partner hand');
  ok('7a bot with human partner never peeks human hand');
} catch (e) { fail('7a fairness gate', e); }

// ---------------------------------------------------------------------------
// §7c. Bot-pair coordinates bidding
// ---------------------------------------------------------------------------

console.log('\n--- 7c. Bot-pair coordinated bid ---');
async function test7c() {
  try {
    // Seat 1 has 9-ish estimate solo, seat 3 has complementary strength.
    // Combined estimate >= 10 in ♠ trump.
    // Solo seat 1 would pass (no support signal available — it's the first bidder).
    // Seat 1 owns top ♠ but few of them — solo ♠ estimate ~4 (not enough for solo bid).
    // Seat 3 holds mid ♠ length + side-suit aces → combined ♠ ≥ 10.
    const game = gameInBidding({
      dealer: 0,
      botFlags: [true, true, true, true],
      hands: pinHands({
        1: ['AS', 'KS', 'QS', 'JS'],
        3: ['10S', '9S', '8S', 'AH', 'AD', 'AC', 'KH', 'KD', 'KC'],
      }),
    });
    game.activeSeat = 1; // dealer=0 → first bidder is seat 1

    const bot1 = new AIPlayer(1, game);

    await bot1.decideAction();

    // After change: seat 1 should place a bid (not pass) because combined estimate ≥ 10.
    const seat1Action = game.bidHistory.find(h => h.seat === 1);
    assert.ok(seat1Action, 'seat 1 took some bidding action');
    assert.strictEqual(seat1Action.action, 'bid', 'seat 1 bid rather than passed/asked');
    assert.ok(seat1Action.bid >= 10, `seat 1 bid ≥ 10, got ${seat1Action.bid}`);
    ok('7c bot-pair combined estimate drives a bid where solo would not');
  } catch (e) { fail('7c bot-pair bid coordination', e); }
}

// ---------------------------------------------------------------------------
// §7e. State serialization must NOT leak partner hand outside reveal phase
// ---------------------------------------------------------------------------

console.log('\n--- 7e. getStateFor partnerHand invariant ---');
try {
  // All-bot game; drive through bidding + low bid + playing.
  // Assert partnerHand === null for every seat, every phase, bid < 10.
  const game = gameInBidding({
    dealer: 0,
    botFlags: [true, true, true, true],
    hands: {
      0: ['2S', '3S', '4S', '5S', '6S', '2H', '3H', '4H', '5H', '6H', '2D', '3D', '4D'],
      1: ['7S', '8S', '9S', '10S', '7H', '8H', '9H', '10H', '5D', '6D', '7D', '8D', '2C'],
      2: ['JS', 'QS', 'KS', 'AS', 'JH', 'QH', 'KH', 'AH', '9D', '10D', 'JD', 'QD', '3C'],
      3: ['KD', 'AD', '4C', '5C', '6C', '7C', '8C', '9C', '10C', 'JC', 'QC', 'KC', 'AC'],
    },
  });

  // Phase 1: bidding — no bid placed yet, partnerHand must be null for all seats
  for (let s = 0; s < 4; s++) {
    const view = game.getStateFor(s);
    assert.strictEqual(view.partnerHand, null, `phase=bidding, seat ${s}, partnerHand=null`);
  }
  ok('7e partnerHand null during bidding (all-bot game)');

  // Place a bid of 8 via forced — but we can shortcut: place a bid < 10 isn't directly allowed,
  // so we pass all 4 to force, then forced bid seat 1 at 8 ♠.
  game.passBid(1);
  game.passBid(2);
  game.passBid(3);
  game.passBid(0);
  assert.strictEqual(game.phase, 'bidding_forced');
  for (let s = 0; s < 4; s++) {
    const view = game.getStateFor(s);
    assert.strictEqual(view.partnerHand, null, `phase=bidding_forced, seat ${s}, partnerHand=null`);
  }
  ok('7e partnerHand null during bidding_forced');

  game.placeBid(1, 8, 'S');
  assert.strictEqual(game.phase, 'playing');
  assert.ok(game.bid < 10, 'bid is below 10');
  for (let s = 0; s < 4; s++) {
    const view = game.getStateFor(s);
    assert.strictEqual(view.partnerHand, null, `phase=playing, bid<10, seat ${s}, partnerHand=null`);
  }
  ok('7e partnerHand null during playing with bid < 10 (regardless of bot makeup)');
} catch (e) { fail('7e state serialization invariant', e); }

// Also verify with a bid >= 10 that partnerHand DOES reveal (existing behaviour).
try {
  const game = gameInBidding({
    dealer: 0,
    botFlags: [true, true, true, true],
    hands: {
      0: ['2S', '3S', '4S', '5S', '6S', '2H', '3H', '4H', '5H', '6H', '2D', '3D', '4D'],
      1: ['7S', '8S', '9S', '10S', '7H', '8H', '9H', '10H', '5D', '6D', '7D', '8D', '2C'],
      2: ['JS', 'QS', 'KS', 'AS', 'JH', 'QH', 'KH', 'AH', '9D', '10D', 'JD', 'QD', '3C'],
      3: ['KD', 'AD', '4C', '5C', '6C', '7C', '8C', '9C', '10C', 'JC', 'QC', 'KC', 'AC'],
    },
  });
  game.activeSeat = 1;
  game.placeBid(1, 10, 'S');
  // Close raise window
  game.passRaise(2);
  game.passRaise(3);
  game.passRaise(0);
  assert.strictEqual(game.phase, 'partner_reveal');
  const partnerSeat = (1 + 2) % 4;
  for (let s = 0; s < 4; s++) {
    const view = game.getStateFor(s);
    assert.ok(Array.isArray(view.partnerHand), `seat ${s}: partnerHand is array during partner_reveal`);
    assert.deepStrictEqual([...view.partnerHand].sort(), [...game.hands[partnerSeat]].sort(),
      `seat ${s}: partnerHand === hands[${partnerSeat}] during partner_reveal`);
  }
  ok('7e partnerHand revealed during partner_reveal with bid ≥ 10 (existing behaviour preserved)');
} catch (e) { fail('7e partner_reveal behaviour', e); }

// ---------------------------------------------------------------------------
// §7f. Mid-round bot→human swap revokes peek
// ---------------------------------------------------------------------------

console.log('\n--- 7f. Mid-round bot↔human swap changes peek ---');
try {
  const game = gameInBidding({
    dealer: 0,
    botFlags: [true, true, true, true],
    hands: {
      0: ['2S', '3S', '4S', '5S'],
      1: ['6S', '7S', '8S', '9S'],
      2: ['10S', 'JS', 'QS', 'KS'],
      3: ['AS', '2H', '3H', '4H'],
    },
  });
  const bot1 = new AIPlayer(1, game);

  // Initially: all bots — bot 1 sees partner (seat 3) hand.
  const peek1 = bot1._visiblePartnerHand();
  assert.ok(Array.isArray(peek1), 'peek returns array when partner is bot');
  assert.deepStrictEqual(peek1, game.hands[3], 'peek returns seat 3 hand');

  // Simulate: seat 3 becomes human (reconnect/join).
  game.seats[3].isBot = false;
  const peek2 = bot1._visiblePartnerHand();
  assert.strictEqual(peek2, null, 'peek revoked when partner flips to human');

  // Revert: seat 3 becomes bot again.
  game.seats[3].isBot = true;
  const peek3 = bot1._visiblePartnerHand();
  assert.ok(Array.isArray(peek3), 'peek restored when partner flips back to bot');
  assert.deepStrictEqual(peek3, game.hands[3], 'peek returns seat 3 hand again');
  ok('7f peek tracks isBot flag per-decision');
} catch (e) { fail('7f bot↔human swap', e); }

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function run() {
  await test7c();
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
