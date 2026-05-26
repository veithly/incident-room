import { context, reddit } from '@devvit/web/server';
import { evaluateEvidence, makeIncidentTitle, scoreToSeverity, shouldOpenIncident } from '../../shared/rules';
import type {
  ActionPack,
  EvidenceKind,
  EvidenceItem,
  ManualEvidenceRequest,
  RoomState,
} from '../../shared/types';
import { generateAiBrief } from './ai';
import { withTimeline } from './store';

function user(): string {
  return context.username ?? 'moderator';
}

export function createActionPack(evidence: EvidenceItem[]): ActionPack {
  const suspiciousDomains = Array.from(new Set(evidence.map((item) => item.domain).filter(Boolean)));
  const label = suspiciousDomains.length > 0 ? 'Suspicious-link quarantine' : 'Incident containment';

  return {
    id: `pack-${Date.now()}`,
    label,
    description:
      suspiciousDomains.length > 0
        ? `Review ${suspiciousDomains.join(', ')} evidence and quarantine confirmed link-spam items.`
        : 'Review the incident evidence and apply only the actions that match the community rules.',
    targetEvidenceIds: evidence.map((item) => item.id),
    actions: [
      'Open each linked item before taking action',
      'Remove confirmed violations after moderator confirmation',
      'Add one status note so the team does not duplicate work',
    ],
    riskNote:
      'Incident Room previews the pack only. Reddit-side destructive actions stay behind explicit moderator confirmation.',
    status: 'previewed',
  };
}

export async function createIncidentPost(): Promise<{ id: string }> {
  return await reddit.submitCustomPost({
    title: 'Incident Room command center',
  });
}

export async function declareIncident(state: RoomState): Promise<RoomState> {
  const now = new Date().toISOString();
  const incidentEvidence = state.evidence.filter((item) => state.currentIncident.evidenceIds.includes(item.id));
  const aiBrief = await generateAiBrief(state.currentIncident, incidentEvidence);

  const next: RoomState = {
    ...state,
    currentIncident: {
      ...state.currentIncident,
      status: 'active',
      declaredAt: now,
      declaredBy: user(),
      aiBrief,
      roles: {
        ...state.currentIncident.roles,
        lead: state.currentIncident.roles.lead ?? user(),
      },
    },
    metrics: {
      ...state.metrics,
      openCandidates: 0,
      activeClaims: Object.values(state.currentIncident.roles).filter(Boolean).length + 1,
      aiStatus: aiBrief.status,
    },
  };

  return withTimeline(
    next,
    user(),
    'Incident declared',
    'A moderator opened the live command room and requested an AI briefing.'
  );
}

export function claimEvidence(state: RoomState, evidenceId: string): RoomState {
  const nextEvidence = state.evidence.map((item) =>
    item.id === evidenceId ? { ...item, claimedBy: user() } : item
  );

  const next: RoomState = {
    ...state,
    evidence: nextEvidence,
    metrics: {
      ...state.metrics,
      activeClaims: nextEvidence.filter((item) => item.claimedBy).length,
    },
  };

  return withTimeline(next, user(), 'Evidence claimed', `${user()} claimed ${evidenceId} for review.`);
}

export function previewActionPack(state: RoomState, evidenceIds: string[]): RoomState {
  const selected = state.evidence.filter((item) => evidenceIds.includes(item.id));
  const pack = createActionPack(selected.length > 0 ? selected : state.evidence.slice(0, 2));

  const next: RoomState = {
    ...state,
    currentIncident: {
      ...state.currentIncident,
      actionPacks: [pack, ...state.currentIncident.actionPacks].slice(0, 5),
    },
  };

  return withTimeline(
    next,
    user(),
    'Action pack previewed',
    `${pack.label} prepared for ${pack.targetEvidenceIds.length} evidence item(s).`
  );
}

export function confirmActionPack(state: RoomState, actionPackId: string): RoomState {
  const now = new Date().toISOString();
  const nextPacks = state.currentIncident.actionPacks.map((pack) =>
    pack.id === actionPackId
      ? {
          ...pack,
          status: 'confirmed' as const,
          confirmedAt: now,
          confirmedBy: user(),
        }
      : pack
  );

  const confirmed = nextPacks.filter((pack) => pack.status === 'confirmed').length;
  const next: RoomState = {
    ...state,
    currentIncident: {
      ...state.currentIncident,
      actionPacks: nextPacks,
      afterAction: {
        ...state.currentIncident.afterAction,
        itemsReviewed: state.currentIncident.afterAction.itemsReviewed + 1,
        actionsConfirmed: confirmed,
      },
    },
    metrics: {
      ...state.metrics,
      actionsToday: state.metrics.actionsToday + 1,
    },
  };

  return withTimeline(
    next,
    user(),
    'Action pack confirmed',
    'The moderator confirmed the previewed action pack. The audit timeline captured who confirmed it.'
  );
}

export function addManualEvidence(state: RoomState, request: ManualEvidenceRequest): RoomState {
  const knownTerms = state.settings.watchTerms;
  const id = `ev-manual-${Date.now()}`;
  const evidence = evaluateEvidence(
    {
      id,
      kind: request.kind ?? 'manual',
      author: request.author?.trim() || 'unknown-user',
      title: request.title,
      body: request.body,
      url: request.url,
      accountAgeDays: 1,
      reports: 1,
      createdAt: new Date().toISOString(),
      permalink: request.url || `https://reddit.com/r/${state.subreddit}`,
    },
    state.settings,
    knownTerms
  );

  const nextEvidence = [evidence, ...state.evidence].slice(0, 30);
  const shouldOpen = shouldOpenIncident(nextEvidence, state.settings.incidentThreshold);
  const nextIncident = {
    ...state.currentIncident,
    title: makeIncidentTitle(nextEvidence),
    severity: scoreToSeverity(Math.max(...nextEvidence.map((item) => item.score))),
    score: Math.max(...nextEvidence.map((item) => item.score)),
    status: shouldOpen && state.currentIncident.status === 'expired' ? 'candidate' : state.currentIncident.status,
    evidenceIds: Array.from(new Set([evidence.id, ...state.currentIncident.evidenceIds])),
  };

  return withTimeline(
    {
      ...state,
      evidence: nextEvidence,
      currentIncident: nextIncident,
      metrics: {
        ...state.metrics,
        openCandidates: nextIncident.status === 'candidate' ? 1 : state.metrics.openCandidates,
      },
    },
    user(),
    'Evidence added',
    `${evidence.title} scored ${evidence.score} from deterministic rule signals.`
  );
}

export function rawTriggerToEvidence(input: unknown, kind: EvidenceKind): ManualEvidenceRequest {
  const asRecord = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const target = typeof asRecord.targetId === 'string' ? asRecord.targetId : undefined;
  return {
    title: typeof asRecord.title === 'string' ? asRecord.title : `${kind} event ${target ?? ''}`.trim(),
    body:
      typeof asRecord.body === 'string'
        ? asRecord.body
        : `A ${kind} event arrived from Reddit and was added to the incident timeline.`,
    author: typeof asRecord.author === 'string' ? asRecord.author : 'reddit-event',
    url: target ? `https://reddit.com/${target}` : undefined,
    kind,
  };
}

