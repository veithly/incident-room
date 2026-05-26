# Product Requirements Document: Incident Room

## 1. Project background

- Product name: Incident Room.
- Hackathon: Reddit Mod Tools and Migrated Apps Hackathon.
- Primary track: Best New Mod Tool.
- App platform: Reddit Developer Platform / Devvit Web.
- Devvit app slug: `incidentrm260526`.
- Playtest subreddit: `r/incidentrm260526_dev`.
- Primary user stake: a moderator team needs one shared place during a fast-moving incident.
- The app is not a replacement for human moderation.
- The app is not a mass-action bot.
- The app is not a generic dashboard outside Reddit.
- The app is a command room inside a Reddit custom post.
- It receives Reddit events through Devvit triggers.
- It accepts moderator-selected posts and comments through Devvit menu items.
- It scores evidence through deterministic rules.
- It stores shared state in Devvit Redis.
- It asks a real OpenAI-compatible model for a short briefing only after a moderator declares an incident.
- The default live model is Step AI `step-3.6`.
- The code uses OpenAI-compatible naming for local env and Devvit settings.
- The AI output explains the incident and caveats.
- The AI output does not execute Reddit actions.
- Every destructive moderation decision remains behind moderator review.
- The proof target is a working Devvit app, not a static mock.

## 2. Problem definition

- Reddit moderation incidents start from scattered signals.
- Signals include reports, new comments, suspicious links, repeated phrases, and moderator actions.
- Moderators often coordinate in a separate team thread.
- That thread is disconnected from the post and comment evidence.
- Multiple moderators can reopen the same items.
- A moderator joining late has to ask what already happened.
- A team may forget why a link was treated as suspicious.
- A team may act inconsistently when the community is watching.
- The current workaround is manual triage across queues, notes, and chat.
- The workaround is slow during live sports, TV finales, AMAs, market events, and crisis threads.
- The workaround creates duplicated labor.
- The workaround makes after-action review weak.
- The product must reduce duplicate review without hiding judgment behind automation.
- The product must keep the review surface in Reddit.
- The product must support desktop review.
- The product must support mobile review after a QR scan.
- The product must continue to work when AI is not configured.
- The product must make the AI boundary visible.
- The product must give judges a clear 10 second moment: scattered evidence becomes one incident briefing and action pack.

## 3. Target users

- Primary user: active subreddit moderator handling live incidents.
- Secondary user: lead moderator coordinating a handoff between shifts.
- Secondary user: moderator reviewing suspicious links from a phone.
- Secondary user: community operations volunteer who needs an audit trail.
- Non-user: regular community member.
- Non-user: advertiser or external analytics user.
- Non-user: automated enforcement system.
- Target communities include sports, television, gaming, creator, marketplace, finance, and crypto subreddits.
- The first version assumes the user has moderator access.
- The first version assumes the app is installed in one subreddit.
- The first version assumes incidents are handled one active room at a time.
- The first version assumes human moderators decide final actions.

## 4. User pain points

- Pain point 1: evidence is split across queues and conversations.
- Pain point 2: duplicate review wastes time during a live incident.
- Pain point 3: new moderators cannot see the reason behind earlier decisions.
- Pain point 4: suspicious links are hard to group by domain under pressure.
- Pain point 5: report velocity is visible item by item, not as a room-level pattern.
- Pain point 6: AI moderation tools often feel unsafe because they imply enforcement.
- Pain point 7: a mobile moderator may not get a usable layout from a dense tool.
- Pain point 8: the team needs a clean after-action record after the incident.
- Must-have need: one shared room with evidence, claims, timeline, and safe actions.
- Nice-to-have need: AI briefing wording that helps the lead moderator summarize the pattern.
- Delight layer: the moment a moderator declares the incident and sees rules plus AI caveats converge in one panel.

## 5. Core requirements & priority

