# Incident Room 部署

Incident Room 部署到 Reddit Developer Platform，使用 Devvit CLI。

## 前置条件

- Node `>=22.2.0`
- npm
- 有 Devvit developer access 的 Reddit account
- Devvit CLI login
- 用于 AI briefing 的 OpenAI-compatible provider key

## 安装

```bash
npm install
```

## 本地验证

```bash
npm run verify
npm run test:e2e
```

`npm run verify` 会运行：

1. `npm run type-check`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

## 本地 AI smoke test

app 使用 OpenAI-compatible 变量名，即使当前 provider 是 Step AI。

```bash
$env:OPENAI_API_KEY="<provider-key>"
$env:OPENAI_BASE_URL="https://api.stepfun.com/v1"
$env:OPENAI_DEFAULT_MODEL="step-3.6"
node scripts/smoke-ai.mjs
```

## Devvit login

```bash
npx devvit login
```

当前上传的 app slug：

```text
incidentrm260526
```

## Devvit settings

把 provider key 设为 Devvit secret：

```bash
npx devvit settings set openai_api_key
```

设置 endpoint 和 model：

```bash
npx devvit settings set openai_base_url https://api.stepfun.com/v1
npx devvit settings set openai_model step-3.6
```

确认设置：

```bash
npx devvit settings list
```

| Setting | Secret | Purpose |
| --- | --- | --- |
| `openai_api_key` | yes | Server-side provider key |
| `openai_base_url` | no | OpenAI-compatible endpoint |
| `openai_model` | no | Chat completion model |

## Upload

```bash
npm run deploy
```

显式命令：

```bash
npm run type-check
npm run lint
npx devvit upload
```

## Playtest

```bash
npm run dev
```

Playtest subreddit：

```text
https://www.reddit.com/r/incidentrm260526_dev
```

## Publish

```bash
npx devvit publish
```

Publish 可能需要 listing metadata、review confirmation 和浏览器里的账号确认。不要把 secret 粘贴到 publish form；secret 只放在 Devvit settings。

## 生成截图

```bash
node scripts/capture-mockups.mjs
```

输出：

```text
docs/ui-mockups/01-landing.png
docs/ui-mockups/02-app-overview.png
docs/ui-mockups/03-briefing-action-pack.png
docs/ui-mockups/04-mobile-qr.png
docs/screenshots/hero.png
docs/screenshots/flow.png
docs/screenshots/mobile.png
docs/screenshots/architecture.png
public/brand/og.png
```

## Rollback

Devvit upload 有版本。新 upload 出问题时，用同一个 app slug 上传修复版。除非 provider key 泄露，否则不要轮换或暴露 `openai_api_key`。

## 部署决策

这个项目没有使用 Cloudflare，因为 bounty 目标是 Devvit app listing。该覆盖决策记录在 `stack.lock.json`。
