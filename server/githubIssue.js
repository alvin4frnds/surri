'use strict';

require('dotenv').config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'alvin4frnds';
const REPO_NAME = 'surri';

async function createIssue({ description, screenshot, gameState, mySeat, roomCode }) {
  if (!GITHUB_TOKEN) {
    console.error('GITHUB_TOKEN not set — cannot create issue');
    return { ok: false, error: 'GitHub token not configured' };
  }

  const cardLocations = formatCardLocations(gameState);
  const gameInfo = formatGameInfo(gameState, mySeat, roomCode);

  // GitHub has a ~65535 char limit on issue body; base64 screenshots are large.
  // Upload screenshot as a separate comment or truncate if needed.
  const hasScreenshot = screenshot && screenshot.length > 0;

  const body = [
    '## Bug Report',
    '',
    `**Description:** ${description}`,
    '',
    gameInfo,
    '',
    '<details><summary>Card Locations</summary>',
    '',
    cardLocations,
    '',
    '</details>',
    '',
    '<details><summary>Full Game State (JSON)</summary>',
    '',
    '```json',
    JSON.stringify(gameState, null, 2),
    '```',
    '',
    '</details>',
  ].join('\n');

  const title = `[Bug Report] ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`;

  try {
    const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        labels: ['bug', 'in-game-report'],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('GitHub API error:', res.status, text);
      return { ok: false, error: `GitHub API error: ${res.status}` };
    }

    const issue = await res.json();

    // Upload screenshot to repo and link in a comment
    if (hasScreenshot) {
      try {
        const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
        const filename = `screenshots/issue-${issue.number}.png`;

        const uploadRes = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filename}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${GITHUB_TOKEN}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: `Add screenshot for issue #${issue.number}`,
              content: base64Data,
            }),
          }
        );

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const imageUrl = uploadData.content.download_url;
          await fetch(
            `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issue.number}/comments`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                body: `**Screenshot:**\n\n![screenshot](${imageUrl})`,
              }),
            }
          );
        } else {
          const text = await uploadRes.text();
          console.error('Screenshot upload failed:', uploadRes.status, text);
        }
      } catch (screenshotErr) {
        console.error('Screenshot upload failed:', screenshotErr);
      }
    }

    console.log(`GitHub issue created: #${issue.number} - ${issue.html_url}`);
    return { ok: true, issueNumber: issue.number, url: issue.html_url };
  } catch (err) {
    console.error('Failed to create GitHub issue:', err);
    return { ok: false, error: err.message };
  }
}

function formatGameInfo(state, mySeat, roomCode) {
  if (!state) return '**Game Info:** No state available';
  return [
    '**Game Info:**',
    `- Room: ${roomCode || 'N/A'} | Phase: ${state.phase || 'N/A'} | Round: ${state.round ?? 'N/A'}`,
    `- Dealer: Seat ${state.dealer ?? 'N/A'} | Active: Seat ${state.activeSeat ?? 'N/A'}`,
    `- Bid: ${state.bid ?? 'none'} by Seat ${state.biddingSeat ?? 'N/A'} | Trump: ${state.trump || 'none'}`,
    `- Dealer Score: ${state.dealerScore ?? 0}`,
    `- Reporter: Seat ${mySeat}`,
    `- Tricks: ${JSON.stringify(state.tricks || {})}`,
  ].join('\n');
}

function formatCardLocations(state) {
  if (!state) return 'No state available';

  const lines = ['| Card | Location |', '|------|----------|'];

  // Cards in reporter's hand
  if (state.myHand) {
    for (const card of state.myHand) {
      lines.push(`| ${card} | My hand (Seat ${state.mySeat ?? '?'}) |`);
    }
  }

  // Partner hand (if revealed)
  if (state.partnerHand) {
    const partnerSeat = state.biddingSeat != null ? (state.biddingSeat + 2) % 4 : '?';
    for (const card of state.partnerHand) {
      lines.push(`| ${card} | Partner hand (Seat ${partnerSeat}) |`);
    }
  }

  // Cards in current trick
  if (state.currentTrick) {
    for (const entry of state.currentTrick) {
      lines.push(`| ${entry.card} | Current trick (Seat ${entry.seat}) |`);
    }
  }

  // Hand sizes for other players
  if (state.handSizes) {
    for (const [seat, size] of Object.entries(state.handSizes)) {
      if (size > 0) {
        lines.push(`| (${size} cards) | Seat ${seat} hand (hidden) |`);
      }
    }
  }

  // Last trick
  if (state.lastTrick) {
    for (const entry of state.lastTrick) {
      lines.push(`| ${entry.card} | Last trick (Seat ${entry.seat}) |`);
    }
  }

  return lines.join('\n');
}

module.exports = { createIssue };