- `REQ-001` P0: Install creates or opens an Incident Room custom post.
- `REQ-002` P0: Moderator menu can open the room from the subreddit.
- `REQ-003` P0: Moderator menu can send a post or comment to the room.
- `REQ-004` P0: Reddit triggers record post, comment, report, and mod-action evidence.
- `REQ-005` P0: Evidence is scored by deterministic rule signals before display.
- `REQ-006` P0: Room state persists in Devvit Redis.
- `REQ-007` P0: Moderator can declare an incident from the command room.
- `REQ-008` P0: Declaring an incident requests a real OpenAI-compatible AI briefing when configured.
- `REQ-009` P0: AI key is server-side through `openai_api_key` or `OPENAI_API_KEY`.
- `REQ-010` P0: AI failures do not block rule-based review.
- `REQ-011` P0: Moderator can claim evidence.
- `REQ-012` P0: Moderator can preview an action pack.
- `REQ-013` P0: Moderator can confirm or skip an action pack without model authority.
- `REQ-014` P1: After-action metrics show reviewed items, confirmed actions, duplicate work avoided, and followups.
- `REQ-015` P1: Mobile layout supports QR-opened review.
- `REQ-016` P1: Scheduler expires stale candidates.
- `REQ-017` P1: Docs explain architecture, deployment, and security boundary.
- `REQ-018` P1: Screenshots and mockups show at least three desktop surfaces and one mobile surface.

## 6. Solution overview

- Incident Room uses Devvit custom post web views for the moderator UI.
- The splash entry point introduces the room and opens the command center.
- The command center shows status, severity, score, metrics, evidence, briefing, action packs, timeline, and after-action report.
- Devvit menu items give moderators a fast path from subreddit, post, or comment context.
- Devvit triggers collect event-driven evidence.
- The rule engine evaluates watch terms, repeated patterns, fresh accounts, report velocity, and watched domains.
- Redis keeps a single current room state per subreddit.
- Hono routes expose state mutations to the custom post client.
- The AI adapter calls `/chat/completions` on an OpenAI-compatible base URL.
- The default base URL is `https://api.stepfun.com/v1`.
- The default model is `step-3.6`.
- The AI briefing is parsed into a bounded `AiBrief` object.
- The UI labels the AI status as configured, not configured, or error.
- The action pack is a moderation checklist, not an automatic action runner.
- The scheduler keeps candidates from staying open indefinitely.

## 7. User flows

- Flow A: Install or open room.
- Step A1: Moderator installs the app or chooses `Open Incident Room`.
- Step A2: Devvit creates a custom post.
- Step A3: Moderator opens the command center.
- Step A4: The room loads persisted state from Redis.
- Flow B: Send evidence.
- Step B1: Moderator sees a suspicious post or comment.
- Step B2: Moderator chooses `Send to Incident Room`.
- Step B3: Server converts the context into evidence.
- Step B4: Rule scoring adds signals and score.
- Step B5: The evidence appears in the room timeline.
- Flow C: Declare and brief.
- Step C1: Lead moderator sees multiple scored items.
- Step C2: Lead moderator clicks `Declare incident`.
- Step C3: Server calls the configured OpenAI-compatible model.
- Step C4: AI returns a JSON briefing.
- Step C5: UI shows summary, likely pattern, recommended action pack, and caveats.
- Flow D: Review and confirm.
- Step D1: Moderator claims an evidence item.
- Step D2: Moderator previews an action pack.
- Step D3: Moderator reads the risk note.
- Step D4: Moderator confirms the pack after manual review.
- Step D5: The timeline records who confirmed it.
- Flow E: Handoff.
- Step E1: Next moderator opens the room from desktop or phone.
- Step E2: They review timeline and after-action metrics.
- Step E3: They continue from visible claims instead of asking the team thread.

## 8. User Cases (>= 2)

### User case 1 - Live finale spoiler wave (HERO PATH)

