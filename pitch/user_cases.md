# User Cases: Incident Room

## User case 1 - Spoiler wave containment (HERO PATH)

- User: A lead moderator for a television subreddit on finale night.
- Situation: Several fresh accounts post ending spoilers in titles while users report the same phrase from different threads.
- Pain: The team must act quickly, but separate moderators are opening the same posts and arguing about severity in chat.
- Trigger: A report burst and repeated watch term push the rule score above the incident threshold.
- Desired outcome: One shared room shows the evidence, assigns review ownership, and produces a safe response plan.
- Product response: Incident Room groups the evidence, scores the rule signals, lets moderators claim items, generates an AI briefing, and previews a spoiler-containment action pack.
- Demo-visible moment: Click **Declare Incident** and watch the command room switch into active mode with an AI briefing and a reviewable action pack.

## User case 2 - Scam-link burst

- User: A moderator for a finance or crypto subreddit.
- Situation: Several posts point to the same suspicious domain and pressure users to verify accounts before a deadline.
- Pain: AutoMod can filter obvious terms, but moderators still need a readable explanation and a record of who reviewed which item.
- Trigger: The domain matches a configured watch term and reports rise quickly.
- Desired outcome: The team quarantines confirmed links without blindly removing every adjacent discussion.
- Product response: Incident Room raises watched-domain and report-velocity signals, stores evidence in Redis, and asks the model to summarize the likely pattern without deciding enforcement.
- Demo-visible moment: The Evidence tab shows high-score items, signal badges, and a **Claim** button that updates the room state.

## User case 3 - Shift handoff after a heated thread

- User: A backup moderator joining after the first wave has passed.
- Situation: The main thread is calmer, but the team needs to know what happened and what follow-ups remain.
- Pain: Moderator chat is noisy and there is no short audit trail of decisions.
- Trigger: A moderator opens the After action tab before resolving the incident.
- Desired outcome: The next moderator can see reviewed items, confirmed actions, duplicate work avoided, and follow-ups.
- Product response: Incident Room keeps a timeline, confirmed action packs, and after-action metrics in the same custom post.
- Demo-visible moment: The After action tab shows the summary metrics and unresolved follow-up list.
