# 产品需求文档：Incident Room

## 1. 项目背景

- 产品名称：Incident Room。
- 黑客松：Reddit Mod Tools and Migrated Apps Hackathon。
- 主赛道：Best New Mod Tool。
- App 平台：Reddit Developer Platform / Devvit Web。
- Devvit app slug：`incidentrm260526`。
- Playtest subreddit：`r/incidentrm260526_dev`。
- 核心用户利益：版主团队在快速事件中需要一个共享处理现场。
- 这个 app 不是替代人工 moderation。
- 这个 app 不是批量 action bot。
- 这个 app 不是 Reddit 外部的通用 dashboard。
- 这个 app 是 Reddit custom post 内的 command room。
- 它通过 Devvit triggers 接收 Reddit events。
- 它通过 Devvit menu items 接收版主选中的帖子和评论。
- 它通过确定性规则给证据打分。
- 它把共享状态存到 Devvit Redis。
- 它只在版主声明 incident 后调用真实 OpenAI-compatible model 生成短 briefing。
- 默认 live model 是 Step AI `step-3.6`。
- 代码对本地 env 和 Devvit settings 使用 OpenAI-compatible 命名。
- AI 输出解释 incident 和 caveats。
- AI 输出不会执行 Reddit actions。
- 所有破坏性 moderation 决策仍然由版主审核。
- 证明目标是工作中的 Devvit app，不是静态 mock。

## 2. 问题定义

- Reddit moderation incident 从分散信号开始。
- 信号包括 reports、新评论、可疑链接、重复短语和 moderator actions。
- 版主通常在单独的团队 thread 里协作。
- 这个 thread 和帖子/评论证据是断开的。
- 多个版主可能重复打开同一批 item。
- 迟到加入的版主必须询问之前发生了什么。
- 团队可能忘记为什么某个链接被判为可疑。
- 团队可能在社区注视下做出不一致 action。
- 当前 workaround 是在 queues、notes 和 chat 之间人工 triage。
- 这个 workaround 在体育直播、剧集 finale、AMA、市场事件、危机 thread 中很慢。
- 这个 workaround 造成重复劳动。
- 这个 workaround 让 after-action review 很弱。
- 产品必须减少重复审核，同时不把判断藏在自动化里。
- 产品必须让 review surface 留在 Reddit 内。
- 产品必须支持 desktop review。
- 产品必须支持 QR scan 后的 mobile review。
- 产品必须在 AI 未配置时继续工作。
- 产品必须让 AI boundary 可见。
- 产品必须给评委一个清楚的 10 秒 moment：分散证据变成一个 incident briefing 和 action pack。

## 3. 目标用户

- 主要用户：处理 live incident 的 subreddit moderator。
- 次要用户：负责 shift handoff 的 lead moderator。
- 次要用户：用手机审核可疑链接的 moderator。
- 次要用户：需要 audit trail 的 community operations volunteer。
- 非用户：普通社区成员。
- 非用户：广告主或外部 analytics 用户。
- 非用户：自动 enforcement system。
- 目标社区包括 sports、television、gaming、creator、marketplace、finance 和 crypto subreddits。
- 第一版假设用户有 moderator access。
- 第一版假设 app 安装在一个 subreddit。
- 第一版假设一次处理一个 active room。
- 第一版假设最终 action 由人工 moderator 决定。

## 4. 用户痛点

- 痛点 1：证据分散在 queues 和 conversations。
- 痛点 2：live incident 中重复审核浪费时间。
- 痛点 3：新加入的版主看不到早前决策理由。
- 痛点 4：压力下很难按 domain 聚合可疑链接。
- 痛点 5：report velocity 通常只在单个 item 上可见，不是 room-level pattern。
- 痛点 6：很多 AI moderation tools 让人不放心，因为它们暗示 enforcement。
- 痛点 7：mobile moderator 很难使用 desktop-only dense tool。
- 痛点 8：incident 后团队需要干净的 after-action record。
- 必须满足：一个共享 room，包含 evidence、claims、timeline 和 safe actions。
- 可以加分：AI briefing wording 帮 lead moderator 总结 pattern。
- 惊喜层：版主声明 incident 后，在同一 panel 看到 rules 和 AI caveats 收敛。

## 5. 核心需求与优先级