- User: lead moderator of a television subreddit.
- Situation: a finale thread attracts spoilers and suspicious links.
- Pain: three moderators are checking the same comments while reports climb.
- Trigger: repeated spoiler terms and a watched domain cross the room threshold.
- Desired outcome: create one live room, assign evidence, and get a cautious summary.
- Product response: rule signals group the evidence, `Declare incident` requests an AI briefing, and an action pack is previewed.
- Demo-visible moment: the status changes to active and the briefing appears next to scored evidence.

### User case 2 - Scam-link burst from mobile

- User: moderator checking Reddit from a phone.
- Situation: a new domain appears across comments during a market event.
- Pain: the moderator cannot comfortably compare links across a desktop-only tool.
- Trigger: they open the room from a QR code or Reddit mobile surface.
- Desired outcome: see domain evidence, claim one item, and leave the rest visible.
- Product response: mobile layout stacks incident status, evidence cards, and action controls.
- Demo-visible moment: the phone screenshot shows the same room state without losing the primary action.

### User case 3 - Shift handoff

- User: moderator joining late after the first response.
- Situation: the initial wave has slowed but unresolved followups remain.
- Pain: chat context is long and the decisions are not attached to evidence.
- Trigger: the moderator opens the After action tab.
- Desired outcome: understand what was reviewed, who confirmed actions, and what still needs followup.
- Product response: timeline and after-action metrics show a compact record.
- Demo-visible moment: after-action metrics update after the action pack is confirmed.

## 9. Demo critical path & Hero Moment

### Primary demo path (<= 90 s of screen time)

1. Open the custom post splash and enter the command center.
2. Show a candidate incident with scored evidence and claims.
3. Click `Declare incident`.
4. Show the AI briefing generated through the configured OpenAI-compatible model.
5. Claim an evidence item.
6. Preview and confirm the action pack.
7. Open the After action tab and show the recorded result.

### Hero Moment (5 s)

- 0:00 - the room shows a candidate spoiler and suspicious-link burst.
- 0:01 - the moderator clicks `Declare incident`.
- 0:03 - status changes to active and AI status changes to configured.
- 0:05 - a concise briefing and caveats appear beside deterministic rule signals.

### Secondary visible beat (for the combined-pitch-demo video)

- Open the same room in a mobile viewport and show that the claim/action flow remains usable after QR access.

## 10. Pages / modules plan (**>= 3 surfaces**)

- Surface 1: `splash.html` / `src/client/splash.tsx`.
- Responsibility: product entry, install-created room context, route into command center.
- Components: brand mark, proof stats, primary command button.
- User case: HERO PATH entry.
- Surface 2: `game.html` / overview dashboard in `src/client/game.tsx`.
- Responsibility: incident status, severity, score, metrics, evidence cards, timeline summary.
- Components: status header, metric rail, evidence queue, timeline.
- User case: live finale spoiler wave.
- Surface 3: `game.html` / briefing and action-pack tabs.
- Responsibility: show `AiBrief`, caveats, action packs, risk notes, confirm workflow.
- Components: tab control, briefing panel, action pack list, confirm button.
- User case: live finale spoiler wave and shift handoff.
- Surface 4: `game.html` / after-action tab.
- Responsibility: reviewed count, confirmed actions, duplicate work avoided, unresolved followups.
- Components: after-action cards and timeline.
- User case: shift handoff.
- Surface 5: mobile command room.
- Responsibility: QR-opened phone review with stacked controls.
- Components: responsive header, evidence cards, primary actions, tab navigation.
- User case: scam-link burst from mobile.

## 11. Visual direction & UI principles

