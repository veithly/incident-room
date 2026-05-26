import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const WIDTH = 1920;
const HEIGHT = 1080;

const slides = [
  {
    id: '01-hook',
    title: 'One shared post before the team splits across tabs',
    image: 'pitch/deck-thumbs/01-hook.png',
  },
  {
    id: '02-product',
    title: 'Declare the incident, then work from the same room',
    image: 'pitch/deck-thumbs/02-product.png',
  },
  {
    id: '03-demo',
    title: 'The live flow is recorded from the running app',
    image: 'pitch/deck-thumbs/03-demo.png',
  },
  {
    id: '04-rules-step',
    title: 'Rules score; Step 3.6 briefs; humans decide',
    image: 'pitch/deck-thumbs/04-rules-step.png',
  },
  {
    id: '05-proof',
    title: 'Repo, review app, tests, and video are ready',
    image: 'pitch/deck-thumbs/05-proof.png',
  },
];

function fileUrl(relativePath) {
  return path.join(ROOT, relativePath).replaceAll('\\', '/');
}

function htmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function deckHtml() {
  const slideMarkup = slides
    .map(
      (slide, index) => `<section class="slide" id="${slide.id}">
  <img src="file:///${fileUrl(slide.image)}" alt="" />
  <footer><span>${index + 1}/5</span><strong>${htmlEscape(slide.title)}</strong></footer>
</section>`
    )
    .join('\n');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Incident Room Submission Deck</title>
  <style>
    @page { size: 16in 9in; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #0d1218;
      color: #f6f4eb;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .slide {
      position: relative;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      page-break-after: always;
      overflow: hidden;
      background: #0d1218;
    }
    .slide:last-child { page-break-after: auto; }
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    footer {
      position: absolute;
      left: 44px;
      right: 44px;
      bottom: 28px;
      display: flex;
      justify-content: space-between;
      gap: 24px;
      color: rgba(246, 244, 235, 0.74);
      font-size: 18px;
      letter-spacing: 0;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
    }
    strong { color: #fff8ee; font-weight: 760; }
  </style>
</head>
<body>
${slideMarkup}
</body>
</html>`;
}

async function main() {
  await fs.mkdir(path.join(ROOT, 'pitch'), { recursive: true });
  const htmlPath = path.join(ROOT, 'pitch', 'deck.html');
  const pdfPath = path.join(ROOT, 'pitch', 'deck.pdf');
  await fs.writeFile(htmlPath, deckHtml(), 'utf8');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  try {
    await page.goto(`file:///${htmlPath.replaceAll('\\', '/')}`, { waitUntil: 'load' });
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      width: '16in',
      height: '9in',
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ ok: true, html: 'pitch/deck.html', pdf: 'pitch/deck.pdf' }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
