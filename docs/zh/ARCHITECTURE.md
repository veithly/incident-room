# Incident Room 架构

Incident Room 是一个 Devvit Web app。产品入口是 Reddit custom post，server 运行在 Devvit app package 内。架构刻意保持保守：确定性规则判断证据是否重要，Redis 保存每个 subreddit 的共享 room state，AI 只在版主声明 incident 后生成 briefing。

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

## 入口

| Surface | File | Responsibility |
| --- | --- | --- |
| Custom post splash | `src/client/splash.tsx` | 首屏和进入 command room |
| Command room | `src/client/game.tsx` | Dashboard、证据、briefing、action packs、after-action |
| Client data hook | `src/client/hooks/useIncidentRoom.ts` | 获取 `/api/init` 并发送 state mutation |
| Server root | `src/server/index.ts` | 挂载 API、menu、trigger、scheduler routes |
| Public API | `src/server/routes/api.ts` | `init`、`declare`、`claim`、`action-preview`、`resolve`、`evidence`、`reset` |
| Menu routes | `src/server/routes/menu.ts` | 打开 room 或把帖子/评论送入 room |
| Trigger routes | `src/server/routes/triggers.ts` | 把 Reddit events 记录为 evidence 或 timeline context |
| Scheduler | `src/server/routes/scheduler.ts` | 过期 stale incident candidate |

## 状态模型

`src/shared/types.ts` 里的 `RoomState` 是 server routes、tests、React client 共享的契约。

| Object | Key fields |
| --- | --- |
| `RoomState` | `subreddit`, `username`, `settings`, `currentIncident`, `evidence`, `metrics` |
| `Incident` | `status`, `severity`, `score`, `triggerReason`, `roles`, `actionPacks`, `aiBrief`, `timeline`, `afterAction` |
| `EvidenceItem` | `kind`, `author`, `title`, `body`, `domain`, `reports`, `ruleSignals`, `score`, `claimedBy` |
| `ActionPack` | `label`, `targetEvidenceIds`, `actions`, `riskNote`, `status`, `confirmedBy` |
| `AiBrief` | `status`, `provider`, `model`, `summary`, `likelyPattern`, `recommendedActionPack`, `moderatorCaveats` |

Redis key:

```text
incidentroom:state:<subreddit>
```

当前 hackathon 版本每个 subreddit 保持一个 current room。生产化下一步是增加 room ID 和 archived incident list。

## 规则评分

`src/shared/rules.ts` 在证据展示前打分。

| Signal | Meaning |
| --- | --- |
| Watch term match | 社区已经关注的词或域名 |
| Repeat pattern | 多个 item 共享同类 incident wording |
| Fresh account | 新账号常见于 raid 或 spam burst |
| Report velocity | 大量 report 表示社区压力上升 |
| Watched domain | 单一域名扩散需要集中审核 |

`shouldOpenIncident` 在分数达到阈值，或多个 evidence item 触发足够多不同 signal 时打开 candidate。

## AI 边界

AI adapter 在 `src/server/core/ai.ts`。

读取配置顺序：

1. Devvit global setting `openai_api_key`
2. Local env `OPENAI_API_KEY`
3. Devvit global setting `openai_base_url`
4. Local env `OPENAI_BASE_URL`
5. Devvit global setting `openai_model`
6. Local env `OPENAI_DEFAULT_MODEL`

默认 endpoint 和 model：

```text
https://api.stepfun.com/v1
step-3.6
```

模型只需要返回：

- `summary`
- `likelyPattern`
- `recommendedActionPack`
- `moderatorCaveats`

缺 key 时返回 `status: "not-configured"`，provider 失败时返回 `status: "error"`，两个状态都不会阻断规则信号和人工审核。

## 安全边界

- Secret 只在 server-side 读取。
- 浏览器 bundle 不接触 API key。
- `devvit.json` 只 allow-list `api.stepfun.com` 和 `api.openai.com`。
- 模型不能调用 Reddit API。
- 模型不能 remove、lock、ban、approve。
- Action pack 在版主确认前只是 preview。
- 每个 mutation 返回完整 `RoomState`，方便 Playwright 和人工检查。

## 部署边界

这个 hackathon 要求 Reddit Developer Platform / Devvit，所以不使用通用 Cloudflare-first 默认路径。

Devvit app:

```text
https://developers.reddit.com/apps/incidentrm260526
```

Playtest subreddit:

```text
https://www.reddit.com/r/incidentrm260526_dev
```

## 验证映射

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
