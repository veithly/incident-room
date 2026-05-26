import { settings } from '@devvit/web/server';
import type { AiBrief, EvidenceItem, Incident } from '../../shared/types';

type OpenAiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type AiConfig = {
  apiKey?: string;
  baseUrl: string;
  model: string;
  provider: string;
};

async function readSetting(name: string): Promise<string | undefined> {
  try {
    const value = await settings.get<string>(name);
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  } catch {
    return undefined;
  }
}

export async function getAiConfig(): Promise<AiConfig> {
  const settingKey = await readSetting('openai_api_key');
  const settingBaseUrl = await readSetting('openai_base_url');
  const settingModel = await readSetting('openai_model');

  const apiKey =
    settingKey ??
    process.env.OPENAI_API_KEY ??
    undefined;

  const baseUrl =
    settingBaseUrl ??
    process.env.OPENAI_BASE_URL ??
    'https://api.stepfun.com/v1';

  const model =
    settingModel ??
    process.env.OPENAI_DEFAULT_MODEL ??
    'step-3.6';

  return {
    apiKey,
    baseUrl: baseUrl.replace(/\/$/, ''),
    model,
    provider: 'Step AI',
  };
}

export function buildAiBriefMessages(incident: Incident, evidence: EvidenceItem[]): OpenAiMessage[] {
  const compactEvidence = evidence
    .filter((item) => incident.evidenceIds.includes(item.id))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      body: item.body.slice(0, 500),
      score: item.score,
      signals: item.ruleSignals.map((signal) => signal.label),
      reports: item.reports,
      accountAgeDays: item.accountAgeDays,
      domain: item.domain,
    }));

  return [
    {
      role: 'system',
      content:
        'You are Incident Room, an assistant for Reddit moderators. Summarize evidence, explain rule patterns, and suggest safe action packs. Never tell moderators to remove or lock content without manual review. Return compact JSON only.',
    },
    {
      role: 'user',
      content: JSON.stringify({
        incident: {
          title: incident.title,
          severity: incident.severity,
          score: incident.score,
          triggerReason: incident.triggerReason,
        },
        evidence: compactEvidence,
        requiredJsonShape: {
          summary: 'one short paragraph',
          likelyPattern: 'one sentence',
          recommendedActionPack: 'short label',
          moderatorCaveats: ['manual review caveat', 'community-rule caveat'],
        },
      }),
    },
  ];
}

function safeParseBrief(raw: string): Pick<AiBrief, 'summary' | 'likelyPattern' | 'recommendedActionPack' | 'moderatorCaveats'> {
  try {
    const parsed = JSON.parse(raw) as Partial<AiBrief>;
    return {
      summary: String(parsed.summary ?? '').slice(0, 700),
      likelyPattern: String(parsed.likelyPattern ?? '').slice(0, 240),
      recommendedActionPack: String(parsed.recommendedActionPack ?? '').slice(0, 120),
      moderatorCaveats: Array.isArray(parsed.moderatorCaveats)
        ? parsed.moderatorCaveats.map((item) => String(item).slice(0, 180)).slice(0, 4)
        : ['Manual review is required before any moderator action.'],
    };
  } catch {
    return {
      summary: raw.slice(0, 700),
      likelyPattern: 'The model returned unstructured text; moderators should rely on the rule signals first.',
      recommendedActionPack: 'Manual review',
      moderatorCaveats: ['Manual review is required before any moderator action.'],
    };
  }
}

export async function generateAiBrief(incident: Incident, evidence: EvidenceItem[]): Promise<AiBrief> {
  const config = await getAiConfig();
  if (!config.apiKey) {
    return {
      status: 'not-configured',
      provider: config.provider,
      model: config.model,
      summary:
        'AI briefing is not configured yet. Rule signals are still active and all destructive actions remain gated by moderator confirmation.',
      likelyPattern: incident.triggerReason,
      recommendedActionPack: incident.actionPacks[0]?.label ?? 'Manual review',
      moderatorCaveats: [
        'Set openai_api_key with devvit settings set openai_api_key to enable live Step AI analysis.',
        'Until then, use the deterministic rule signals and evidence timeline.',
      ],
    };
  }

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages: buildAiBriefMessages(incident, evidence),
      temperature: 0.2,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    return {
      status: 'error',
      provider: config.provider,
      model: config.model,
      summary: `AI provider returned HTTP ${response.status}. Rule signals remain available.`,
      likelyPattern: incident.triggerReason,
      recommendedActionPack: incident.actionPacks[0]?.label ?? 'Manual review',
      moderatorCaveats: [
        'Check the configured provider URL, allow-listed domain, and secret value.',
        'Do not execute actions based on a failed AI call.',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content ?? '';
  const brief = safeParseBrief(content);

  return {
    status: 'configured',
    provider: config.provider,
    model: config.model,
    generatedAt: new Date().toISOString(),
    ...brief,
  };
}
