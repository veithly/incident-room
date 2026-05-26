import { chromium } from '@playwright/test';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'node:child_process';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import path, { extname, join, normalize, resolve } from 'node:path';

const ROOT = process.cwd();
const OUT = {
  audio: path.join(ROOT, 'pitch', 'audio'),
  deck: path.join(ROOT, 'pitch', 'deck-thumbs'),
  illustrations: path.join(ROOT, 'pitch', 'illustrations'),
  polish: path.join(ROOT, 'pitch', 'polish-combined'),
  recording: path.join(ROOT, 'pitch', 'recording'),
};

const ffmpeg = ffmpegInstaller.path;
const WIDTH = 1920;
const HEIGHT = 1080;
const videoUrl = 'https://github.com/veithly/incident-room/releases/download/v0.0.3-demo/pitch-demo-combined-final.mp4';
const repoUrl = 'https://github.com/veithly/incident-room';
const devvitUrl = 'https://developers.reddit.com/apps/incidentrm260526';

const narrationInstruction =
  process.env.TTS_INSTRUCTION ||
  process.env.STEP_TTS_INSTRUCTION ||
  'Confident, calm hackathon narration. Native English product names. Slightly slower than chat.';

const chapters = [
  {
    id: '01-hook',
    type: 'still',
    source: 'pitch/illustrations/slide-01-command-room.png',
    align: 'right',
    minSeconds: 6,
    kicker: 'Moderator incident room',
    title: 'One shared post before the team splits across tabs',
    body: 'Reports, watch terms, claims, and the decision trail meet inside Reddit while the incident is still moving.',
    stat: 'Built for the first minute',
    narration:
      'Live incidents fragment moderation in the first minute. Incident Room gives the team one shared command post inside Reddit.',
  },
  {
    id: '02-product',
    type: 'still',
    source: 'docs/screenshots/hero.png',
    align: 'left',
    minSeconds: 6,
    kicker: 'Real Devvit surface',
    title: 'Declare the incident, then work from the same room',
    body: 'The custom post shows status, score, evidence, active claims, briefing state, and the next moderator action.',
    stat: 'No external dashboard',
    narration:
      'A moderator declares the incident. The room scores evidence, shows claims, and keeps the next action visible.',
  },
  {
    id: '03-demo',
    type: 'demo',
    source: 'pitch/recording/live-demo.mp4',
    minSeconds: 22,
    kicker: 'Live demo',
    title: 'Declare, claim, brief, preview, confirm',
    body: 'Recorded from the running React app, using the same path covered by Playwright desktop and mobile tests.',
    stat: 'Actual UI interaction',
    narration:
      'Here is the real flow: declare, claim evidence, open the briefing, preview an action pack, confirm it, then read the after-action record.',
  },
  {
    id: '04-rules-step',
    type: 'still',
    source: 'pitch/illustrations/slide-04-rules-ai.png',
    align: 'left',
    minSeconds: 8,
    kicker: 'Rules plus AI',
    title: 'Rules score; Step 3.6 briefs; humans decide',
    body: 'Watch terms, reports, domains, and account age stay deterministic. The model explains the pattern and caveats only.',
    stat: 'AI cannot mutate Reddit',
    narration:
      'Rules do the scoring. Step three point six writes the briefing only; it cannot mutate Reddit content or bypass moderator review.',
  },
  {
    id: '05-proof',
    type: 'still',
    source: 'docs/screenshots/architecture.png',
    align: 'right',
    minSeconds: 7,
    kicker: 'Submission proof',
    title: 'Repo, review app, tests, and video are ready to inspect',
    body: 'The submission links the Devvit app, playtest subreddit, public repo, Step AI smoke test, and Playwright evidence.',
    stat: 'github.com/veithly/incident-room',
    narration:
      'The repo, Devvit review app, tests, and video are linked in the submission. The first action is ready to inspect.',
  },
];

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fileUrl(relativePath) {
  const absolutePath = path.join(ROOT, relativePath);
  return `data:${contentType(absolutePath)};base64,${readFileSync(absolutePath).toString('base64')}`;
}

