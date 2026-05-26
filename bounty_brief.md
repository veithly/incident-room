# Bounty Brief: Reddit Mod Tools and Migrated Apps Hackathon

## Source

- Hackathon: https://mod-tools-migration.devpost.com/
- Rules: https://mod-tools-migration.devpost.com/rules
- Devvit docs: https://developers.reddit.com/docs/
- Devvit config schema: https://developers.reddit.com/schema/config-file.v1.json

## Submission window

- Submission period: April 29, 2026 9:00 AM PT to May 27, 2026 6:00 PM PT.
- Judging period: May 28, 2026 to June 9, 2026.
- Online Devpost submission.

## Track decision

- Primary category: Best New Mod Tool.
- Secondary fit: Moderator's Choice.
- Not a ported bot: no original Data API bot is claimed.

## What the sponsor is asking for

- Build a moderation app on Reddit's Developer Platform.
- Focus on existing community pain, moderator time savings, reliable UX, and a tool that can be understood and installed by moderators.
- The app should be close to publishable and compliant with Devvit rules.
- Submission requires an app listing, Reddit usernames, tool overview, project impact, and optional feedback/helper fields.

## Product selected

Incident Room is a Devvit moderation command center for fast-moving subreddit incidents.

Moderators often discover a spoiler wave, scam-link burst, brigading thread, or repeated report pattern from scattered signals: reports, queue items, modmail, and a chat thread where different moderators duplicate each other's work. Incident Room turns those signals into one custom post with evidence, claims, a shared timeline, a rule-score explanation, and a live AI briefing that proposes a safe action pack.

## Why this fits the bounty

- Community impact: reduces duplicate review during time-sensitive incidents.
- Reliable UX: all destructive Reddit-side actions are previewed and confirmed by a moderator; the app is not a black-box enforcement bot.
- Ecosystem impact: uses Devvit web views, triggers, menu actions, Redis persistence, Reddit API post creation, scheduled expiry, and server-side HTTP permissions in one installable mod tool.
- Polish: custom post UI, mobile layout, brand assets, Playwright coverage, live AI smoke test, and submission-ready docs.

## AI decision

AI is structurally useful, not a label. The deterministic rule engine decides whether evidence is suspicious, scores the incident, and keeps the product useful without a key. The AI layer reads the selected evidence after a moderator declares the incident and produces:

- a concise incident summary,
- likely pattern wording for the team,
- a recommended action-pack label,
- caveats that keep human review explicit.

The model never removes, locks, bans, or mutates Reddit state. Human confirmation remains the gate.

## Real data and state

- Reddit triggers: post submit, comment submit, post report, comment report, mod action.
- Moderator menu actions: open command room and send a post/comment to the room.
- Redis: room state, evidence list, claims, timeline, action packs, after-action report.
- Reddit API: creates the custom Incident Room post.
- OpenAI-compatible provider: live server-side chat completion for brief generation.

## Delivery mode

Devpost uses a single project/video flow and the rules say the demo should be under one minute, so delivery mode is a tight `devpost-under-one-minute-demo` cut.

Implemented deliverables include the Devvit app, screenshots, bilingual docs, submission text, and a 58.34 second demo render at `pitch/recording/pitch-demo-combined-final.mp4`. Devvit version `0.0.3` has been submitted for Reddit review. The demo MP4 is also published as a GitHub Release asset; for Devpost's video field, upload that MP4 to YouTube, Vimeo, Facebook, or Youku and paste the public/unlisted URL.
