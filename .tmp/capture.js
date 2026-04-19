// Captures screenshots of Surri in a given design direction.
//   node capture.js <outDir>
// Assumes: dev server on http://localhost:5173 + backend on :3000.

const puppeteer = require('C:\\Users\\Praveen\\AppData\\Local\\Temp\\surri-ss\\node_modules\\puppeteer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT_DIR = process.argv[2];
const PORT = process.argv[3] || '5173';
if (!OUT_DIR) { console.error('Usage: node capture.js <outDir> [port]'); process.exit(1); }
fs.mkdirSync(OUT_DIR, { recursive: true });

const BASE = `http://localhost:${PORT}`;
const W = 390, H = 844;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex').slice(0, 8);

async function shot(page, name) {
  const p = path.join(OUT_DIR, name + '.png');
  await page.screenshot({ path: p });
  console.log('  captured', name, '(' + md5(p) + ')');
  return p;
}

// Click the first visible element whose textContent (trimmed) matches the predicate.
// Scrolls into view first and uses native dispatch to avoid stale-handle issues.
async function clickWhere(page, fn, { timeout = 5000, label = 'button' } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const clicked = await page.evaluate((fnSrc) => {
      const predicate = eval('(' + fnSrc + ')');
      const nodes = [...document.querySelectorAll('button, a, [role="button"]')];
      const el = nodes.find(n => {
        if (n.disabled) return false;
        const rect = n.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return false;
        return predicate(n);
      });
      if (!el) return false;
      el.scrollIntoView({ block: 'center' });
      el.click();
      return true;
    }, fn.toString());
    if (clicked) { await sleep(200); return true; }
    await sleep(150);
  }
  throw new Error(`${label} not found/clickable within ${timeout}ms`);
}

