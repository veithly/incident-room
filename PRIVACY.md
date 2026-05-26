# Incident Room Privacy Policy

Last updated: May 26, 2026

Incident Room is a Reddit Developer Platform app for subreddit moderators. It processes moderation evidence so a moderator team can coordinate during a community incident.

## Data processed

The app may process:

- Reddit event data delivered to Devvit triggers, such as post, comment, report, and mod-action context.
- Post or comment context selected through the moderator menu item `Send to Incident Room`.
- Moderator username context supplied by Devvit for room actions.
- Room state stored in Devvit Redis, including evidence summaries, rule signals, claims, timeline entries, action-pack status, and after-action metrics.
- Selected incident evidence sent to a server-side OpenAI-compatible AI provider when a moderator clicks `Declare incident`.

## Data storage

Room state is stored in Devvit Redis under a subreddit-scoped key. The hackathon build keeps one current room state per subreddit.

## AI provider data

When AI briefing is configured, Incident Room sends a compact evidence payload to the configured OpenAI-compatible `/chat/completions` endpoint. The payload is limited to incident title, severity, score, trigger reason, and selected evidence fields needed for the briefing.

## Secrets

Provider keys are stored as Devvit secret settings or local server environment variables. They are not sent to the browser bundle.

## User control

Subreddit moderators control whether to install the app, whether to send evidence into the room, and whether to declare an incident that requests an AI briefing.

## Contact

For hackathon review, use the repository issue tracker or the contact details attached to the Devpost submission.
