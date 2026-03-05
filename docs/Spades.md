# Spades — Rules Reference

Source: [Wikipedia — Spades (card game)](https://en.wikipedia.org/wiki/Spades_(card_game))

This document covers standard partnership Spades rules. Surri inherits the **trick-taking engine** from Spades (follow suit, trump wins, card rank) but **replaces** bidding, scoring, trump selection, dealer rotation, and win conditions. For the actual game rules, see [GameFlow.md](GameFlow.md).

---

## Overview

- **Players**: 4, in 2 fixed partnerships. Partners sit across from each other.
- **Deck**: Standard 52-card deck (no Jokers in base game).
- **Trump**: Spades are always trump. No bidding to determine trump.
- **Goal**: First team to reach **500 points** wins.

---

## Card Rank

High → Low: **A K Q J 10 9 8 7 6 5 4 3 2**

Applies to all suits. Within spades (trump), same rank order applies.

---

## The Deal

1. First dealer chosen by drawing cards — highest card deals first.
2. Deal rotates **left** (clockwise) after each hand.
3. The player to the dealer's **right** may cut the deck before dealing.
4. Dealer deals all 52 cards face-down, one at a time, clockwise.
5. Each player receives exactly **13 cards**.
6. Players pick up and arrange their hand (typically by suit, then rank).

**Misdeal**: If any player receives the wrong number of cards, the hand is void and must be redealt by the same dealer.

---

## Bidding

- Bidding starts with the player to the **left of the dealer**, proceeds clockwise, ends with the dealer.
- Each player independently bids the number of tricks they expect to win.
- **Minimum bid**: 1. The only exception is a Nil bid (0).
- In partnership play, the two partners' bids are **added together** to form the team's contract.
- Spades are never named during bidding — they are always trump.

### Nil (0)

A player bids Nil to declare they will take **zero tricks** this hand.

- If successful (0 tricks taken): **+100** points to the partnership.
- If broken (any trick taken): **−100** points to the partnership.
- Partner's bid and scoring are unaffected; partner still plays normally.

### Blind Nil

A player bids Nil **before looking at their cards**.

- Only allowed when the bidding team is **100 or more points behind**.
- If successful: **+200** points to the partnership.
- If broken: **−200** points to the partnership.
- The blind nil bidder may **pass 2 cards** to their partner and receive 2 cards back (variant rule — confirm before implementing).

### Blind (non-nil)

A player bids a number before looking at their cards for a bonus multiplier. Less common — include only if added as a Surri variant.

---

## Gameplay

### Leading the First Trick

The player to the **left of the dealer** leads the first trick by playing any card except a spade (unless spades are already broken or the player holds only spades).

### Following Suit

- Players must **follow suit** (play a card of the same suit as the led card) if they are able.
- If unable to follow suit, a player may play **any card**, including a spade (trump).

### Breaking Spades

- A player **may not lead spades** until spades have been "broken."
- Spades are broken the first time any player plays a spade on a trick (when unable to follow suit).
- Once broken, spades may be freely led on subsequent tricks.
- **Exception**: A player whose entire remaining hand is spades may lead a spade even if spades are not broken.

### Winning a Trick

- A trick is won by the **highest spade played**, if any spades were played.
- If no spades were played, the trick is won by the **highest card of the suit that was led**.
- Cards of non-led, non-spade suits have no value in a trick.
- The winner of a trick **leads the next trick**.

### Played Cards

- Once a card leaves a player's hand, it stands and cannot be taken back (unless corrected before the next player plays).
- Players may not conceal the number of tricks they have won — the count must be shown on request.

---

## Scoring

Scoring is calculated at the end of each hand (after all 13 tricks are played).

### Making Your Bid (Team)

```
Score = (10 × team_bid) + overtricks
```

- **Overtricks (bags)**: Each trick won above the team's bid counts as 1 bag and 1 point.

### Failing Your Bid (Set)

```
Score = −(10 × team_bid)
```

- The team is "set" — they lose points equal to 10× their contract.
- Overtricks are irrelevant if the team is set.

### Nil Scoring (Individual)

Nil bids are scored **independently** of the team contract:

| Outcome | Points |
|---|---|
| Nil made (0 tricks taken) | +100 |
| Nil broken (any trick taken) | −100 |
| Blind nil made | +200 |
| Blind nil broken | −200 |

The nil bidder's tricks do not count toward or against the partner's bid.

### Bag Penalty

- Each overtrick = 1 bag, tracked cumulatively across hands.
- Every **10 bags accumulated**: **−100 points** and bags reset to 0.
- This rule discourages deliberately overbidding to score easy points.

---

## Winning

- First team to reach **500 points** wins the game.
- If both teams reach 500 in the same hand, the **higher score wins**.
- Some variants use 200 or 250 as the target — use 500 for standard play.
- A team that falls to **−200 points** may be declared the loser (optional rule).

---

## Summary of Scoring Quick Reference

| Situation | Points |
|---|---|
| Make bid | +10 × bid |
| Each overtrick (bag) | +1 |
| Every 10 bags | −100 (bags reset) |
| Set (fail bid) | −10 × bid |
| Nil made | +100 |
| Nil broken | −100 |
| Blind nil made | +200 |
| Blind nil broken | −200 |