function contentType(file) {
  const ext = extname(file);
  return (
    {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    }[ext] ?? 'application/octet-stream'
  );
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function initialState() {
  const now = '2026-05-26T12:00:00.000Z';
  return {
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
      triggerReason: 'Three high-signal items matched watch terms, fresh-account pressure, and report velocity.',
      openedAt: now,
      evidenceIds: ['ev-spoiler-1', 'ev-spoiler-2', 'ev-link-1'],
      roles: { lead: null, evidence: null, comms: null, backup: null },
      actionPacks: [
        {
          id: 'pack-spoiler-containment',
          label: 'Spoiler containment',
          description: 'Review matching items, remove confirmed spoilers, and publish one calm status comment.',
          targetEvidenceIds: ['ev-spoiler-1', 'ev-spoiler-2'],
          actions: [
            'Remove confirmed spoiler posts/comments after preview',
            'Apply spoiler flair where edit is sufficient',
            'Post a moderator status note in the discussion thread',
          ],
          riskNote: 'Only use after a moderator reads the linked evidence. No automatic removals are executed.',
          status: 'previewed',
        },
        {
          id: 'pack-link-quarantine',
          label: 'Suspicious-link quarantine',
          description: 'Lock repeated suspicious-link posts and add the domain to the watch list.',
          targetEvidenceIds: ['ev-link-1'],
          actions: [
            'Remove the suspicious-link item after confirmation',
            'Add the domain to the active watch list',
            'Create a follow-up for rule wording review',
          ],
          riskNote: 'The domain match is deterministic; moderators still confirm the content and intent.',
          status: 'previewed',
        },
      ],
      aiBrief: {
        status: 'not-configured',
        provider: 'OpenAI-compatible',
        model: 'not configured',
        summary: 'AI briefing is ready to run after the app developer sets the global provider secret.',
        likelyPattern: 'Rules indicate a combined spoiler wave and suspicious-link burst.',
        recommendedActionPack: 'Spoiler containment',
        moderatorCaveats: [
          'Review each item before removal.',
          'Use status copy only after checking community-specific rule language.',
        ],
      },
      timeline: [
        {
          id: 'tl-opened',
          at: now,
          actor: 'Incident Room',
          label: 'Candidate opened',
          detail: 'Rules grouped repeated terms, reports, and account-age signals into one incident candidate.',
        },
      ],
      afterAction: {
        itemsReviewed: 0,
        actionsConfirmed: 0,
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
        createdAt: now,
        permalink: 'https://reddit.com/r/example/comments/spoiler1',
        ruleSignals: [
          { id: 'watch-term-match', label: 'Watch term match', score: 28, explanation: 'Matched finale spoiler' },
          { id: 'fresh-account', label: 'Fresh account', score: 18, explanation: 'Account age 2 days' },
          { id: 'report-velocity', label: 'Report velocity', score: 21, explanation: '7 reports' },
        ],
        score: 91,
      },
      {
        id: 'ev-spoiler-2',
        kind: 'comment',
        author: 'new-fan-009',
        title: 'Comment repeats finale spoiler',
        body: 'Same finale spoiler posted under the live discussion thread.',
        url: 'https://reddit.com/r/example/comments/spoiler2',
        accountAgeDays: 1,
        reports: 4,
        createdAt: now,
        permalink: 'https://reddit.com/r/example/comments/spoiler2',
        ruleSignals: [
          { id: 'watch-term-match', label: 'Watch term match', score: 28, explanation: 'Matched finale spoiler' },
          { id: 'fresh-account', label: 'Fresh account', score: 18, explanation: 'Account age 1 day' },
        ],
        score: 74,
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
        createdAt: now,
        permalink: 'https://reddit.com/r/example/comments/link1',
        ruleSignals: [
          { id: 'watched-domain', label: 'Watched domain', score: 22, explanation: 'Configured watch term' },
          { id: 'report-velocity', label: 'Report velocity', score: 27, explanation: '9 reports' },
        ],
        score: 100,
      },
    ],
    metrics: { openCandidates: 1, activeClaims: 0, actionsToday: 0, aiStatus: 'not-configured' },
  };
}