- Visual style lane: `operational-dashboard`.
- Rationale: moderators need scan speed, confidence, and low visual noise during pressure.
- Primary UI library: custom React/Tailwind components.
- Supporting UI library: `lucide-react` icons.
- Typography: system sans for dense readability.
- Color system: high-contrast light interface with amber and red severity accents.
- Motion: minimal state changes, no decorative transitions.
- Logo source: hand-authored SVG in `public/brand/`.
- Avatar source: none in first version; moderator names are plain text.
- Generated image assets: real screenshots from `scripts/capture-mockups.mjs`.
- Hero composition: full-width screenshot of the command room, not a marketing split layout.
- Visual differentiation note: this is a moderation operations room, not a consumer AI chat surface.
- Forbidden lookalikes: generic chat assistant, dark cyberpunk dashboard, landing-page gradient hero, standalone analytics SaaS.
- QR mobile access plan: screenshot and responsive layout at phone width.
- Mobile primary flow: declare incident, read evidence, claim item, review briefing, confirm pack.
- Desktop parity plan: desktop keeps higher information density while preserving the same actions.
- UI labels remain English because code and app surfaces are English-only.

## 12. Technical constraints

- Runtime must be Devvit because the bounty is for Reddit Developer Platform apps.
- Cloudflare is not used for runtime deployment.
- Cloudflare-first default is overridden and recorded in `stack.lock.json`.
- Node engine is `>=22.2.0`.
- Devvit package version is `0.12.24`.
- Client framework is React `19` with Vite `8`.
- State must use Devvit Redis.
- Server routes must run inside the Devvit server bundle.
- HTTP calls must be allow-listed in `devvit.json`.
- Required secret setting: `openai_api_key`.
- Local AI env var: `OPENAI_API_KEY`.
- Local base URL env var: `OPENAI_BASE_URL`.
- Local model env var: `OPENAI_DEFAULT_MODEL`.
- Devvit base URL setting: `openai_base_url`.
- Devvit model setting: `openai_model`.
- Default AI base URL: `https://api.stepfun.com/v1`.
- Default AI model: `step-3.6`.
- Official Devvit docs: `https://developers.reddit.com/docs/`.
- Official config schema: `https://developers.reddit.com/schema/config-file.v1.json`.
- Provider key page: `https://platform.stepfun.com/`.
- Real data source 1: Reddit trigger payloads.
- Real data source 2: Devvit menu payloads.
- Real data source 3: Devvit Redis room state.
- Real data source 4: OpenAI-compatible `/chat/completions` response.
- Playtest target: `r/incidentrm260526_dev`.
- App listing target: `https://developers.reddit.com/apps/incidentrm260526`.
- Tests must include rule scoring and browser click flow.
- Source package must not include pitch scratch files or screenshots.

### PRD coverage matrix

