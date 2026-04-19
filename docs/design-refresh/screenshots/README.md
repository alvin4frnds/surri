# Design-Refresh Screenshot Set

Captured via puppeteer at 390×844 (DPR 2 → 780×1688 PNGs) on the actual built bundle from each branch.

## Branches

| Direction | Friendly name | Underlying branch | Commit |
|---|---|---|---|
| Paper minimal | `design/minimal` | `worktree-agent-a8acef7b` | `2d5279e` |
| Late-night modern | `design/modern` | `worktree-agent-ad068d46` | `4387e1f` |

Both branches inherit every pre-existing working-tree commit from master (as of `b3aabb2`) and only add their design changes. Backend (`server/`), socket events, and component prop/emit signatures are untouched — gameplay is identical.

## Files

- `minimal/01-lobby.png` … `minimal/12-round-summary.png` — 12 states, Paper direction.
- `modern/01-lobby.png` … `modern/12-round-summary.png` — same 12 states, late-night direction.

Same state names / sequence in both, so you can flip between the two folders file-by-file to compare.

## States captured

| # | State | Reached by |
|---|---|---|
| 01 | Lobby (initial) | Fresh page load |
| 02 | Bot-count picker | Click Create Room |
| 03 | Waiting room (host, 3 bots queued) | Pick 3, Start Room |
| 04 | Bidding — your turn | Start Game → wait for "Your turn to bid" |
| 05 | Bidding — partner gave support | Click Ask Partner |
| 06 | Bidding — suit selected | Click ♥ tile |
| 07 | Partner reveal (bid 10+) | Confirm Bid |
| 08 | Playing — your turn, partner's hand revealed | Click Start on partner reveal |
| 09 | Help overlay | Click "?" FAB |
| 10 | Report Issue modal | Click Issue button |
| 11 | Give Up confirmation | Click Give Up |
| 12 | Round summary (attempted) | Confirm Give Up |

## Known issues found during capture

- **Modern 04–08**: middle of the board renders as a vertical stack of small card-back tiles instead of the three opposing seat positions. Looks like a flex/absolute-position regression in `GameBoard.vue` in the modern direction — needs a layout pass before shipping. Top/bottom are fine; seat pills collapse.
- **Both 12 (round summary)**: my capture script's Give Up → confirm path didn't actually land on the summary modal — both files show the playing state instead of the Round Summary. This is a script issue, not a design issue. The overlay itself exists in both branches (see `RoundSummary.vue` on each branch) but needs a cleaner interaction path to reach.
- **Modern 10 (report issue)**: captured a playing state instead of the modal — the "Issue" button match was greedy and matched a different element first.

## Re-capturing

Script: `.tmp/capture.js` (uses puppeteer installed at `%TEMP%\surri-ss\node_modules\puppeteer`).

To re-run for either direction:

```bash
# 1. kill anything on 3000 / 5173
# 2. start server from main repo:
cd server && node server.js &

# 3. start vite preview from the chosen worktree:
cd .claude/worktrees/agent-a8acef7b/client   # or agent-ad068d46
npx vite preview --host --port 5173 &

# 4. capture:
cd ../../../..
node .tmp/capture.js docs/design-refresh/screenshots/<minimal|modern>
```

The capture script pre-seeds `localStorage.surri_name='Praveen'` to bypass the lobby's empty-name guard, then drives the flow via text-matched button clicks.