function activateState(state) {
  const at = '2026-05-26T12:01:00.000Z';
  return {
    ...state,
    currentIncident: {
      ...state.currentIncident,
      status: 'active',
      declaredAt: at,
      declaredBy: 'reviewer',
      roles: { ...state.currentIncident.roles, lead: 'reviewer' },
      aiBrief: {
        status: 'configured',
        provider: 'OpenAI-compatible',
        model: 'step-3.6',
        summary:
          'The evidence points to a coordinated spoiler and suspicious-link burst. The safest path is to contain confirmed violations, watch the repeated domain, and leave one clear status note for the mod team.',
        likelyPattern: 'Coordinated incident pattern',
        recommendedActionPack: 'Spoiler containment',
        moderatorCaveats: ['Read each linked item first.', 'Use community rule text in the final note.'],
        generatedAt: at,
      },
      timeline: [
        ...state.currentIncident.timeline,
        {
          id: 'tl-declared',
          at,
          actor: 'reviewer',
          label: 'Incident declared',
          detail: 'Step AI briefing generated after deterministic rule scoring crossed the threshold.',
        },
      ],
    },
    metrics: { ...state.metrics, openCandidates: 0, aiStatus: 'configured' },
  };
}

function startDemoServer(port) {
  const root = resolve('dist/client');
  let state = initialState();

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/init') {
        // no-op
      } else if (url.pathname === '/api/declare') {
        state = activateState(state);
      } else if (url.pathname === '/api/claim') {
        const body = await readRequestBody(req);
        state = {
          ...state,
          evidence: state.evidence.map((item) =>
            item.id === body.evidenceId ? { ...item, claimedBy: 'reviewer' } : item
          ),
          metrics: { ...state.metrics, activeClaims: 1 },
        };
      } else if (url.pathname === '/api/action-preview') {
        state = {
          ...state,
          currentIncident: {
            ...state.currentIncident,
            timeline: [
              ...state.currentIncident.timeline,
              {
                id: `tl-preview-${state.currentIncident.timeline.length}`,
                at: '2026-05-26T12:02:00.000Z',
                actor: 'reviewer',
                label: 'Action pack previewed',
                detail: 'Moderator reviewed the suggested containment pack before confirmation.',
              },
            ],
          },
        };
      } else if (url.pathname === '/api/resolve') {
        const body = await readRequestBody(req);
        state = {
          ...state,
          metrics: { ...state.metrics, actionsToday: state.metrics.actionsToday + 1 },
          currentIncident: {
            ...state.currentIncident,
            actionPacks: state.currentIncident.actionPacks.map((pack) =>
              pack.id === body.actionPackId ? { ...pack, status: 'confirmed', confirmedBy: 'reviewer' } : pack
            ),
            afterAction: {
              ...state.currentIncident.afterAction,
              itemsReviewed: 2,
              actionsConfirmed: state.currentIncident.afterAction.actionsConfirmed + 1,
            },
          },
        };
      } else if (url.pathname === '/api/reset') {
        state = initialState();
      }

      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ type: url.pathname === '/api/init' ? 'init' : 'state', state }));
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
  });

  return new Promise((resolveServer) => {
    server.listen(port, '127.0.0.1', () => resolveServer(server));
  });
}

async function ensureDirs() {
  await Promise.all(Object.values(OUT).map((dir) => fs.mkdir(dir, { recursive: true })));
  await fs.mkdir(path.join(OUT.polish, 'assets'), { recursive: true });
}

async function cleanGeneratedPreviews() {
  const deckEntries = await fs.readdir(OUT.deck, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    deckEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
      .map((entry) => fs.rm(path.join(OUT.deck, entry.name), { force: true }))
  );

  const polishEntries = await fs.readdir(OUT.polish, { withFileTypes: true }).catch(() => []);
  await Promise.all(
    polishEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
      .map((entry) => fs.rm(path.join(OUT.polish, entry.name), { force: true }))
  );
}

