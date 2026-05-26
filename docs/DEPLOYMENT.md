# Incident Room Deployment

Incident Room deploys to Reddit Developer Platform with the Devvit CLI.

## Prerequisites

- Node `>=22.2.0`
- npm
- Reddit account with Devvit developer access
- Devvit CLI login
- An OpenAI-compatible provider key for the AI briefing

## Install

```bash
npm install
```

## Local verification

```bash
npm run verify
npm run test:e2e
```

`npm run verify` runs:

1. `npm run type-check`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

## Local AI smoke test

The app uses OpenAI-compatible variable names, even when the configured provider is Step AI.

```bash
$env:OPENAI_API_KEY="<provider-key>"
$env:OPENAI_BASE_URL="https://api.stepfun.com/v1"
$env:OPENAI_DEFAULT_MODEL="step-3.6"
node scripts/smoke-ai.mjs
```

Expected result shape:

```json
{
  "summary": "Incident Room AI smoke ok",
  "likelyPattern": "...",
  "recommendedActionPack": "...",
  "moderatorCaveats": ["manual review"]
}
```

## Devvit login

```bash
npx devvit login
```

The current uploaded app slug is:

```text
incidentrm260526
```

## Devvit settings

Set the provider key as a Devvit secret:

```bash
npx devvit settings set openai_api_key
```

Set the provider endpoint and model:

```bash
npx devvit settings set openai_base_url https://api.stepfun.com/v1
npx devvit settings set openai_model step-3.6
```

Confirm the settings:

```bash
npx devvit settings list
```

Expected settings:

| Setting | Secret | Purpose |
| --- | --- | --- |
| `openai_api_key` | yes | Server-side provider key |
| `openai_base_url` | no | OpenAI-compatible endpoint |
| `openai_model` | no | Chat completion model |

## Upload

```bash
npm run deploy
```

Equivalent explicit command:

```bash
npm run type-check
npm run lint
npx devvit upload
```

## Playtest

```bash
npm run dev
```

Devvit playtest subreddit:

```text
https://www.reddit.com/r/incidentrm260526_dev
```

## Publish

```bash
npx devvit publish
```

Publishing may require listing metadata, review confirmation, and final account actions in the Devvit browser flow. Do not paste secrets into the publish form. Keep the secret in Devvit settings only.

## Screenshot generation

```bash
node scripts/capture-mockups.mjs
```

Outputs:

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

Devvit uploads are versioned. If a new upload is bad, upload a fixed build with the same app slug. Do not rotate or reveal `openai_api_key` unless the provider key is compromised.

## Known deployment decision

Cloudflare is not used for this project because the bounty target is a Devvit app listing. The Cloudflare-first default is recorded as overridden in `stack.lock.json`.
