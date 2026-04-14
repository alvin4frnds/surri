'use strict';

process.env.FAST_TEST = '1';

const assert = require('assert');
const { SurriGame, RANKS, SUITS, cardRank, cardSuit } = require('./gameLogic');
const { AIPlayer, _countSuitLed, highestRemainingInSuit } = require('./aiPlayer');

let passed = 0;
let failed = 0;

function ok(name) { passed++; console.log(`  PASS: ${name}`); }
function fail(name, err) { failed++; console.log(`  FAIL: ${name} — ${err.message}`); }

// ---------------------------------------------------------------------------
// Helper: set up a game in playing phase with manipulated state
// Bot at seat 0, on bidding team, bid already met (so _decideLeadCard falls to default)
// ---------------------------------------------------------------------------
function makeTestGame(opts = {}) {
  const seats = [
    { name: 'Bot0', isBot: true, isConnected: true },
    { name: 'Bot1', isBot: true, isConnected: true },
    { name: 'Bot2', isBot: true, isConnected: true },
    { name: 'Bot3', isBot: true, isConnected: true },
  ];
  const game = new SurriGame(seats);

  // Force into playing phase
  game.phase = 'playing';
  game.trump = opts.trump || 'S';
  game.bid = opts.bid || 8;
  game.biddingSeat = opts.biddingSeat ?? 2; // seat 0 & 2 are bidding team
  game.biddingTeam = game.biddingSeat % 2;
  game.dealer = opts.dealer ?? 3;
  game.activeSeat = 0;
  game.currentTrick = [];
  game.dhaaps = {};
  game.round = 1;

  // Bidding team already met target so belowTarget=false
  game.tricks = opts.tricks || { 0: 5, 1: 0, 2: 4, 3: 0 };

  game.hands = opts.hands || [
    ['AH', '3H', '7S', '5D', '2C'],
    ['2D', '4D', '6D', '8D', 'JD'],
    ['2C', '4C', '6C', '8C', 'JC'],
    ['5D', '8D', 'JD', 'QD', 'KD'],
  ];

  game.playedCards = opts.playedCards || [];
  game.voidSuits = opts.voidSuits || {
    0: new Set(), 1: new Set(), 2: new Set(), 3: new Set()
  };
  game.playedCards = opts.playedCards || [];
  game._tricksPlayed = opts._tricksPlayed || 0;

  return game;
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------
console.log('\n--- Unit: _countSuitLed ---');

try {
  assert.strictEqual(_countSuitLed([], 'H'), 0);
  ok('empty playedCards → 0');
} catch (e) { fail('empty playedCards → 0', e); }

try {
  // 1 trick led with H, 1 trick led with D
  const cards = ['2H', '5S', '6D', '7C', '3D', '8S', '9H', 'JC'];
  assert.strictEqual(_countSuitLed(cards, 'H'), 1);
  assert.strictEqual(_countSuitLed(cards, 'D'), 1);
  assert.strictEqual(_countSuitLed(cards, 'S'), 0);
  ok('mixed tricks counted correctly');
} catch (e) { fail('mixed tricks counted correctly', e); }

try {
  // 3 tricks all led with H
  const cards = [
    '2H', '5S', '6D', '7C',
    '4H', '8S', '9D', 'JC',
    '6H', 'QS', 'KD', 'AC',
  ];
  assert.strictEqual(_countSuitLed(cards, 'H'), 3);
  ok('3 tricks led with H');
} catch (e) { fail('3 tricks led with H', e); }

console.log('\n--- Unit: highestRemainingInSuit ---');

try {
  // AH in hand, nothing higher exists — returns AH
  const result = highestRemainingInSuit('H', ['AH', '3H', '7S'], []);
  assert.strictEqual(result, 'AH');
  ok('AH is highest remaining');
} catch (e) { fail('AH is highest remaining', e); }

try {
  // KH in hand, AH not played and not in hand — someone else has it
  const result = highestRemainingInSuit('H', ['KH', '3S'], []);
  assert.strictEqual(result, null);
  ok('KH not highest when AH unaccounted');
} catch (e) { fail('KH not highest when AH unaccounted', e); }

try {
  // KH in hand, AH already played — KH is highest remaining
  const result = highestRemainingInSuit('H', ['KH', '3S'], ['AH', '5D', '6C', '7S']);
  assert.strictEqual(result, 'KH');
  ok('KH highest after AH played');
} catch (e) { fail('KH highest after AH played', e); }

try {
  // No cards of suit in hand
  const result = highestRemainingInSuit('H', ['3S', '5D'], []);
  assert.strictEqual(result, null);
  ok('no cards in suit → null');
} catch (e) { fail('no cards in suit → null', e); }

// ---------------------------------------------------------------------------
// Integration tests — Dhaap declaration via decideAction
// ---------------------------------------------------------------------------

async function integrationTests() {
  console.log('\n--- Integration: Dhaap Rule 1 (highest remaining) ---');

  // Test: Rule 1 positive — holds AH, leads 3H (lowest non-trump), suit led 0 times → Dhaap
  // Hand has only H and trump so lowest non-trump is 3H, and AH stays as highest remaining
  try {
    const game = makeTestGame({
      hands: [
        ['AH', '3H', '7S'],
        ['2D', '4D', '6D'],
        ['2C', '4C', '6C'],
        ['5D', '8D', 'JD'],
      ],
      playedCards: [],
    });
    const bot = new AIPlayer(0, game);
    await bot.decideAction();
    assert.strictEqual(game.dhaaps[0], true, 'should have declared Dhaap');
    ok('Rule 1 positive: AH in hand, suit led 0 times → Dhaap');
  } catch (e) { fail('Rule 1 positive: AH in hand, suit led 0 times → Dhaap', e); }

  // Test: Rule 1 negative — suit led 2 times → no Dhaap
  try {
    const game = makeTestGame({
      hands: [
        ['AH', '3H', '7S'],
        ['2D', '4D', '6D'],
        ['2C', '4C', '6C'],
        ['5D', '8D', 'JD'],
      ],
      playedCards: [
        '2H', '5S', '6D', '7C',
        '4H', '8S', '9D', 'JC',
      ],
    });
    const bot = new AIPlayer(0, game);
    await bot.decideAction();
    assert.strictEqual(!!game.dhaaps[0], false, 'should NOT have declared Dhaap');
    ok('Rule 1 negative: suit led 2 times → no Dhaap');
  } catch (e) { fail('Rule 1 negative: suit led 2 times → no Dhaap', e); }

  console.log('\n--- Integration: Dhaap Rule 2 (void + trump) ---');

  // Test: Rule 2 positive — last H card (3H is lowest non-trump), has trump, no opponent void → Dhaap
  // Hand: only one H card + trump, so 3H is lowest non-trump and bot goes void in H after
  try {
    const game = makeTestGame({
      hands: [
        ['3H', '7S'],
        ['2D', '4D'],
        ['2C', '4C'],
        ['5D', '8D'],
      ],
      playedCards: [],
    });
    const bot = new AIPlayer(0, game);
    await bot.decideAction();
    assert.strictEqual(game.dhaaps[0], true, 'should have declared Dhaap');
    ok('Rule 2 positive: void after play, has trump → Dhaap');
  } catch (e) { fail('Rule 2 positive: void after play, has trump → Dhaap', e); }

  // Test: Rule 2 negative — opponent void in H → no Dhaap
  try {
    const game = makeTestGame({
      hands: [
        ['3H', '7S'],
        ['2D', '4D'],
        ['2C', '4C'],
        ['5D', '8D'],
      ],
      playedCards: [],
      voidSuits: {
        0: new Set(), 1: new Set(['H']), 2: new Set(), 3: new Set()
      },
    });
    const bot = new AIPlayer(0, game);
    await bot.decideAction();
    assert.strictEqual(!!game.dhaaps[0], false, 'should NOT have declared Dhaap');
    ok('Rule 2 negative: opponent void in suit → no Dhaap');
  } catch (e) { fail('Rule 2 negative: opponent void in suit → no Dhaap', e); }

  // Test: Rule 2 negative — suit led 3 times → no Dhaap
  try {
    const game = makeTestGame({
      hands: [
        ['3H', '7S'],
        ['2D', '4D'],
        ['2C', '4C'],
        ['5D', '8D'],
      ],
      playedCards: [
        '2H', '5S', '6D', '7C',
        '4H', '8S', '9D', 'JC',
        '6H', 'QS', 'KD', 'AC',
      ],
    });
    const bot = new AIPlayer(0, game);
    await bot.decideAction();
    assert.strictEqual(!!game.dhaaps[0], false, 'should NOT have declared Dhaap');
    ok('Rule 2 negative: suit led 3 times → no Dhaap');
  } catch (e) { fail('Rule 2 negative: suit led 3 times → no Dhaap', e); }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
async function run() {
  await integrationTests();
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