- `REQ-001` P0：install 创建或打开 Incident Room custom post。
- `REQ-002` P0：版主可以从 subreddit menu 打开 room。
- `REQ-003` P0：版主可以把 post 或 comment 送入 room。
- `REQ-004` P0：Reddit triggers 记录 post、comment、report 和 mod-action evidence。
- `REQ-005` P0：evidence 展示前由确定性 rule signals 打分。
- `REQ-006` P0：room state 持久化到 Devvit Redis。
- `REQ-007` P0：版主可以在 command room 中声明 incident。
- `REQ-008` P0：声明 incident 时，在已配置时调用真实 OpenAI-compatible AI briefing。
- `REQ-009` P0：AI key 通过 `openai_api_key` 或 `OPENAI_API_KEY` 留在 server-side。
- `REQ-010` P0：AI failure 不阻断 rule-based review。
- `REQ-011` P0：版主可以 claim evidence。
- `REQ-012` P0：版主可以 preview action pack。
- `REQ-013` P0：版主可以 confirm 或 skip action pack，模型没有 authority。
- `REQ-014` P1：after-action metrics 展示 reviewed items、confirmed actions、duplicate work avoided 和 followups。
- `REQ-015` P1：mobile layout 支持 QR-opened review。
- `REQ-016` P1：scheduler 过期 stale candidates。
- `REQ-017` P1：docs 解释 architecture、deployment 和 security boundary。
- `REQ-018` P1：screenshots 和 mockups 展示至少三个 desktop surfaces 和一个 mobile surface。

## 6. 方案概述

- Incident Room 使用 Devvit custom post web views 承载 moderator UI。
- splash entry point 介绍 room 并进入 command center。
- command center 展示 status、severity、score、metrics、evidence、briefing、action packs、timeline 和 after-action report。
- Devvit menu items 给版主从 subreddit、post、comment context 进入的快路径。
- Devvit triggers 收集 event-driven evidence。
- rule engine 评估 watch terms、repeated patterns、fresh accounts、report velocity 和 watched domains。
- Redis 保存每个 subreddit 的 single current room state。
- Hono routes 给 custom post client 暴露 state mutations。
- AI adapter 调用 OpenAI-compatible base URL 上的 `/chat/completions`。
- 默认 base URL 是 `https://api.stepfun.com/v1`。
- 默认 model 是 `step-3.6`。
- AI briefing 被解析为受约束的 `AiBrief` object。
- UI 标记 AI status 为 configured、not configured 或 error。
- action pack 是 moderation checklist，不是 automatic action runner。
- scheduler 防止 candidates 无限期停留。

## 7. 用户流程

- Flow A：Install 或 open room。
- Step A1：版主安装 app 或选择 `Open Incident Room`。
- Step A2：Devvit 创建 custom post。
- Step A3：版主打开 command center。
- Step A4：room 从 Redis 加载 persisted state。
- Flow B：Send evidence。
- Step B1：版主看到可疑 post 或 comment。
- Step B2：版主选择 `Send to Incident Room`。
- Step B3：server 把 context 转成 evidence。
- Step B4：rule scoring 添加 signals 和 score。
- Step B5：evidence 出现在 room timeline。
- Flow C：Declare and brief。
- Step C1：lead moderator 看到多个 scored items。
- Step C2：lead moderator 点击 `Declare incident`。
- Step C3：server 调用配置的 OpenAI-compatible model。
- Step C4：AI 返回 JSON briefing。
- Step C5：UI 展示 summary、likely pattern、recommended action pack 和 caveats。
- Flow D：Review and confirm。
- Step D1：版主 claim 一个 evidence item。
- Step D2：版主 preview 一个 action pack。
- Step D3：版主阅读 risk note。
- Step D4：版主人工 review 后 confirm pack。
- Step D5：timeline 记录谁 confirm 了它。
- Flow E：Handoff。
- Step E1：下一位版主从 desktop 或 phone 打开 room。
- Step E2：他们 review timeline 和 after-action metrics。
- Step E3：他们基于可见 claims 继续，而不是重新问团队 thread。

## 8. User Cases（至少两个）

### User case 1 - Live finale spoiler wave（HERO PATH）

