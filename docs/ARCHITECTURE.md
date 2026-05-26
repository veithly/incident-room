# Incident Room Architecture

Incident Room is a Devvit Web app. The product surface is a custom post, and the server runs inside the Devvit app package. The design is deliberately conservative: deterministic rules decide which evidence matters, Redis keeps one shared room state per subreddit, and the AI layer produces a briefing only after a moderator declares an incident.

## Runtime shape

```mermaid
flowchart TB
  subgraph Reddit
    events[Post, comment, report, and mod-action events]
    menus[Moderator menu actions]
    customPost[Incident Room custom post]
  end

  subgraph DevvitApp
    triggerRoutes[/internal/triggers/*]
    menuRoutes[/internal/menu/*]
    apiRoutes[/api/*]
    scheduler[/internal/scheduler/incident-expiry]
    rules[Rule scoring engine]
    store[Room state store]
    ai[AI briefing adapter]
  end

  events --> triggerRoutes
  menus --> menuRoutes
  customPost --> apiRoutes
  triggerRoutes --> rules
  menuRoutes --> rules
  apiRoutes --> rules
  rules --> store
  scheduler --> store
  apiRoutes --> ai
  ai --> apiRoutes
  store --> redis[(Devvit Redis)]
```

## Entry points

| Surface | File | Responsibility |
| --- | --- | --- |
| Custom post splash | `src/client/splash.tsx` | First screen and route into the command room |
| Command room | `src/client/game.tsx` | Dashboard, evidence, briefing, action packs, after-action view |
| Client data hook | `src/client/hooks/useIncidentRoom.ts` | Fetches `/api/init` and posts state mutations |
| Server root | `src/server/index.ts` | Mounts API, menu, trigger, and scheduler routes |
| Public API | `src/server/routes/api.ts` | `init`, `declare`, `claim`, `action-preview`, `resolve`, `evidence`, `reset` |
| Menu routes | `src/server/routes/menu.ts` | Open the room or send a post/comment into the room |
| Trigger routes | `src/server/routes/triggers.ts` | Record Reddit events as evidence or timeline context |
| Scheduler | `src/server/routes/scheduler.ts` | Expires stale incident candidates |

## State model

`RoomState` in `src/shared/types.ts` is the shared contract used by server routes, tests, and the React client.

| Object | Key fields |
| --- | --- |
| `RoomState` | `subreddit`, `username`, `settings`, `currentIncident`, `evidence`, `metrics` |
| `Incident` | `status`, `severity`, `score`, `triggerReason`, `roles`, `actionPacks`, `aiBrief`, `timeline`, `afterAction` |
| `EvidenceItem` | `kind`, `author`, `title`, `body`, `domain`, `reports`, `ruleSignals`, `score`, `claimedBy` |
| `ActionPack` | `label`, `targetEvidenceIds`, `actions`, `riskNote`, `status`, `confirmedBy` |
| `AiBrief` | `status`, `provider`, `model`, `summary`, `likelyPattern`, `recommendedActionPack`, `moderatorCaveats` |

Redis key format:

```text
incidentroom:state:<subreddit>
```

The store intentionally keeps one current room per subreddit for the hackathon build. The next production step would add room IDs and archived incident lists.

## Rule scoring

`src/shared/rules.ts` scores every evidence item before it is shown in the room.

| Signal | Why it matters |
| --- | --- |
| Watch term match | Community-specific terms or domains are already under moderator attention |
| Repeat pattern | Multiple items share incident language |
| Fresh account | New accounts are common in raids and spam bursts |
| Report velocity | Many reports on one item indicate active community pressure |
| Watched domain | Link bursts around one domain need grouped review |

`shouldOpenIncident` opens a candidate when the score reaches the configured threshold or when enough distinct signals appear across multiple evidence items.

## AI boundary

The AI adapter lives in `src/server/core/ai.ts`.

It reads configuration in this order:

1. Devvit global setting `openai_api_key`
2. Local env `OPENAI_API_KEY`
3. Devvit global setting `openai_base_url`
4. Local env `OPENAI_BASE_URL`
5. Devvit global setting `openai_model`
6. Local env `OPENAI_DEFAULT_MODEL`

Default endpoint and model:

```text
https://api.stepfun.com/v1
step-3.6
```

The prompt asks for compact JSON with:

- `summary`
- `likelyPattern`
- `recommendedActionPack`
- `moderatorCaveats`

If the key is missing, the app returns `status: "not-configured"` and keeps rule signals active. If the provider returns an error, the room records `status: "error"` and instructs moderators not to act on the failed AI call.

## Security boundary

- Secrets are read server-side through Devvit settings or local env.
- The browser bundle never receives the API key.
- `devvit.json` allow-lists `api.stepfun.com` and `api.openai.com` for server HTTP.
- The model cannot call Reddit APIs.
- The model cannot remove, lock, ban, approve, or distinguish moderator authority.
- Action packs are only previews until a moderator confirms them.
- Every mutation returns a full `RoomState`, making Playwright and manual review easy to inspect.

## Deployment boundary

This hackathon requires Reddit Developer Platform / Devvit. That overrides the generic Cloudflare-first default used by the broader HackathonHunter workflow. The live target is the Devvit App Directory listing:

```text
https://developers.reddit.com/apps/incidentrm260526
```

Playtest subreddit:

```text
https://www.reddit.com/r/incidentrm260526_dev
```

## Verification map

| Claim | Evidence |
| --- | --- |
| Type contracts compile | `npm run type-check` |
| Client and server lint | `npm run lint` |
| Rule scoring works | `npm run test` |
| Browser flow works | `npm run test:e2e` |
| Devvit bundle builds | `npm run build` |
| Step AI endpoint responds | `node scripts/smoke-ai.mjs` with `OPENAI_API_KEY` |
| Devvit settings exist | `npx devvit settings list` |
| Public screenshots are generated | `node scripts/capture-mockups.mjs` |
