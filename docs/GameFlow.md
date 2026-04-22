# Game Flow — Surri

This is the authoritative game flow for Surri, a trick-taking card game that uses standard Spades as its trick-taking engine but replaces bidding, scoring, trump selection, and win conditions with custom rules. See [Spades.md](Spades.md) for the base trick-taking rules inherited unchanged.

---

## What Stays from Spades

- 4 players, 2 teams (partners sit across), standard 52-card deck, 13 cards each
- Card rank: A K Q J 10 9 8 7 6 5 4 3 2
- Must follow suit; if void, may play any card (including trump)
- Trick won by highest trump played, else highest card of led suit
- Trick winner leads the next trick
- Player left of dealer leads trick 1
- Cards dealt clockwise, 1 at a time

## What Surri Replaces

- **Trump**: Chosen by the bidder each round (not always spades)
- **No breaking rule**: Any suit (including trump) can be led at any time
- **Bidding**: Sequential pass/bid — only 1 team bids per round
- **Scoring**: Dealer-only score, high = bad, ≥52 = lose
- **No Nil bids, no bags, no 500-point target**
- **Rounds can end early** when bid is made or broken
- **Bid ≥10**: Reveals partner's hand to all; bidder controls partner's card play
- **TRAM**: Claim mechanic for remaining needed tricks

---

## 1. Session Setup

1. A player creates or joins a room (room code or matchmaking).
2. 4 seats total. Empty seats filled by AI bots (0–3 bots configurable at creation).
3. Teams auto-assigned by seat: **Seats 0 & 2** (Team A) vs **Seats 1 & 3** (Team B).
4. Game starts when all 4 seats are filled.

---

## 2. Round Start — Deal

1. **First dealer**: Chosen by highest-card draw on the very first round.
2. **Shuffle**:
   - First deal of the game: take a sorted deck and perform **15 cut shuffles**.
   - Every subsequent deal: collect won tricks **clockwise** and perform **5 cut shuffles**.
3. **Cut** *(optional)*: Player to the dealer's right may cut the deck.
4. **Deal**: 13 cards dealt clockwise, one at a time, starting from the player left of the dealer.
5. Players view their 13-card hand.

---

## 3. Bidding Phase

Bidding is sequential, not parallel. Only one team will end up bidding.

### 3a. Bidding Round 1 — Pass or Bid ≥10

Starting with the player to the **left of the dealer**, proceeding **clockwise** through all 4 players:

1. The active player views their hand.
2. *(Optional)* The player may publicly **ask their partner for support**. The partner responds with one of:
   - **Major** — strong support
   - **Minor** — weak support
   - **Pass** — no support

   This exchange is visible to all players.
3. The player either:
   - **Passes** — bidding moves to the next player clockwise, OR
   - **Bids ≥10** — and names a **trump suit** for this round.

If any player bids, bidding round 1 ends. That player's team is the **bidding team**.

### 3b. Forced Bid — All 4 Pass

If all 4 players pass, the **first player** (left of dealer) is forced to bid **≥8** and name a trump suit. The forced bidder may still ask their partner for support before bidding.

- If the forced bid is **8 or 9**: partner's hand is NOT revealed; bidder does NOT control partner's cards.
- If the forced bid is **≥10**: treated as a normal ≥10 bid — partner hand reveal and control apply (see 3c).

### 3c. Overbid Window (bid ≥10 only)

When any player bids ≥10 — voluntary in round 1, or forced when all 4 passed — the game enters an **overbid window** (`phase: bidding_raise`). Each of the other three seats, in clockwise order starting from the first bidder's left, gets exactly **one** action:

- **Pass** — yield to the current bid.
- **Raise** — bid at least `currentBid + 1`, pick any trump suit (same as current or different). The raiser becomes the new bidding team.

A raise **does not reset the window** — the queue of three remaining seats continues clockwise. Each seat acts at most once per round, regardless of how many raises land.