- User：television subreddit 的 lead moderator。
- Situation：finale thread 吸引 spoilers 和 suspicious links。
- Pain：三个版主在 reports 上升时检查同一批 comments。
- Trigger：重复 spoiler terms 和 watched domain 跨过 room threshold。
- Desired outcome：创建一个 live room，分配 evidence，并获得谨慎 summary。
- Product response：rule signals 聚合 evidence，`Declare incident` 请求 AI briefing，action pack 进入 preview。
- Demo-visible moment：status 变成 active，briefing 出现在 scored evidence 旁边。

### User case 2 - Scam-link burst from mobile

- User：从手机查看 Reddit 的 moderator。
- Situation：市场事件中一个新 domain 出现在多个 comments。
- Pain：moderator 无法舒服地在 desktop-only tool 中比较 links。
- Trigger：他们从 QR code 或 Reddit mobile surface 打开 room。
- Desired outcome：查看 domain evidence，claim 一个 item，并让其他 item 保持可见。
- Product response：mobile layout 堆叠 incident status、evidence cards 和 action controls。
- Demo-visible moment：phone screenshot 展示同一个 room state，并保留 primary action。

### User case 3 - Shift handoff

- User：first response 后迟到加入的 moderator。
- Situation：初始 wave 变慢，但 unresolved followups 仍存在。
- Pain：chat context 很长，决策没有贴在 evidence 上。
- Trigger：moderator 打开 After action tab。
- Desired outcome：理解哪些被 reviewed、谁 confirmed actions、还有什么 followup。
- Product response：timeline 和 after-action metrics 展示 compact record。
- Demo-visible moment：action pack confirmed 后 after-action metrics 更新。

## 9. Demo 关键路径与 Hero Moment

### 主展示路径（<= 90 秒画面时间）

1. 打开 custom post splash 并进入 command center。
2. 展示带 scored evidence 和 claims 的 candidate incident。
3. 点击 `Declare incident`。
4. 展示通过已配置 OpenAI-compatible model 生成的 AI briefing。
5. Claim 一个 evidence item。
6. Preview 并 confirm action pack。
7. 打开 After action tab 展示记录结果。

### Hero Moment（5 秒）

- 0:00 - room 展示 candidate spoiler 和 suspicious-link burst。
- 0:01 - moderator 点击 `Declare incident`。
- 0:03 - status 变成 active，AI status 变成 configured。
- 0:05 - 简短 briefing 和 caveats 出现在 deterministic rule signals 旁边。

### 视频里第二个可见亮点（combined-pitch-demo 用）

- 在 mobile viewport 打开同一个 room，展示 claim/action flow 在 QR access 后仍然可用。

## 10. 页面 / 模块规划（**>= 3 个交互面**）

- Surface 1：`splash.html` / `src/client/splash.tsx`。
- Responsibility：product entry、install-created room context、进入 command center。
- Components：brand mark、proof stats、primary command button。
- User case：HERO PATH entry。
- Surface 2：`game.html` / `src/client/game.tsx` 里的 overview dashboard。
- Responsibility：incident status、severity、score、metrics、evidence cards、timeline summary。
- Components：status header、metric rail、evidence queue、timeline。
- User case：live finale spoiler wave。
- Surface 3：`game.html` / briefing and action-pack tabs。
- Responsibility：展示 `AiBrief`、caveats、action packs、risk notes、confirm workflow。
- Components：tab control、briefing panel、action pack list、confirm button。
- User case：live finale spoiler wave 和 shift handoff。
- Surface 4：`game.html` / after-action tab。
- Responsibility：reviewed count、confirmed actions、duplicate work avoided、unresolved followups。
- Components：after-action cards 和 timeline。
- User case：shift handoff。
- Surface 5：mobile command room。
- Responsibility：QR-opened phone review with stacked controls。
- Components：responsive header、evidence cards、primary actions、tab navigation。
- User case：scam-link burst from mobile。

## 11. 视觉方向与 UI 原则

