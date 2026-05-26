import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const root = resolve('dist/client');
const port = 4307;

const state = {
  subreddit: 'incidentroomtest',
  username: 'reviewer',
  settings: {
    watchTerms: ['giveaway-wallet.example', 'finale spoiler', 'urgent verification'],
    incidentThreshold: 72,
    autoExpireMinutes: 90,
  },
  currentIncident: {
    id: 'incident-spoiler-wave',
    title: 'Spoiler and suspicious-link burst',
    subreddit: 'incidentroomtest',
    status: 'candidate',
    severity: 'critical',
    score: 100,
    triggerReason:
      'Three high-signal items matched watch terms, fresh-account pressure, and report velocity.',
    openedAt: '2026-05-26T12:00:00.000Z',
    evidenceIds: ['ev-spoiler-1', 'ev-spoiler-2', 'ev-link-1'],
    roles: { lead: null, evidence: null, comms: null, backup: null },
    actionPacks: [
      {
        id: 'pack-spoiler-containment',
        label: 'Spoiler containment',
        description:
          'Review matching items, remove confirmed spoilers, and publish one calm status comment.',
        targetEvidenceIds: ['ev-spoiler-1', 'ev-spoiler-2'],
        actions: [
          'Open each linked item before taking action',
          'Remove confirmed violations after moderator confirmation',
          'Add one status note so the team does not duplicate work',
        ],
        riskNote:
          'Incident Room previews the pack only. Reddit-side destructive actions stay behind explicit moderator confirmation.',
        status: 'previewed',
      },
    ],
    aiBrief: {
      status: 'configured',
      provider: 'OpenAI-compatible',
      model: 'configured-model',
      summary:
        'The evidence points to a coordinated spoiler and suspicious-link burst. The safest path is to contain confirmed violations, watch the repeated domain, and leave one clear status note for the mod team.',
      likelyPattern: 'Coordinated incident pattern',
      recommendedActionPack: 'Spoiler containment',
      moderatorCaveats: ['Read each linked item first.', 'Use community rule text in the final note.'],
      generatedAt: '2026-05-26T12:01:00.000Z',
    },
    timeline: [
      {
        id: 'tl-opened',
        at: '2026-05-26T12:00:00.000Z',
        actor: 'Incident Room',
        label: 'Candidate opened',
        detail:
          'Rules grouped repeated terms, reports, and account-age signals into one incident candidate.',
      },
    ],
    afterAction: {
      itemsReviewed: 1,
      actionsConfirmed: 1,
      duplicateWorkAvoided: 2,
      avgFirstResponseSeconds: 38,
      unresolvedFollowups: ['Review whether the spoiler rule needs a release-day clause.'],
    },
  },
  evidence: [
    {
      id: 'ev-spoiler-1',
      kind: 'post',
      author: 'fresh-account-184',
      title: 'Finale leak: ending posted in title',
      body: 'The finale spoiler is being repeated across threads. This one includes the ending in the post title.',
      url: 'https://reddit.com/r/example/comments/spoiler1',
      accountAgeDays: 2,
      reports: 7,
      createdAt: '2026-05-26T12:00:00.000Z',
      permalink: 'https://reddit.com/r/example/comments/spoiler1',
      claimedBy: 'reviewer',
      ruleSignals: [
        { id: 'watch-term-match', label: 'Watch term match', score: 28, explanation: 'Matched finale spoiler' },
        { id: 'fresh-account', label: 'Fresh account', score: 18, explanation: 'Account age 2 days' },
        { id: 'report-velocity', label: 'Report velocity', score: 21, explanation: '7 reports' },
      ],
      score: 91,
    },
    {
      id: 'ev-link-1',
      kind: 'post',
      author: 'wallet-alert-31',
      title: 'Urgent verification required before claim closes',
      body: 'Visit giveaway-wallet.example to verify your account before the window closes.',
      url: 'https://giveaway-wallet.example/claim',
      domain: 'giveaway-wallet.example',
      accountAgeDays: 0,
      reports: 9,
      createdAt: '2026-05-26T12:00:00.000Z',
      permalink: 'https://reddit.com/r/example/comments/link1',
      ruleSignals: [
        { id: 'watched-domain', label: 'Watched domain', score: 22, explanation: 'Configured watch term' },
        { id: 'report-velocity', label: 'Report velocity', score: 27, explanation: '9 reports' },
      ],
      score: 100,
    },
  ],
  metrics: { openCandidates: 0, activeClaims: 1, actionsToday: 1, aiStatus: 'configured' },
};

