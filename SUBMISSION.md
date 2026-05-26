# Devpost Submission Package: Incident Room

Platform: Devpost
Hackathon: Reddit Mod Tools Hackathon
Project name: Incident Room
Public repository: https://github.com/veithly/incident-room

## Submission Status

- Devvit app listing: https://developers.reddit.com/apps/incidentrm260526
- Playtest subreddit: https://www.reddit.com/r/incidentrm260526_dev
- Devvit review status: version `0.0.3` submitted for review on May 26, 2026.
- Review app technical slug: `incidentrm260526`
- Public repo name: `incident-room`
- Demo source MP4: https://github.com/veithly/incident-room/releases/download/v0.0.3-demo/pitch-demo-combined-final.mp4
- Local deck PDF: `pitch/deck.pdf`
- Demo runtime: `00:00:58.34`
- Required external video upload: upload the MP4 to YouTube, Vimeo, Facebook, or Youku and paste the public/unlisted URL into Devpost.

## Reddit Username

`u/OppositeRemote3518`

## Track / Category

Best New Mod Tool

Incident Room is not a port of a Data API app. It is a new Devvit moderation surface built around live incident response, shared evidence review, and moderator-confirmed action packs.

## Short Description

Incident Room gives Reddit moderators one shared command post during a live incident. It groups evidence, lets mods claim work, asks Step 3.6 for a bounded briefing, and keeps every action human-reviewed.

## Tool Overview

Incident Room is a Devvit command room for high-pressure subreddit incidents: spoilers during a live event, harassment spikes in an AMA, or suspicious links spreading across comments. Instead of five moderators reopening the same reports in separate tabs, the team works from one custom post.

The room ingests Reddit events, scores evidence with deterministic rules, stores shared state in Devvit Redis, and shows moderators the active incident, evidence claims, timeline, action packs, and after-action record. A moderator can declare the incident, claim evidence, preview an action pack, confirm the pack, and hand the incident to the next shift with the reasoning still visible.

The AI layer is deliberately bounded. After a moderator declares an incident, Incident Room sends the selected evidence to Step AI `step-3.6` through an OpenAI-compatible server-side endpoint. The model returns a compact briefing: likely pattern, recommended action pack, and moderator caveats. It cannot remove, lock, ban, approve, or mutate Reddit content. Rules score the room; AI explains the room; humans decide.

Core capabilities:

- Devvit custom post command room with desktop and mobile layouts.
- Trigger ingestion for posts, comments, reports, and mod actions.
- Rule scoring for watch terms, repeated patterns, fresh accounts, report velocity, and watched domains.
- Redis-backed evidence, timeline, claims, action packs, briefing state, and after-action metrics.
- Live Step 3.6 briefing through a server-only Devvit secret.
- Safe action-pack preview and confirmation workflow.
- Playwright coverage for declare, claim, briefing, confirm, and after-action flows on desktop and mobile.

## Project Impact

Incident Room helps moderators during the minutes when scattered context causes the most damage. In sports, gaming, and TV communities, it can contain spoilers or harassment spikes without sending every moderator through the same evidence twice. In finance, marketplace, and crypto communities, it can group suspicious-link bursts by domain and report velocity while keeping manual review explicit. In large discussion communities, it gives the next shift a readable after-action trail instead of a pile of chat messages.

The main time saving is not one removed click. It is preventing duplicate review, inconsistent action, and lost reasoning while the community is watching.

## How It Was Built

- Reddit platform: Devvit Web `0.12.24`
- Frontend: React `19`, Vite `8`, Tailwind `4`, lucide icons
- Server: Hono routes inside Devvit
- State: Devvit Redis
- AI: Step AI `step-3.6` through OpenAI-compatible chat completions
- Secrets: Devvit setting `openai_api_key`; browser never receives provider credentials
- Tests: Vitest and Playwright
- Video: Playwright-recorded live UI path, StepAudio `stepaudio-2.5-tts`, sidechained BGM, 1920x1080, under one minute
- Deck: 5-slide visual PDF generated from the same non-blank video frames

## What Was Hard

The hard part was keeping AI useful without letting it outrun moderation policy. Incident Room keeps the scoring deterministic and reviewable, then uses Step 3.6 only for a short briefing after a moderator opens the room. That boundary forced the UI, state model, and tests to treat the model as an explanation layer rather than an enforcement actor.

## Accomplishments

- Built and uploaded a real Devvit app, not a static mock.
- Submitted Devvit version `0.0.3` for review.
- Wired a real Step 3.6 AI smoke path through OpenAI-compatible variables.
- Covered the core moderator flow with Playwright on desktop and mobile.
- Recut the demo to `58.34s`, matching Devpost's under-one-minute guidance.

## Verification

Commands run locally:

```bash
npm run verify
npm run test:e2e
node scripts/smoke-ai.mjs
npm run video:submission
npm run deck:submission
```

Observed results:

- `npm run verify` passed: type-check, lint, unit tests, and Vite build.
- `npm run test:e2e` passed: desktop and mobile Playwright flows.
- Step AI smoke returned a valid structured briefing through `step-3.6`.
- Final MP4 duration: `00:00:58.34`.
- Final MP4 audio: mean `-15.2 dB`, max `-1.4 dB`.
- Release asset size: `7,317,406` bytes.
- Release asset digest: `sha256:5f68aec9e986ae5de659b6252e46e8a1b3e22ee9575b8b03d065c3e065803ab7`.

## Links To Paste

- App listing URL: https://developers.reddit.com/apps/incidentrm260526
- Playtest subreddit: https://www.reddit.com/r/incidentrm260526_dev
- Public repository URL: https://github.com/veithly/incident-room
- Documentation URL: https://github.com/veithly/incident-room/blob/main/docs/ARCHITECTURE.md
- Demo source MP4: https://github.com/veithly/incident-room/releases/download/v0.0.3-demo/pitch-demo-combined-final.mp4
- Devpost video URL: `PASTE_YOUTUBE_OR_VIMEO_URL_AFTER_UPLOAD`

## Built With Tags

Devvit, Reddit API, React, TypeScript, Vite, Tailwind CSS, Hono, Redis, Playwright, Step AI, OpenAI-compatible API

## Final Form Checklist

- [ ] Paste app listing URL.
- [ ] Paste Reddit username.
- [ ] Paste tool overview.
- [ ] Paste project impact.
- [ ] Select Best New Mod Tool.
- [ ] Upload `pitch/recording/pitch-demo-combined-final.mp4` to YouTube/Vimeo/Facebook/Youku as public or unlisted.
- [ ] Paste the canonical video URL into Devpost.
- [ ] Paste repo URL.
- [ ] Re-open every link in an incognito window before clicking Submit.