// These predicates get stringified and eval'd inside page.evaluate, so the
// regex or string has to be INLINE in the returned function body — no closure
// references across the page-context boundary.
const byText = (re) => {
  const src = re.source.replace(/`/g, '\\`');
  const flags = re.flags;
  return new Function('el', `return (new RegExp(\`${src}\`, "${flags}")).test(el.textContent.trim());`);
};
const byExactText = (s) => {
  const esc = s.toLowerCase().replace(/`/g, '\\`');
  return new Function('el', `return el.textContent.trim().toLowerCase() === \`${esc}\`;`);
};

async function waitText(page, re, { timeout = 6000 } = {}) {
  const deadline = Date.now() + timeout;
  const rx = typeof re === 'string' ? new RegExp(re, 'i') : re;
  while (Date.now() < deadline) {
    const found = await page.evaluate((p, flags) => {
      const r = new RegExp(p, flags);
      return r.test(document.body.innerText);
    }, rx.source, rx.flags);
    if (found) return true;
    await sleep(150);
  }
  return false;
}

async function inDialog(page, fn) {
  // find within [role="dialog"], aria-modal, or a last-rendered fixed overlay
  return await page.evaluate((fnSrc) => {
    const predicate = eval('(' + fnSrc + ')');
    // Prefer explicit dialogs
    const dialogs = [...document.querySelectorAll('[role="dialog"], [aria-modal="true"]')];
    let root = dialogs[dialogs.length - 1];
    if (!root) {
      // heuristic: find outermost fixed-positioned container that has >300px height and is in the top-layer
      const fixeds = [...document.querySelectorAll('*')].filter(n => {
        const cs = getComputedStyle(n);
        return cs.position === 'fixed' && n.getBoundingClientRect().height > 200;
      });
      root = fixeds[fixeds.length - 1];
    }
    if (!root) return false;
    const btns = [...root.querySelectorAll('button, a, [role="button"]')];
    const el = btns.find(b => !b.disabled && predicate(b));
    if (!el) return false;
    el.click();
    return true;
  }, fn.toString());
}

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: { width: W, height: H, deviceScaleFactor: 2 },
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') console.log('  [err]', msg.text().slice(0, 120)); });

  try {
    // Pre-seed name so openCreateSheet doesn't silently no-op
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await page.evaluate(() => localStorage.setItem('surri_name', 'Praveen'));
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(700);

    // 01 — Lobby
    await shot(page, '01-lobby');

    // 02 — Bot count / new-room sheet
    await clickWhere(page, byText(/create room/i), { label: 'Create Room' });
    await sleep(500);
    await shot(page, '02-bot-count');

    // 03 — Waiting room (pick 3 bots, start room)
    await clickWhere(page, byExactText('3'), { timeout: 3000, label: '3 bots' }).catch(() => {});
    await sleep(250);
    await clickWhere(page, byText(/start room/i), { label: 'Start Room' });
    if (!await waitText(page, /room code/i, { timeout: 8000 })) console.log('  [warn] room code text not seen');
    await sleep(700);
    await shot(page, '03-waiting-room');

    // 04 — Bidding (your turn)
    await clickWhere(page, byText(/start game/i), { label: 'Start Game' });
    if (!await waitText(page, /your turn to bid/i, { timeout: 15000 })) console.log('  [warn] your turn text not seen');
    await sleep(500);
    await shot(page, '04-bidding-your-turn');

    // 05 — Support received
    await clickWhere(page, byText(/^ask partner$/i), { label: 'Ask Partner' }).catch(() => {});
    if (!await waitText(page, /says|full|major|minor/i, { timeout: 5000 })) console.log('  [warn] support response not seen');
    await sleep(400);
    await shot(page, '05-bidding-support');

    // 06 — Suit selected — heart is one of the 4 suit pickers. Match any button
    // whose trimmed text contains the heart glyph (minimal shows ♥ directly, modern wraps it).
    const heartClicked = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')].filter(b => {
        const t = b.textContent.trim();
        const r = b.getBoundingClientRect();
        return t.includes('\u2665') && t.length <= 4 && r.width > 0 && r.height > 0;
      });
      if (btns.length) { btns[0].scrollIntoView({ block: 'center' }); btns[0].click(); return true; }
      return false;
    });
    if (!heartClicked) console.log('  [warn] heart suit button not clicked');
    await sleep(400);
    await shot(page, '06-bidding-suit-selected');

    // 07 — Partner reveal (confirm bid)
    await clickWhere(page, byText(/^confirm/i), { label: 'Confirm Bid' }).catch(async () => {
      await clickWhere(page, byText(/confirm.*bid|bid.*confirm/i), { label: 'Confirm Bid (fuzzy)' });
    });
    await waitText(page, /partner reveal|increase bid|you bid/i, { timeout: 6000 });
    await sleep(500);
    await shot(page, '07-partner-reveal');

    // 08 — Playing — your turn. The partner-reveal CTA is "START ▶" (modern) or
    // "Start play" (minimal). Match anything that starts with "start" case-insensitively.
    const startClicked = await page.evaluate(() => {
      const candidates = [...document.querySelectorAll('button')].filter(b => {
        const t = b.textContent.trim().toLowerCase();
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && /^start\b/.test(t);
      });
      if (candidates.length) { candidates[0].scrollIntoView({ block: 'center' }); candidates[0].click(); return true; }
      return false;
    });
    if (!startClicked) console.log('  [warn] Start button (partner reveal) not clicked');
    if (!await waitText(page, /your turn|TRAM|dhaap/i, { timeout: 6000 })) console.log('  [warn] playing state not seen');
    await sleep(800);
    await shot(page, '08-playing-your-turn');

    // Helper: some designs hide chrome actions behind a ⋮ overflow menu.
    // Try to open it, ignore failure (modern keeps actions inline).
    const openOverflowMenu = async () => {
      return await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter(b => {
          const t = b.textContent.trim();
          const r = b.getBoundingClientRect();
          // vellip (⋮ U+22EE) or its glyph-font equivalent
          return (t === '\u22EE' || t === '⋮' || t === '·') && r.width > 0 && r.height > 0;
        });
        if (btns.length) { btns[0].click(); return true; }
        return false;
      });
    };

    // 09 — Help overlay
    // strategy: open overflow menu → click "How to play"; fallback: click "?" FAB.
    let helpOpened = false;
    if (await openOverflowMenu()) {
      await sleep(200);
      await page.evaluate(() => {
        const items = [...document.querySelectorAll('button')].filter(b => /how to play/i.test(b.textContent.trim()));
        if (items.length) items[0].click();
      });
      helpOpened = await waitText(page, /how to play/i, { timeout: 4000 });
    }
    if (!helpOpened) {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter(b => {
          const t = b.textContent.trim();
          const r = b.getBoundingClientRect();
          return t === '?' && r.width > 4 && r.height > 4;
        });
        if (btns.length) btns[0].click();
      });
      helpOpened = await waitText(page, /how to play/i, { timeout: 3000 });
    }
    if (!helpOpened) console.log('  [warn] help overlay did not open');
    await sleep(500);
    await shot(page, '09-help-modal');
    // close help — try matching Close/✕/X text on any visible button; fall back to Escape
    if (helpOpened) {
      const closed = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter(b => {
          const t = b.textContent.trim();
          const r = b.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && /^(close|[\u2715\u00D7\u2716xX])$/i.test(t);
        });
        if (btns.length) { btns[btns.length - 1].click(); return true; }
        return false;
      });
      if (!closed) await page.keyboard.press('Escape');
      await sleep(500);
      // verify the overlay actually closed
      const stillOpen = await waitText(page, /how to play/i, { timeout: 500 });
      if (stillOpen) {
        await page.keyboard.press('Escape');
        await sleep(300);
      }
    }

    // 10 — Report Issue modal
    let issueOpened = false;
    if (await openOverflowMenu()) {
      await sleep(200);
      await page.evaluate(() => {
        const items = [...document.querySelectorAll('button')].filter(b => /report an issue|report issue/i.test(b.textContent.trim()));
        if (items.length) items[0].click();
      });
      issueOpened = await waitText(page, /report issue|describe the issue/i, { timeout: 4000 });
    }
    if (!issueOpened) {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter(b => {
          const t = b.textContent.trim().toLowerCase();
          const r = b.getBoundingClientRect();
          return (t === 'issue' || t.endsWith(' issue')) && !t.includes('submit') && r.width > 0 && r.height > 0;
        });
        if (btns.length) btns[0].click();
      });
      issueOpened = await waitText(page, /report issue|describe the issue/i, { timeout: 3000 });
    }
    if (!issueOpened) console.log('  [warn] issue modal did not open');
    await sleep(500);
    await shot(page, '10-report-issue');
    if (issueOpened) {
      await inDialog(page, byText(/^cancel$/i));
      await sleep(400);
    }

    // 11 — Give Up confirmation dialog
    let giveUpOpened = false;
    if (await openOverflowMenu()) {
      await sleep(200);
      await page.evaluate(() => {
        const items = [...document.querySelectorAll('button')].filter(b => /give up this round|give up/i.test(b.textContent.trim()));
        if (items.length) items[0].click();
      });
      giveUpOpened = await waitText(page, /give up this round|remaining tricks|all remaining/i, { timeout: 4000 });
    }
    if (!giveUpOpened) {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')].filter(b => {
          const t = b.textContent.trim().toLowerCase();
          const r = b.getBoundingClientRect();
          return t === 'give up' && r.width > 0 && r.height > 0;
        });
        if (btns.length) btns[0].click();
      });
      giveUpOpened = await waitText(page, /give up this round|remaining tricks|all remaining/i, { timeout: 3000 });
    }
    if (!giveUpOpened) console.log('  [warn] give up dialog did not open');
    await sleep(400);
    await shot(page, '11-give-up-confirm');

    // 12 — Round summary (confirm give up inside dialog)
    if (giveUpOpened) {
      await page.evaluate(() => {
        // After dialog opens, there should be exactly one visible "Give up" button (the confirm).
        // In some designs it coexists with the chrome button — prefer the one with a red/destructive colour.
        const candidates = [...document.querySelectorAll('button')].filter(b => {
          const t = b.textContent.trim().toLowerCase();
          const r = b.getBoundingClientRect();
          return /^give up$/.test(t) && r.width > 0 && r.height > 0;
        });
        // The dialog-confirm is later in the DOM than the chrome trigger.
        const confirm = candidates[candidates.length - 1];
        if (confirm) confirm.click();
      });
    }
    if (!await waitText(page, /round lost|round won|you lost|you won|next round|score change|round summary/i, { timeout: 8000 })) {
      console.log('  [warn] round summary not seen');
    }
    await sleep(1200);
    await shot(page, '12-round-summary');

    console.log('done.');
  } catch (e) {
    console.error('FAILED:', e.message);
    await shot(page, 'ERROR').catch(() => {});
  } finally {
    await browser.close();
  }
})();
