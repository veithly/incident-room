# Idea: Incident Room

## One sentence

Incident Room gives subreddit mod teams a shared command center for fast-moving incidents, combining deterministic rule signals with a live AI briefing while keeping every destructive action behind moderator confirmation.

## The problem

When a subreddit is hit by a spoiler wave, scam-link burst, coordinated report pattern, or brigading thread, the evidence spreads across queue items, reports, comments, and moderator chat. One moderator removes a post, another opens the same thread, a third writes a status comment, and nobody has a clean record of why the decision was made.

## The product

- A Devvit custom post becomes the live incident room.
- Trigger endpoints collect posts, comments, reports, and mod actions.
- A deterministic rule engine scores watch terms, report velocity, fresh accounts, repeated terms, and watched domains.
- Moderators claim evidence so duplicate work drops.
- AI turns selected evidence into a compact briefing and action-pack recommendation.
- Action packs are previewed and then confirmed by a moderator.
- The after-action report shows items reviewed, actions confirmed, duplicate work avoided, and follow-ups.

## Magic moment

The moderator clicks **Declare Incident** and the room changes from scattered evidence to an active command room: severity locks in, claims become visible, the AI brief explains the pattern, and a safe action pack is ready for review.

## Why it is not an AI wrapper

The app works without an AI key because the rule engine, Redis state, Devvit triggers, Reddit menus, and moderator workflow are the core. AI adds the summary layer that makes the room easier to operate under pressure. It cannot take action on Reddit by itself.

## Track fit

- Best New Mod Tool: a new moderation workflow built for Devvit installability.
- Moderator's Choice: direct day-to-day pain relief for teams managing urgent incidents.