function ensureBuild() {
  if (existsSync(path.join(ROOT, 'dist', 'client', 'game.html'))) return;
  const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`npm run build failed\n${result.stdout}\n${result.stderr}`);
  }
}

async function recordLiveDemo() {
  ensureBuild();
  const port = 4319;
  const server = await startDemoServer(port);
  const browser = await chromium.launch({ args: [`--window-size=${WIDTH},${HEIGHT}`, '--force-device-scale-factor=1'] });
  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT.recording, size: { width: WIDTH, height: HEIGHT } },
  });
  const page = await context.newPage();

  try {
    await page.goto(`http://127.0.0.1:${port}/game.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Declare incident' }).click();
    await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'Claim' }).first().click();
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Briefing' }).click();
    await page.waitForTimeout(2600);
    await page.getByRole('button', { name: 'New preview' }).click();
    await page.waitForTimeout(1800);
    await page.getByRole('button', { name: 'Confirm pack' }).first().click();
    await page.waitForTimeout(2200);
    await page.getByRole('button', { name: 'After action' }).click();
    await page.waitForTimeout(2600);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    server.close();
    const rawPath = await video.path();
    const outPath = path.join(OUT.recording, 'live-demo.mp4');
    ffmpegRun(
      [
        '-y',
        '-i',
        rawPath,
        '-vf',
        `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},format=yuv420p`,
        '-r',
        '30',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-an',
        '-movflags',
        '+faststart',
        outPath,
      ],
      'convert live demo'
    );
  }
}

function chapterHtml(chapter) {
  const imageClass = chapter.fit === 'contain' ? 'plate-image contain' : 'plate-image';
  const panelClass = chapter.align === 'right' ? 'copy right' : 'copy left';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: dark;
      --ink: #f6f4eb;
      --muted: #c7c2b8;
      --line: rgba(246, 244, 235, 0.2);
      --orange: #ff4500;
      --cyan: #5eead4;
      --panel: rgba(14, 18, 24, 0.9);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      overflow: hidden;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0d1218;
      color: var(--ink);
    }
    .stage { position: relative; width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; background: #0d1218; }
    .plate { position: absolute; inset: 0; overflow: hidden; }
    .plate::after {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(7, 10, 15, 0.62), rgba(7, 10, 15, 0.08) 46%, rgba(7, 10, 15, 0.66)),
        linear-gradient(180deg, rgba(7, 10, 15, 0.1), rgba(7, 10, 15, 0.28));
      pointer-events: none;
    }
    .plate-image { width: 100%; height: 100%; object-fit: cover; display: block; }
    .plate-image.contain {
      object-fit: contain;
      width: 52%;
      margin-left: 890px;
      padding: 82px 120px 82px 0;
      filter: drop-shadow(0 38px 90px rgba(0, 0, 0, 0.42));
    }
    .brand {
      position: absolute;
      z-index: 3;
      top: 44px;
      left: 56px;
      display: flex;
      align-items: center;
      gap: 16px;
      font-weight: 760;
      font-size: 25px;
      color: white;
    }
    .mark { width: 46px; height: 46px; background: var(--orange); display: grid; place-items: center; font-weight: 900; border-radius: 8px; }
    .copy {
      position: absolute;
      z-index: 2;
      top: 128px;
      width: 650px;
      padding: 34px 38px;
      border: 1px solid var(--line);
      background: var(--panel);
      backdrop-filter: blur(16px);
      box-shadow: 0 28px 96px rgba(0, 0, 0, 0.42);
    }
    .copy.left { left: 56px; }
    .copy.right { right: 56px; }
    .kicker { margin: 0 0 18px; color: var(--cyan); text-transform: uppercase; font-size: 21px; letter-spacing: 0.1em; }
    h1 { margin: 0; font-size: 47px; line-height: 1.05; font-weight: 810; letter-spacing: 0; }
    .body { margin: 22px 0 0; color: var(--muted); font-size: 25px; line-height: 1.3; }
    .stat {
      margin-top: 26px;
      padding: 18px 21px;
      border-left: 6px solid var(--orange);
      background: rgba(255, 69, 0, 0.12);
      color: #fff4ee;
      font-size: 24px;
      line-height: 1.16;
      font-weight: 760;
    }
  </style>
</head>
<body>
  <main class="stage">
    <section class="plate"><img class="${imageClass}" src="${fileUrl(chapter.source)}" alt="" /></section>
    <div class="brand"><div class="mark">IR</div><span>Incident Room</span></div>
    <section class="${panelClass}">
      <p class="kicker">${htmlEscape(chapter.kicker)}</p>
      <h1>${htmlEscape(chapter.title)}</h1>
      <p class="body">${htmlEscape(chapter.body)}</p>
      <aside class="stat">${htmlEscape(chapter.stat)}</aside>
    </section>
  </main>
</body>
</html>`;
}