- Visual style lane：`operational-dashboard`。
- Rationale：版主在压力下需要扫描速度、信心和低噪音。
- Primary UI library：custom React/Tailwind components。
- Supporting UI library：`lucide-react` icons。
- Typography：system sans，用于 dense readability。
- Color system：高对比 light interface，使用 amber 和 red severity accents。
- Motion：最小状态变化，不做装饰性 transitions。
- Logo source：`public/brand/` 中 hand-authored SVG。
- Avatar source：第一版不用 avatar；moderator names 使用 plain text。
- Generated image assets：来自 `scripts/capture-mockups.mjs` 的真实 screenshots。
- Hero composition：command room full-width screenshot，不是 marketing split layout。
- Visual differentiation note：这是 moderation operations room，不是 consumer AI chat surface。
- Forbidden lookalikes：generic chat assistant、dark cyberpunk dashboard、landing-page gradient hero、standalone analytics SaaS。
- QR mobile access plan：phone width 的 screenshot 和 responsive layout。
- Mobile primary flow：declare incident、read evidence、claim item、review briefing、confirm pack。
- Desktop parity plan：desktop 保持更高 information density，同时保留相同 actions。
- UI labels 保持 English，因为 code 和 app surfaces 都是 English-only。

## 12. 技术约束

- Runtime 必须是 Devvit，因为 bounty 面向 Reddit Developer Platform apps。
- Runtime deployment 不使用 Cloudflare。
- Cloudflare-first default 已覆盖并记录在 `stack.lock.json`。
- Node engine 是 `>=22.2.0`。
- Devvit package version 是 `0.12.24`。
- Client framework 是 React `19` with Vite `8`。
- State 必须使用 Devvit Redis。
- Server routes 必须在 Devvit server bundle 内运行。
- HTTP calls 必须在 `devvit.json` 中 allow-list。
- Required secret setting：`openai_api_key`。
- Local AI env var：`OPENAI_API_KEY`。
- Local base URL env var：`OPENAI_BASE_URL`。
- Local model env var：`OPENAI_DEFAULT_MODEL`。
- Devvit base URL setting：`openai_base_url`。
- Devvit model setting：`openai_model`。
- Default AI base URL：`https://api.stepfun.com/v1`。
- Default AI model：`step-3.6`。
- Official Devvit docs：`https://developers.reddit.com/docs/`。
- Official config schema：`https://developers.reddit.com/schema/config-file.v1.json`。
- Provider key page：`https://platform.stepfun.com/`。
- Real data source 1：Reddit trigger payloads。
- Real data source 2：Devvit menu payloads。
- Real data source 3：Devvit Redis room state。
- Real data source 4：OpenAI-compatible `/chat/completions` response。
- Playtest target：`r/incidentrm260526_dev`。
- App listing target：`https://developers.reddit.com/apps/incidentrm260526`。
- Tests 必须包括 rule scoring 和 browser click flow。
- Source package 不应包含 pitch scratch files 或 screenshots。

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

## 13. 成功指标

- Metric 1：moderator 可以从 custom post 进入 command room。
- Metric 2：moderator 可以一键 declare incident。
- Metric 3：live configured model 在 smoke test 中返回 briefing。
- Metric 4：交互后 evidence claims 可见。
- Metric 5：action-pack confirmation 更新 after-action metrics。
- Metric 6：Playwright 覆盖 declare、claim、briefing、confirm 和 after-action。
- Metric 7：mobile screenshot 展示 primary flow 且没有 horizontal overflow。
- Metric 8：docs 说明如何设置 `openai_api_key` 且不暴露 secrets。
- Metric 9：app 使用真实 slug 上传到 Devvit。
- Metric 10：Devpost writeup 能描述真实 Reddit、Redis、rules 和 AI backbones。

## 14. 风险与 Cut List

- Risk 1：Devvit publish review 可能需要额外 listing metadata 或账号确认。
- Risk 2：最终 Devpost submission 需要 public repository URL 和 demo video URL。
- Risk 3：Devvit API behavior 在平台活跃期可能变化。
- Risk 4：provider latency 可能让 live demo 的 AI briefing 变慢。
- Risk 5：第一版每个 subreddit 只支持一个 current room，不支持 multi-incident archives。
- Risk 6：rule thresholds 安装后需要按真实社区调参。
- Cut item 1：automatic Reddit destructive actions 明确不在范围内。
- Cut item 2：multi-room incident archive 不在 hackathon version 范围内。
- Cut item 3：custom per-subreddit rule editor 限于 settings，不做完整 rule builder。
- Cut item 4：lead/evidence claims 之外的 moderator role assignment 不在范围内。
- Cut item 5：public community-facing incident summaries 不在范围内。
- Must-have flow：declare incident、receive rule-backed AI briefing、claim evidence、confirm action pack。
- Demo flow：splash、overview、briefing、action pack、after-action、mobile proof。
- Release decision：交付保守 command room，而不是不安全的 automatic action bot。
