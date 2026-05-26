import type { EvidenceItem, Incident, RoomSettings, RoomState } from './types';
import { evaluateEvidence } from './rules';

export const defaultSettings: RoomSettings = {
  watchTerms: ['giveaway-wallet.example', 'finale spoiler', 'urgent verification'],
  incidentThreshold: 72,
  autoExpireMinutes: 90,
};

const now = '2026-05-26T12:00:00.000Z';

export const seedEvidence: EvidenceItem[] = [
  evaluateEvidence(
    {
      id: 'ev-spoiler-1',
      kind: 'post',
      author: 'fresh-account-184',
      title: 'Finale leak: ending posted in title',
      body: 'The finale spoiler is being repeated across threads. This one includes the ending in the post title.',
      url: 'https://reddit.com/r/example/comments/spoiler1',
      accountAgeDays: 2,
      reports: 7,
      createdAt: now,
      permalink: 'https://reddit.com/r/example/comments/spoiler1',
    },
    defaultSettings,
    ['giveaway-wallet.example', 'finale spoiler']
  ),
  evaluateEvidence(
    {
      id: 'ev-spoiler-2',
      kind: 'comment',
      author: 'new-fan-009',
      title: 'Comment repeats finale spoiler',
      body: 'Same finale spoiler posted under the live discussion thread.',
      url: 'https://reddit.com/r/example/comments/spoiler2',
      accountAgeDays: 1,
      reports: 4,
      createdAt: now,
      permalink: 'https://reddit.com/r/example/comments/spoiler2',
    },
    defaultSettings,
    ['finale spoiler']
  ),
  evaluateEvidence(
    {
      id: 'ev-link-1',
      kind: 'post',
      author: 'wallet-alert-31',
      title: 'Urgent verification required before claim closes',
      body: 'Visit giveaway-wallet.example to verify your account before the window closes.',
      url: 'https://giveaway-wallet.example/claim',
      accountAgeDays: 0,
      reports: 9,
      createdAt: now,
      permalink: 'https://reddit.com/r/example/comments/link1',
    },
    defaultSettings,
    ['giveaway-wallet.example', 'urgent verification']
  ),
];

export function createInitialIncident(subreddit: string): Incident {
  const evidenceIds = seedEvidence.map((item) => item.id);
  const score = Math.max(...seedEvidence.map((item) => item.score));

  return {
    id: 'incident-spoiler-wave',
    title: 'Spoiler and suspicious-link burst',
    subreddit,
    status: 'candidate',
    severity: 'critical',
    score,
    triggerReason:
      'Three high-signal items matched watch terms, fresh-account pressure, and report velocity.',
    openedAt: now,
    evidenceIds,
    roles: {
      lead: null,
      evidence: null,
      comms: null,
      backup: null,
    },
    actionPacks: [
      {
        id: 'pack-spoiler-containment',
        label: 'Spoiler containment',
        description:
          'Review matching items, remove confirmed spoilers, and publish one calm status comment.',
        targetEvidenceIds: evidenceIds.slice(0, 2),
        actions: [
          'Remove confirmed spoiler posts/comments after preview',
          'Apply spoiler flair where edit is sufficient',
          'Post a moderator status note in the discussion thread',
        ],
        riskNote:
          'Only use after a moderator reads the linked evidence. No automatic removals are executed.',
        status: 'previewed',
      },
      {
        id: 'pack-link-quarantine',
        label: 'Suspicious-link quarantine',
        description:
          'Lock repeated suspicious-link posts and add the domain to the watch list.',
        targetEvidenceIds: ['ev-link-1'],
        actions: [
          'Remove the suspicious-link item after confirmation',
          'Add the domain to the active watch list',
          'Create a follow-up for rule wording review',
        ],
        riskNote:
          'The domain match is deterministic; moderators still confirm the content and intent.',
        status: 'previewed',
      },
    ],
    aiBrief: {
      status: 'not-configured',
      provider: 'OpenAI-compatible',
      model: 'not configured',
      summary:
        'AI briefing is ready to run after the app developer sets the global provider secret.',
      likelyPattern:
        'Rules indicate a combined spoiler wave and suspicious-link burst.',
      recommendedActionPack: 'Spoiler containment',
      moderatorCaveats: [
        'Review each item before removal.',
        'Use status copy only after checking community-specific rule language.',
      ],
    },
    timeline: [
      {
        id: 'tl-opened',
        at: now,
        actor: 'Incident Room',
        label: 'Candidate opened',
        detail:
          'Rules grouped repeated terms, reports, and account-age signals into one incident candidate.',
      },
    ],
    afterAction: {
      itemsReviewed: 0,
      actionsConfirmed: 0,
      duplicateWorkAvoided: 2,
      avgFirstResponseSeconds: 38,
      unresolvedFollowups: ['Review whether the spoiler rule needs a release-day clause.'],
    },
  };
}

export function createInitialRoomState(subreddit: string, username: string): RoomState {
  return {
    subreddit,
    username,
    settings: defaultSettings,
    currentIncident: createInitialIncident(subreddit),
    evidence: seedEvidence,
    metrics: {
      openCandidates: 1,
      activeClaims: 0,
      actionsToday: 0,
      aiStatus: 'not-configured',
    },
  };
}