function contentType(file) {
  const ext = extname(file);
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
    }[ext] ?? 'application/octet-stream'
  );
}

function startServer() {
  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    if (url.pathname.startsWith('/api/')) {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ type: 'state', state }));
      return;
    }

    const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    const candidate = resolve(join(root, safePath === '/' ? '/splash.html' : safePath));
    if (!candidate.startsWith(root) || !existsSync(candidate) || !statSync(candidate).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': contentType(candidate) });
    createReadStream(candidate).pipe(res);
  }).listen(port, '127.0.0.1');
}

async function screenshot(page, path, viewport) {
  await page.setViewportSize(viewport);
  await page.screenshot({ path, fullPage: true });
}

async function viewportScreenshot(page, path, viewport) {
  await page.setViewportSize(viewport);
  await page.screenshot({ path, fullPage: false });
}

async function main() {
  mkdirSync('docs/ui-mockups', { recursive: true });
  mkdirSync('docs/screenshots', { recursive: true });
  mkdirSync('public/brand', { recursive: true });

  const server = startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`http://127.0.0.1:${port}/splash.html`);
    await screenshot(page, 'docs/ui-mockups/01-landing.png', { width: 1920, height: 1200 });
    await screenshot(page, 'docs/screenshots/hero.png', { width: 1920, height: 1200 });

    await page.goto(`http://127.0.0.1:${port}/game.html`);
    await screenshot(page, 'docs/ui-mockups/02-app-overview.png', { width: 1920, height: 1200 });

    await page.getByRole('button', { name: 'Briefing' }).click();
    await screenshot(page, 'docs/ui-mockups/03-briefing-action-pack.png', { width: 1920, height: 1200 });
    await screenshot(page, 'docs/screenshots/flow.png', { width: 1920, height: 1200 });

    await page.goto(`http://127.0.0.1:${port}/game.html`);
    await viewportScreenshot(page, 'docs/ui-mockups/04-mobile-qr.png', { width: 390, height: 844 });
    await viewportScreenshot(page, 'docs/screenshots/mobile.png', { width: 390, height: 844 });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.setContent(`
      <html><body style="margin:0;background:#08111f;color:#f8fafc;font-family:Inter,Arial,sans-serif">
      <div style="width:1280px;height:720px;display:grid;place-items:center;background:linear-gradient(135deg,#08111f,#172033)">
        <svg width="1120" height="560" viewBox="0 0 1120 560" xmlns="http://www.w3.org/2000/svg">
          <defs><style>.box{fill:#0f172a;stroke:#2dd4bf;stroke-width:2}.warn{fill:#1f1720;stroke:#fb7185;stroke-width:2}.t{fill:#f8fafc;font:700 22px Arial}.s{fill:#cbd5e1;font:400 16px Arial}.line{stroke:#fbbf24;stroke-width:3;marker-end:url(#a)}</style><marker id="a" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#fbbf24"/></marker></defs>
          <rect x="40" y="70" width="230" height="130" rx="8" class="warn"/><text x="70" y="120" class="t">Reddit events</text><text x="70" y="155" class="s">Posts, comments, reports</text>
          <rect x="330" y="70" width="230" height="130" rx="8" class="box"/><text x="360" y="120" class="t">Rule engine</text><text x="360" y="155" class="s">Deterministic signals</text>
          <rect x="620" y="70" width="230" height="130" rx="8" class="box"/><text x="650" y="120" class="t">AI brief</text><text x="650" y="155" class="s">Explanation, not action</text>
          <rect x="330" y="285" width="230" height="130" rx="8" class="box"/><text x="360" y="335" class="t">Redis state</text><text x="360" y="370" class="s">Claims, timeline, report</text>
          <rect x="620" y="285" width="230" height="130" rx="8" class="warn"/><text x="650" y="335" class="t">Command room</text><text x="650" y="370" class="s">Human confirmation</text>
          <path d="M270 135H330" class="line"/><path d="M560 135H620" class="line"/><path d="M445 200V285" class="line"/><path d="M560 350H620" class="line"/><path d="M735 200V285" class="line"/>
        </svg>
      </div></body></html>
    `);
    await page.screenshot({ path: 'docs/screenshots/architecture.png', fullPage: true });
    await page.screenshot({ path: 'public/brand/og.png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  } finally {
    await browser.close();
    server.close();
  }
}

await main();