async function renderPlates() {
  const browser = await chromium.launch({ args: [`--window-size=${WIDTH},${HEIGHT}`] });
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  try {
    for (const chapter of chapters.filter((item) => item.type === 'still')) {
      const html = chapterHtml(chapter);
      const htmlPath = path.join(OUT.polish, `${chapter.id}.html`);
      const pngPath = path.join(OUT.deck, `${chapter.id}.png`);
      await fs.writeFile(htmlPath, html, 'utf8');
      await page.setContent(html, { waitUntil: 'load' });
      await page.screenshot({ path: pngPath, fullPage: false });
      chapter.plate = path.relative(ROOT, pngPath).replaceAll(path.sep, '/');
    }
  } finally {
    await browser.close();
  }
}

async function synthesizeNarration() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.STEP_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY. Set it to the StepFun key before rendering narration.');

  const baseUrl = (process.env.OPENAI_BASE_URL || process.env.STEP_BASE_URL || 'https://api.stepfun.com/v1').replace(
    /\/$/,
    ''
  );
  const model = process.env.TTS_MODEL || process.env.STEP_TTS_MODEL || 'stepaudio-2.5-tts';
  const voice = process.env.TTS_VOICE || process.env.STEP_TTS_VOICE || 'cixingnansheng';

  for (const chapter of chapters) {
    const outPath = path.join(OUT.audio, `${chapter.id}.mp3`);
    if (existsSync(outPath) && process.argv.includes('--reuse-audio')) {
      chapter.audio = path.relative(ROOT, outPath).replaceAll(path.sep, '/');
      continue;
    }

    const res = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        input: chapter.narration,
        voice,
        response_format: 'mp3',
        speed: 1.0,
        volume: 1.0,
        instruction: narrationInstruction.slice(0, 200),
      }),
    });

    const body = Buffer.from(await res.arrayBuffer());
    if (!res.ok) throw new Error(`TTS failed for ${chapter.id}: ${res.status} ${body.toString('utf8', 0, 600)}`);
    await fs.writeFile(outPath, body);
    chapter.audio = path.relative(ROOT, outPath).replaceAll(path.sep, '/');
  }
}

