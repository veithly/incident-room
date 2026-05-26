# Devpost Submission Draft: Incident Room

## App listing

- Devvit app slug: `incidentrm260526`
- Devvit app listing: https://developers.reddit.com/apps/incidentrm260526
- Playtest subreddit: https://www.reddit.com/r/incidentrm260526_dev
- Public repository: https://github.com/veithly/incident-room
- Devvit review status: version `0.0.3` submitted for review on May 26, 2026.
- Secret settings configured:
  - `openai_api_key` as a Devvit secret
  - `openai_base_url` = `https://api.stepfun.com/v1`
  - `openai_model` = `step-3.6`

## Reddit usernames

- `u/OppositeRemote3518`

## Tool overview

Incident Room is a Devvit moderation command center for high-pressure subreddit incidents. It listens to Reddit events, scores evidence with deterministic rules, stores a shared state in Redis, and gives moderators a custom post where they can declare an incident, claim evidence, preview action packs, and keep an after-action record.

The AI layer is intentionally bounded. After a moderator declares an incident, Incident Room sends the selected evidence to a server-side OpenAI-compatible model and receives a compact briefing: what appears to be happening, which action pack is safest to review, and which caveats the team should keep in mind. The model cannot remove, lock, ban, or mutate Reddit content. It explains the room; moderators still decide.

Core capabilities:

- Devvit custom post command room with mobile and desktop layouts.
- Trigger ingestion for posts, comments, reports, and mod actions.
- Moderator menu actions to open the room and send evidence into it.
- Rule scoring for watch terms, repeated patterns, fresh accounts, report velocity, and watched domains.
- Redis-backed evidence, timeline, claims, action packs, and after-action metrics.
- Live AI incident briefing through a server-only OpenAI-compatible API key.
- Safe action-pack preview and confirmation workflow.

## Project impact

1. Television, gaming, and sports communities during live events can use Incident Room to contain spoilers or harassment spikes without duplicating review work.
2. Finance, marketplace, and crypto communities can group suspicious-link bursts by domain and report velocity while keeping manual review explicit.
3. Large discussion communities can use the after-action record to hand off a heated incident between moderator shifts.

The main time saving is not one removed click. It is preventing five moderators from re-reading the same evidence, losing the reason for a decision, or taking inconsistent action while the community is watching.

## Category

- Best New Mod Tool.
- Not a ported Data API app.

## Build notes

- Built with Devvit Web, React, Hono, Redis, Reddit API permissions, server-side HTTP, and Playwright.
- AI provider is Step AI `step-3.6` through StepFun's OpenAI-compatible endpoint and can be changed with Devvit settings.
- Combined pitch/demo video rendered locally at `pitch/recording/pitch-demo-combined-final.mp4`:
  - 1920x1200
  - 3:08 runtime
  - includes a live UI recording of declare, claim, briefing, preview, confirm, and after-action review
  - StepAudio `stepaudio-2.5-tts` narration
  - sidechained background music
  - captions at `pitch/recording/pitch-demo-combined-final.srt`
- Local verification commands are listed in `README.md` and `docs/DEPLOYMENT.md`.

## Submission links

- App listing URL: https://developers.reddit.com/apps/incidentrm260526
- Playtest subreddit: https://www.reddit.com/r/incidentrm260526_dev
- Public repository URL: https://github.com/veithly/incident-room
- Demo video URL: https://github.com/veithly/incident-room/releases/download/v0.0.3-demo/pitch-demo-combined-final.mp4