| Requirement | Priority | User case | Route/component | API/server action | Real data source | Contract/state | Test | Deploy evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `REQ-001` | P0 | HERO PATH | `src/server/core/post.ts` | `reddit.submitCustomPost` | Reddit API | custom post id | `npm run build` | Devvit upload | shipped |
| `REQ-002` | P0 | HERO PATH | `devvit.json` menu | `/internal/menu/open-room` | Devvit menu request | `UiResponse` | `npm run build` | `devvit.json` | shipped |
| `REQ-003` | P0 | HERO PATH | `devvit.json` menu | `/internal/menu/add-evidence` | post/comment context | `EvidenceItem` | `npm run test` | `devvit.json` | shipped |
| `REQ-004` | P0 | HERO PATH | trigger routes | `/internal/triggers/*` | Reddit events | `ManualEvidenceRequest` | `npm run build` | `devvit.json` | shipped |
| `REQ-005` | P0 | HERO PATH | `src/shared/rules.ts` | `evaluateEvidence` | trigger/menu/manual evidence | `RuleSignal` | `tests/rules.test.ts` | `npm run verify` | shipped |
| `REQ-006` | P0 | HERO PATH | `src/server/core/store.ts` | `loadRoomState` and `saveRoomState` | Devvit Redis | `RoomState` | `npm run build` | Redis permission in config | shipped |
| `REQ-007` | P0 | HERO PATH | `Declare incident` button | `/api/declare` | current room evidence | `Incident.status` | `tests/incident-room.e2e.ts` | Playtest subreddit | shipped |
| `REQ-008` | P0 | HERO PATH | briefing panel | `generateAiBrief` | `/chat/completions` | `AiBrief` | `scripts/smoke-ai.mjs` | Devvit secret configured | shipped |
| `REQ-009` | P0 | HERO PATH | settings layer | `getAiConfig` | Devvit settings/env | `AiConfig` | `scripts/smoke-ai.mjs` | `npx devvit settings list` | shipped |
| `REQ-010` | P0 | HERO PATH | briefing panel | AI error handling | provider HTTP response | `AiBrief.status` | `npm run build` | code path in `ai.ts` | shipped |
| `REQ-011` | P0 | HERO PATH | evidence card | `/api/claim` | room evidence | `EvidenceItem.claimedBy` | `tests/incident-room.e2e.ts` | Playtest flow | shipped |
| `REQ-012` | P0 | HERO PATH | action pack panel | `/api/action-preview` | selected evidence | `ActionPack` | `tests/incident-room.e2e.ts` | Playtest flow | shipped |
| `REQ-013` | P0 | HERO PATH | confirm button | `/api/resolve` | action pack state | `ActionPack.status` | `tests/incident-room.e2e.ts` | Playtest flow | shipped |
| `REQ-014` | P1 | Shift handoff | after-action tab | `confirmActionPack` | room timeline | `AfterActionReport` | `tests/incident-room.e2e.ts` | screenshot flow | shipped |
| `REQ-015` | P1 | Mobile scam-link burst | responsive CSS | client render | same `RoomState` | CSS/layout | `scripts/capture-mockups.mjs` | `04-mobile-qr.png` | shipped |
| `REQ-016` | P1 | Shift handoff | scheduler route | `/internal/scheduler/incident-expiry` | Redis room state | `Incident.status` | `npm run build` | scheduler config | shipped |
| `REQ-017` | P1 | Reviewer | docs | README and docs | repository files | docs | manual review | docs committed | shipped |
| `REQ-018` | P1 | Reviewer | screenshot script | `scripts/capture-mockups.mjs` | built client | PNG files | script run | docs screenshots | shipped |

## 13. Success metrics

- Metric 1: a moderator can reach the command room from a custom post.
- Metric 2: a moderator can declare an incident in one click.
- Metric 3: a live configured model returns a briefing in smoke test.
- Metric 4: evidence claims are visible after interaction.
- Metric 5: action-pack confirmation updates after-action metrics.
- Metric 6: Playwright covers declare, claim, briefing, confirm, and after-action.
- Metric 7: the mobile screenshot shows the primary flow without horizontal overflow.
- Metric 8: docs explain how to set `openai_api_key` without exposing secrets.
- Metric 9: the app uploads to Devvit with the real slug.
- Metric 10: the Devpost writeup can describe real Reddit, Redis, rules, and AI backbones.

## 14. Risks & cut list

- Risk 1: Devvit publish review may require additional listing metadata or account confirmation.
- Risk 2: Final Devpost submission needs a public repository URL and demo video URL.
- Risk 3: Devvit API behavior may change while the platform is active.
- Risk 4: Provider latency can make the AI briefing slower during live demo.
- Risk 5: The first version supports one current room per subreddit, not multi-incident archives.
- Risk 6: Rule thresholds need real community tuning after install.
- Cut item 1: automatic Reddit destructive actions are intentionally out of scope.
- Cut item 2: multi-room incident archive is out of scope for hackathon version.
- Cut item 3: custom per-subreddit rule editor is limited to settings, not a full rule builder.
- Cut item 4: moderator role assignment beyond lead/evidence claims is out of scope.
- Cut item 5: public community-facing incident summaries are out of scope.
- Must-have flow: declare an incident, receive rule-backed AI briefing, claim evidence, confirm an action pack.
- Demo flow: splash, overview, briefing, action pack, after-action, mobile proof.
- Release decision: ship the conservative command room rather than an unsafe automatic action bot.