function ffmpegRun(args, label) {
  const result = spawnSync(ffmpeg, args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${label} failed\n${result.stdout}\n${result.stderr}`);
  return result;
}

function probeDurationSeconds(file) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-f', 'null', '-'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const text = `${result.stdout}\n${result.stderr}`;
  const match = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) throw new Error(`Could not read duration for ${file}`);
  const [, hours, minutes, seconds] = match;
  return Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds);
}

function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const mm = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(
    mm
  ).padStart(3, '0')}`;
}

async function renderVideo() {
  const concatLines = [];
  const captions = [];
  let cursor = 0;

  for (let i = 0; i < chapters.length; i += 1) {
    const chapter = chapters[i];
    const audio = path.join(ROOT, chapter.audio);
    const segment = path.join(OUT.recording, `${chapter.id}.mp4`);
    const audioDuration = probeDurationSeconds(audio);

    if (chapter.type === 'demo') {
      const demoPath = path.join(ROOT, chapter.source);
      const demoDuration = probeDurationSeconds(demoPath);
      const duration = Math.max(chapter.minSeconds ?? 0, audioDuration + 0.25);
      const stretch = duration > demoDuration ? (duration / demoDuration).toFixed(5) : '1';
      ffmpegRun(
        [
          '-y',
          '-i',
          demoPath,
          '-i',
          audio,
          '-t',
          duration.toFixed(2),
          '-vf',
          `crop=1440:820:240:42,scale=${WIDTH}:${HEIGHT}:flags=lanczos,setpts=${stretch}*PTS,unsharp=5:5:0.55:5:5:0,eq=contrast=1.04:saturation=1.08,format=yuv420p`,
          '-r',
          '30',
          '-c:v',
          'libx264',
          '-preset',
          'slow',
          '-crf',
          '17',
          '-c:a',
          'aac',
          '-b:a',
          '160k',
          '-movflags',
          '+faststart',
          segment,
        ],
        `render demo segment ${chapter.id}`
      );
      chapter.duration_seconds = Number(duration.toFixed(2));
      const thumbPath = path.join(OUT.deck, `${chapter.id}.png`);
      ffmpegRun(['-y', '-ss', '8', '-i', segment, '-frames:v', '1', thumbPath], `render demo thumb ${chapter.id}`);
      chapter.plate = path.relative(ROOT, thumbPath).replaceAll(path.sep, '/');
    } else {
      const plate = path.join(ROOT, chapter.plate);
      const duration = Math.max(chapter.minSeconds ?? 6, audioDuration + 0.25);
      ffmpegRun(
        [
          '-y',
          '-loop',
          '1',
          '-framerate',
          '30',
          '-i',
          plate,
          '-i',
          audio,
          '-t',
          duration.toFixed(2),
          '-vf',
          `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},unsharp=5:5:0.45:5:5:0,eq=contrast=1.03:saturation=1.06,format=yuv420p`,
          '-r',
          '30',
          '-c:v',
          'libx264',
          '-preset',
          'slow',
          '-crf',
          '17',
          '-c:a',
          'aac',
          '-b:a',
          '160k',
          '-movflags',
          '+faststart',
          segment,
        ],
        `render still segment ${chapter.id}`
      );
      chapter.duration_seconds = Number(duration.toFixed(2));
    }

    concatLines.push(`file '${segment.replaceAll('\\', '/')}'`);
    captions.push(
      `${i + 1}\n${srtTime(cursor)} --> ${srtTime(cursor + chapter.duration_seconds)}\n${chapter.title}\n${chapter.body}\n`
    );
    cursor += chapter.duration_seconds;
    chapter.segment = path.relative(ROOT, segment).replaceAll(path.sep, '/');
  }

  const concatPath = path.join(OUT.recording, '_concat.txt');
  const voicePath = path.join(OUT.recording, 'pitch-demo-combined-voice.mp4');
  const outPath = path.join(OUT.recording, 'pitch-demo-combined-final.mp4');
  await fs.writeFile(concatPath, `${concatLines.join('\n')}\n`, 'utf8');
  await fs.writeFile(path.join(OUT.recording, 'pitch-demo-combined-final.srt'), captions.join('\n'), 'utf8');
  ffmpegRun(['-y', '-f', 'concat', '-safe', '0', '-i', concatPath, '-c', 'copy', voicePath], 'concat voice video');

  const bgm = path.join(ROOT, '..', 'hackathonhunter', 'assets', 'music', '01_future_forward.mp3');
  if (existsSync(bgm)) {
    ffmpegRun(
      [
        '-y',
        '-i',
        voicePath,
        '-stream_loop',
        '-1',
        '-i',
        bgm,
        '-filter_complex',
        '[1:a]volume=0.15[bgm];[bgm][0:a]sidechaincompress=threshold=0.03:ratio=10:attack=12:release=300[ducked];[0:a][ducked]amix=inputs=2:duration=first:dropout_transition=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]',
        '-map',
        '0:v',
        '-map',
        '[a]',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-movflags',
        '+faststart',
        outPath,
      ],
      'mix final video'
    );
  } else {
    await fs.copyFile(voicePath, outPath);
  }

  return { output: path.relative(ROOT, outPath).replaceAll(path.sep, '/'), duration_seconds: Number(cursor.toFixed(2)) };
}

async function writeManifests(video) {
  const manifest = {
    generated_at: new Date().toISOString(),
    composition: 'devpost-under-one-minute-demo',
    size: { width: WIDTH, height: HEIGHT },
    repo_url: repoUrl,
    devvit_url: devvitUrl,
    demo_video_url: videoUrl,
    tts: {
      provider: 'StepFun OpenAI-compatible audio speech',
      model: process.env.TTS_MODEL || process.env.STEP_TTS_MODEL || 'stepaudio-2.5-tts',
      voice: process.env.TTS_VOICE || process.env.STEP_TTS_VOICE || 'cixingnansheng',
      instruction: narrationInstruction.slice(0, 200),
    },
    video,
    chapters,
  };
  await fs.writeFile(path.join(OUT.polish, 'narration.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const previewItems = chapters
    .map((chapter, index) => {
      const thumb = chapter.type === 'demo' ? '../recording/live-demo.mp4' : `../deck-thumbs/${chapter.id}.png`;
      const media =
        chapter.type === 'demo'
          ? `<video src="${thumb}" muted playsinline controls></video>`
          : `<img src="${thumb}" alt="" />`;
      return `<article class="chapter" style="--i:${index}">
      ${media}
      <div>
        <p>${htmlEscape(chapter.kicker)}</p>
        <h2>${htmlEscape(chapter.title)}</h2>
        <span>${chapter.duration_seconds}s</span>
      </div>
    </article>`;
    })
    .join('\n');

  await fs.writeFile(
    path.join(OUT.polish, 'index.html'),
    `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Incident Room Combined Pitch Demo</title>
  <style>
    body { margin: 0; background: #11161c; color: #f6f4eb; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    main { width: min(1180px, calc(100vw - 48px)); margin: 42px auto; }
    h1 { font-size: 44px; margin: 0 0 12px; }
    .meta { color: #b7b0a2; margin-bottom: 28px; font-size: 18px; }
    .chapter { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 24px; align-items: center; padding: 18px 0; border-top: 1px solid rgba(246, 244, 235, 0.16); }
    img, video { width: 320px; aspect-ratio: 16 / 9; object-fit: cover; border: 1px solid rgba(246, 244, 235, 0.16); }
    p { margin: 0 0 8px; color: #5eead4; text-transform: uppercase; }
    h2 { margin: 0 0 12px; font-size: 26px; }
    span { color: #ff8a61; }
  </style>
</head>
<body>
  <main>
    <h1>Incident Room Devpost demo</h1>
    <div class="meta">Final render: ../recording/pitch-demo-combined-final.mp4 - ${video.duration_seconds}s - ${WIDTH}x${HEIGHT} - under-one-minute cut with live UI recording</div>
    ${previewItems}
  </main>
</body>
</html>
`,
    'utf8'
  );

  await fs.writeFile(
    path.join(OUT.recording, 'README.md'),
    `# Incident Room Demo Video

- Final local render: \`${video.output}\`
- Public release URL: ${videoUrl}
- Captions: \`pitch/recording/pitch-demo-combined-final.srt\`
- Composition preview: \`pitch/polish-combined/index.html\`
- Live UI recording source: \`pitch/recording/live-demo.mp4\`
- Duration: ${video.duration_seconds} seconds
- Format: ${WIDTH}x${HEIGHT}, Devpost under-one-minute cut
- TTS: StepFun \`${manifest.tts.model}\` voice \`${manifest.tts.voice}\`

The MP4 and audio files are intentionally gitignored. Regenerate them with:

\`\`\`bash
npm run video:submission
\`\`\`
`,
    'utf8'
  );
}

async function main() {
  await ensureDirs();
  await cleanGeneratedPreviews();
  await recordLiveDemo();
  await renderPlates();
  await synthesizeNarration();
  const video = await renderVideo();
  if (video.duration_seconds >= 60) {
    throw new Error(`Devpost cut is too long: ${video.duration_seconds}s. Keep the final demo under 60 seconds.`);
  }
  await writeManifests(video);
  console.log(JSON.stringify({ ok: true, ...video }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