During the window:
- The partner hand stays hidden from every client (clients see `partnerHand: null`).
- Support signals, TRAM, etc. are unchanged (not applicable in this phase).

When all three have acted, the window closes and the game transitions to **partner reveal** for the final bidder.

If the bid is 8 or 9 (forced bid only), **no window opens** — the game goes straight to playing with no partner reveal.

### 3d. Post-Window — Partner Hand Reveal (bid ≥10 only)

Once the overbid window closes with a final bid ≥10:

1. The **final bidder's partner's hand** is revealed to **all players** (not just the bidder).
2. The bidder may **increase** their bid (never decrease) after seeing partner's hand.
3. The bidder presses **"Start"** to begin the playing phase.
4. During play, the **bidder selects which card the partner plays** each trick (full control of partner's hand).

If the bid is 8 or 9 (forced bid), partner's hand is NOT revealed and the bidder does NOT control partner's cards.

### Result

- Exactly **1 team** is the "bidding team" with a bid of X and a chosen trump suit.
- The other team is the **"defending team"** — their goal is to take enough tricks to break the bid.
- **Bidding team target**: win ≥ X tricks.
- **Defending team target**: win ≥ (14 − X) tricks (e.g., bid 8 → defense needs ≥6).

---

## 4. Playing Phase — Tricks

### Standard Trick-Taking

1. If bid ≥ 10, the **bidder** leads the first trick. Otherwise, **player left of dealer** leads.
2. Each player in clockwise order plays one card:
   - Must follow suit if holding a card of the led suit.
   - If void in led suit, may play any card (including trump).
3. **No breaking rule** — any suit (including trump) can be led at any time.
4. Trick is won by the **highest trump** played; if no trump, by the **highest card of the led suit**.
5. Trick winner leads the next trick.

### Bid ≥10 — Bidder Controls Partner

When bid was ≥10, the bidder selects which card their partner plays on each trick. The partner does not choose independently.

### Early Round Conclusion

The round ends **immediately** when either:
- The **bidding team** reaches their bid target (won ≥ X tricks), OR
- The **defending team** reaches their counter-target (won ≥ 14 − X tricks).

Remaining tricks are not played. The round concludes.

### TRAM — Claiming Remaining Tricks

At any point during the playing phase, **any team** may call TRAM:

1. TRAM claims the **remaining tricks needed to close the round** (not all remaining tricks):
   - Bidding team needs: `bid − tricks_already_won` more tricks.
   - Defending team needs: `(14 − bid) − tricks_already_won` more tricks.
2. The claiming player **selects cards** from their hand **and specifies the order** they would be played. When bid ≥10, the bidder may also select cards from their partner's hand.
3. The server validates each card in order: **no card remaining in any opponent's hand** can beat that trick (considering suit, trump, and follow-suit constraints). Both best-case and worst-case opponent play are considered.
   - **Valid** (every card is provably unbeatable): Round ends immediately. The claiming team wins those tricks.
   - **Invalid** (any card can be challenged): **All remaining tricks** go to the **opposing team**, and the round concludes.

---

## 5. Scoring Phase

Only the **dealer's team** has a score. High score is bad — the goal is to avoid reaching 52.

### Score Formula

| Who bid? | Outcome | Score change |
|---|---|---|
| Non-dealer's team bids X | **Made** bid | dealer_score **+= X** |
| Non-dealer's team bids X | **Failed** bid | dealer_score **−= 2X** |
| Dealer's team bids X | **Made** bid | dealer_score **−= X** |
| Dealer's team bids X | **Failed** bid | dealer_score **+= 2X** |

**Key**: Making your bid is good for your team. Failing has a **2× penalty** against your team.

### Examples

Dealer = Player A (Team A). Score = 20.

| Scenario | Calculation | New Score |
|---|---|---|
| Team B bids 8, makes it | 20 + 8 = 28 | 28 |
| Team B bids 8, fails | 20 − 16 = 4 | 4 |
| Team A bids 10, makes it | 20 − 10 = 10 | 10 |
| Team A bids 10, fails | 20 + 20 = 40 | 40 |

---

## 6. Dealer Rotation

The dealer **stays the same** from round to round unless one of these triggers occurs:

### Trigger 1 — Score ≥ 52 (Loss)

- The current dealer **"loses"**. Their loss counter increments.
- Score resets to **0**.
- The dealer's **partner** becomes the new dealer.

### Trigger 2 — Score Goes Negative

- Score becomes the **absolute value** of the negative number.
- The **next player clockwise** becomes the new dealer (and inherits this score).
- This does **NOT** count as a loss.

### Trigger 3 — Bid of 13 (Instant Win/Lose)

A bid of 13 is an **all-or-nothing** round. The existing score **stops mattering** — think of it as 52 points riding on the outcome. Normal scoring (section 5) does **not** apply. Instead:

- **Made**: The bidding team wins. The opposing side's dealer (or the appropriate player) takes a **loss**.
- **Failed**: The bidding team loses. The bidding side's dealer (or appropriate player) takes a **loss**.

Score **resets to 0** for the new dealer. The bid-13 trigger **takes priority** over score ≥52 and score-negative triggers.

**Dealer rotation** — the current dealer and the player left of dealer (first bidder) are both protected from dealing next:

| Situation | Outcome | Who Loses | Next Dealer |
|---|---|---|---|
| Dealing team bid 13 | Made it | Opponent side | Anti-clockwise from current dealer |
| Dealing team bid 13 | Failed | Dealing team | Partner of current dealer |
| Non-dealing team bid 13 | Made it (won) | Dealing team | Partner of current dealer |
| Non-dealing team bid 13 | Failed (lost) | Non-dealing team | Counter-clockwise from current dealer |

**Note**: Increasing a bid from 10→13 (after seeing partner's hand) activates these bid-13 rules.

---

## 7. Game End

- The game runs **indefinitely** — a typical game lasts 4–5 hours. There is no point target.
- A **loss counter** tracks how many times each player has lost (been dealer when score ≥52, or lost via bid-13).
- When **3 unique players** have each lost at least once, the **4th player** (who has never lost) is declared the **winner**.
- Players can lose multiple times. The game only ends when 3 *distinct* players have ≥1 loss.

---

## 8. Mid-Game Events

### Disconnection

- A disconnected human player's seat is taken by an AI bot.
- If the player reconnects before the game ends, they reclaim their seat.

### Misdeal

- If any player receives the wrong number of cards, the hand is voided and redealt by the same dealer.

---

## State Machine Summary

```
Session Setup (room, teams, bots)
    |
    v
Round Start (shuffle, cut, deal 13 cards)
    |
    v
Bidding Phase
    |-- Support signals (optional, public, available every round)
    |-- Pass/Bid >=10 (clockwise, all 4 players)
    |-- Forced bid >=8 if all pass (support still available)
    |-- Bid >=10: reveal partner hand, increase bid, "Start"
    |
    v
Playing Phase
    |-- Trick: lead -> follow (clockwise) -> resolve
    |-- Bid >=10: bidder controls partner's card
    |-- TRAM: claim remaining needed tricks (optional)
    |-- Round ends early when bid made or broken
    |
    v
Was bid 13? --Yes--> Instant win/lose (score resets to 0, see bid-13 table)
    |                       |
    |                       v
    |                  loss++ for losing side --> check 3 unique losers
    |                       |
    |                      No --> Round Start (new dealer per table)
    |
   No
    |
    v
Scoring Phase (apply score formula)
    |
    v
Score >= 52? --Yes--> Dealer loses (loss++, score=0, partner deals)
    |                       |
    |                       v
    |                  3 unique losers? --Yes--> GAME OVER (4th wins)
    |                       |
    |                      No --> Round Start
    |
Score < 0? ----Yes--> Score = |score|, next clockwise deals (inherits)
    |                       |
    |                       v
    |                  Round Start
    |
   No (0 <= score < 52)
    |
    v
Same dealer continues --> Round Start
```
