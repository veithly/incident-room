import { chromium } from '@playwright/test';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT = {
  audio: path.join(ROOT, 'pitch', 'audio'),
  deck: path.join(ROOT, 'pitch', 'deck-thumbs'),
  polish: path.join(ROOT, 'pitch', 'polish-combined'),
  recording: path.join(ROOT, 'pitch', 'recording'),
};

const ffmpeg = ffmpegInstaller.path;

const narrationInstruction =
  process.env.TTS_INSTRUCTION ||
  process.env.STEP_TTS_INSTRUCTION ||
  'Confident, calm hackathon narration. Native English product names. Slightly slower than chat.';

const chapters = [
  {
    id: '01-cold-open',
    type: 'image',
    source: 'docs/screenshots/hero.png',
    kicker: 'Cold open',
    title: 'A subreddit incident should not become five private tabs',
    body: 'Incident Room gives moderators one shared command room before a heated thread turns into shift-by-shift guesswork.',
    narration:
      'A subreddit incident does not wait for a meeting. A live sports thread, a game launch, or a finance discussion can turn hostile while moderators are still comparing notes in separate tabs. Incident Room turns that spike into one shared room, with evidence, claims, deterministic rules, and a bounded AI briefing in the same place.',
  },
  {
    id: '02-pressure',
    type: 'slide',
    kicker: 'Moderator pressure',
    title: 'The risk is duplicated review during the busiest minutes',
    body: 'Five moderators can read the same reports, miss the same hostile pattern, or act without knowing who already claimed the next item.',
    stat: 'One room replaces scattered context',
    narration:
      'The painful part is not a missing button. It is duplicated review during the busiest minutes. One moderator reads the first report, another checks the same author, and a third takes action without seeing the earlier reason. Incident Room shows who claimed evidence, why an item was scored, and which pattern is gaining speed before the team loses the thread.',
  },
  {
    id: '03-room-flow',
    type: 'image',
    source: 'docs/screenshots/flow.png',
    kicker: 'Live room',
    title: 'Declare, claim, brief, and confirm without leaving Reddit',
    body: 'The custom post acts like a war-room surface for the incident, not a spreadsheet outside the moderation flow.',
    narration:
      'The moderator declares an incident from Reddit. Evidence enters a custom post, claims become visible to the team, and the room keeps the decision trail where the next moderator can find it. The workflow is intentionally direct: declare the room, claim the next evidence item, review the briefing, preview the action pack, and confirm the human decision.',
  },
  {
    id: '04-ai-briefing',
    type: 'image',
    source: 'docs/ui-mockups/03-briefing-action-pack.png',
    kicker: 'Rules plus AI',
    title: 'Rules score the evidence; Step AI explains the shape of the incident',
    body: 'The model summarizes likely pattern, safest action pack to review, and caveats. It cannot mutate Reddit content.',
    narration:
      'The AI layer is deliberately bounded. Deterministic rules score watch terms, report velocity, repeated domains, and fresh accounts, because those signals must be explainable under pressure. Step three point six then writes a compact briefing: what appears to be happening, which action pack is safest to review, and which caveats should stay in front of the moderator. The model cannot remove, lock, ban, or mutate Reddit content.',
  },
  {
    id: '05-mobile',
    type: 'image',
    source: 'docs/screenshots/mobile.png',
    kicker: 'QR first run',
    title: 'The same incident room works from a phone scan',
    body: 'Judges and moderators can inspect the flow from mobile without landing on a shrunken desktop dashboard.',
    narration:
      'The mobile view keeps the first run usable from a QR scan. That matters for judges, but it also matters for real moderators who check an incident away from the main desk. The layout keeps the incident state, the briefing, and the next review action reachable without shrinking a dense desktop dashboard into a phone viewport.',
  },
  {
    id: '06-architecture',
    type: 'image',
    source: 'docs/screenshots/architecture.png',
    kicker: 'Technical proof',
    title: 'Devvit events, Redis state, Reddit permissions, and server-side AI',
    body: 'Secrets stay server-side. Reddit actions stay explicit. The app can be reviewed from code, tests, and deployed Devvit settings.',
    narration:
      'Under the hood, Devvit triggers ingest posts, comments, reports, and mod actions. Redis stores the timeline, claims, briefing state, and after action metrics. The OpenAI compatible StepFun endpoint runs server side with a Devvit secret, and the app keeps the Reddit permission boundary clear: AI explains the incident, moderators perform the action.',
  },
  {
    id: '07-review-status',
    type: 'slide',
    kicker: 'Submission proof',
    title: 'Built, tested, uploaded, and submitted for Devvit review',
    body: 'The public repository includes the PRD, architecture, deployment notes, screenshots, tests, and source-code review bundle status.',
    stat: 'Devvit version 0.0.3 submitted',
    narration:
      'The project is not a mock surface. The repository includes the app, tests, bilingual product docs, UI evidence, legal pages, and a Devvit publish request for version zero point zero point three. The local checks cover TypeScript, lint, unit tests, Vite build, Playwright desktop and mobile flows, and a live StepFun AI smoke test. The review bundle is ready for judges to inspect.',
  },
  {
    id: '08-outro',
    type: 'slide',
    kicker: 'Try the first action',
    title: 'Open the playtest subreddit and declare the first incident room',
    body: 'Incident Room is built for moderators who need shared context fast, but still want every enforcement action to stay human-reviewed.',
    stat: 'Repo, tests, and Devvit app are linked',
    narration:
      'The fastest way to evaluate Incident Room is to open the playtest subreddit, start the custom post, and declare the first incident room. The visible proof is in the product flow, the public repository, the tests, and the Devvit app listing submitted for review.',
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
  return pathToFileURL(path.join(ROOT, relativePath)).href;
}

async function ensureDirs() {
  await Promise.all(Object.values(OUT).map((dir) => fs.mkdir(dir, { recursive: true })));
  await fs.mkdir(path.join(OUT.polish, 'assets'), { recursive: true });
}

function chapterHtml(chapter) {
  const imageMarkup =
    chapter.type === 'image'
      ? `<img class="plate-image" src="${fileUrl(chapter.source)}" alt="" />`
      : `<div class="signal-grid">
          <section>
            <span>Evidence</span>
            <strong>Reports, watch terms, domains</strong>
          </section>
          <section>
            <span>Coordination</span>
            <strong>Claims, timeline, action pack</strong>
          </section>
          <section>
            <span>AI role</span>
            <strong>Briefing only, no mutation</strong>
          </section>
        </div>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      color-scheme: dark;
      --ink: #f6f4eb;
      --muted: #b7b0a2;
      --line: rgba(246, 244, 235, 0.18);
      --orange: #ff4500;
      --cyan: #5eead4;
      --panel: rgba(19, 23, 28, 0.84);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1920px;
      height: 1200px;
      overflow: hidden;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        linear-gradient(135deg, rgba(255, 69, 0, 0.16), transparent 32%),
        radial-gradient(circle at 82% 12%, rgba(94, 234, 212, 0.16), transparent 26%),
        #11161c;
      color: var(--ink);
    }
    .stage {
      position: relative;
      width: 1920px;
      height: 1200px;
      padding: 72px;
    }
    .plate {
      position: absolute;
      inset: 54px;
      border: 1px solid var(--line);
      background: #141922;
      box-shadow: 0 40px 120px rgba(0, 0, 0, 0.42);
      overflow: hidden;
    }
    .plate::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(10, 13, 18, 0.12), rgba(10, 13, 18, 0.2) 48%, rgba(10, 13, 18, 0.76));
      pointer-events: none;
    }
    .plate-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transform: scale(1.015);
    }
    .signal-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 26px;
      width: 100%;
      height: 100%;
      padding: 360px 112px 220px;
      background:
        linear-gradient(90deg, rgba(255, 69, 0, 0.11) 1px, transparent 1px),
        linear-gradient(0deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
      background-size: 72px 72px;
    }
    .signal-grid section {
      min-height: 310px;
      padding: 38px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.055);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .signal-grid span {
      font-size: 25px;
      color: var(--cyan);
      text-transform: uppercase;
    }
    .signal-grid strong {
      font-size: 42px;
      line-height: 1.08;
      font-weight: 760;
    }
    .caption {
      position: absolute;
      left: 112px;
      right: 112px;
      bottom: 92px;
      z-index: 2;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 390px;
      gap: 36px;
      align-items: end;
    }
    .copy {
      padding: 36px 40px;
      background: var(--panel);
      border: 1px solid var(--line);
      backdrop-filter: blur(12px);
    }
    .kicker {
      margin: 0 0 18px;
      font-size: 24px;
      color: var(--cyan);
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      max-width: 1150px;
      font-size: 67px;
      line-height: 1;
      font-weight: 790;
    }
    .body {
      margin: 22px 0 0;
      max-width: 980px;
      color: var(--muted);
      font-size: 30px;
      line-height: 1.3;
    }
    .stat {
      min-height: 178px;
      padding: 30px;
      background: rgba(255, 69, 0, 0.86);
      display: flex;
      align-items: center;
      font-size: 37px;
      line-height: 1.08;
      font-weight: 780;
      color: #fff;
    }
    .brand {
      position: absolute;
      z-index: 3;
      top: 88px;
      left: 100px;
      display: flex;
      align-items: center;
      gap: 18px;
      color: white;
      font-weight: 760;
      font-size: 28px;
    }
    .mark {
      width: 48px;
      height: 48px;
      background: var(--orange);
      display: grid;
      place-items: center;
      font-weight: 900;
    }
  </style>
</head>
<body>
  <main class="stage">
    <div class="brand"><div class="mark">IR</div><span>Incident Room</span></div>
    <section class="plate">${imageMarkup}</section>
    <section class="caption">
      <div class="copy">
        <p class="kicker">${htmlEscape(chapter.kicker)}</p>
        <h1>${htmlEscape(chapter.title)}</h1>
        <p class="body">${htmlEscape(chapter.body)}</p>
      </div>
      <aside class="stat">${htmlEscape(chapter.stat || 'Moderator-controlled decisions')}</aside>
    </section>
  </main>
</body>
</html>`;
}

async function renderPlates() {
  const browser = await chromium.launch({ args: ['--window-size=1920,1200'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 }, deviceScaleFactor: 1 });
  try {
    for (const chapter of chapters) {
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
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY. Set it to the StepFun key before rendering narration.');
  }

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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
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
    if (!res.ok) {
      throw new Error(`TTS failed for ${chapter.id}: ${res.status} ${body.toString('utf8', 0, 600)}`);
    }

    await fs.writeFile(outPath, body);
    chapter.audio = path.relative(ROOT, outPath).replaceAll(path.sep, '/');
  }
}

function ffmpegRun(args, label) {
  const result = spawnSync(ffmpeg, args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${label} failed\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function probeDurationSeconds(file) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-f', 'null', '-'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const text = `${result.stdout}\n${result.stderr}`;
  const match = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Could not read duration for ${file}`);
  }
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
    const plate = path.join(ROOT, chapter.plate);
    const audio = path.join(ROOT, chapter.audio);
    const segment = path.join(OUT.recording, `${chapter.id}.mp4`);
    const duration = Math.max(8, probeDurationSeconds(audio) + 0.35);

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
        'scale=1920:1200:force_original_aspect_ratio=increase,crop=1920:1200,format=yuv420p',
        '-r',
        '30',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '20',
        '-c:a',
        'aac',
        '-b:a',
        '160k',
        '-movflags',
        '+faststart',
        '-shortest',
        segment,
      ],
      `render segment ${chapter.id}`
    );

    concatLines.push(`file '${segment.replaceAll('\\', '/')}'`);
    captions.push(
      `${i + 1}\n${srtTime(cursor)} --> ${srtTime(cursor + duration)}\n${chapter.title}\n${chapter.body}\n`
    );
    cursor += duration;
    chapter.duration_seconds = Number(duration.toFixed(2));
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
        '[1:a]volume=0.16[bgm];[bgm][0:a]sidechaincompress=threshold=0.03:ratio=10:attack=12:release=300[ducked];[0:a][ducked]amix=inputs=2:duration=first:dropout_transition=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]',
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

  return {
    output: path.relative(ROOT, outPath).replaceAll(path.sep, '/'),
    duration_seconds: Number(cursor.toFixed(2)),
  };
}

async function writeManifests(video) {
  const manifest = {
    generated_at: new Date().toISOString(),
    composition: 'combined-pitch-demo',
    size: { width: 1920, height: 1200 },
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
    .map(
      (chapter, index) => `<article class="chapter" style="--i:${index}">
      <img src="../deck-thumbs/${chapter.id}.png" alt="" />
      <div>
        <p>${htmlEscape(chapter.kicker)}</p>
        <h2>${htmlEscape(chapter.title)}</h2>
        <span>${chapter.duration_seconds}s</span>
      </div>
    </article>`
    )
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
    img { width: 320px; aspect-ratio: 16 / 10; object-fit: cover; border: 1px solid rgba(246, 244, 235, 0.16); }
    p { margin: 0 0 8px; color: #5eead4; text-transform: uppercase; }
    h2 { margin: 0 0 12px; font-size: 26px; }
    span { color: #ff8a61; }
  </style>
</head>
<body>
  <main>
    <h1>Incident Room combined pitch/demo</h1>
    <div class="meta">Final render: ../recording/pitch-demo-combined-final.mp4 · ${video.duration_seconds}s · 1920x1200</div>
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
- Captions: \`pitch/recording/pitch-demo-combined-final.srt\`
- Composition preview: \`pitch/polish-combined/index.html\`
- Duration: ${video.duration_seconds} seconds
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
  await renderPlates();
  await synthesizeNarration();
  const video = await renderVideo();
  await writeManifests(video);
  console.log(JSON.stringify({ ok: true, ...video }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
