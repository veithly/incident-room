import { Hono } from 'hono';
import { context } from '@devvit/web/server';
import type {
  ApiError,
  ClaimRequest,
  InitResponse,
  ManualEvidenceRequest,
  MutateResponse,
  PreviewActionRequest,
  ResolveRequest,
} from '../../shared/api';
import {
  addManualEvidence,
  claimEvidence,
  confirmActionPack,
  declareIncident,
  previewActionPack,
} from '../core/incident';
import { loadRoomState, saveRoomState } from '../core/store';

export const api = new Hono();

async function state() {
  return await loadRoomState(context.subredditName, context.username ?? 'moderator');
}

function error(message: string, status = 400) {
  return new Response(JSON.stringify({ status: 'error', message } satisfies ApiError), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

api.get('/init', async (c) => {
  const room = await state();
  return c.json<InitResponse>({ type: 'init', state: room }, 200);
});

api.post('/declare', async (c) => {
  const room = await declareIncident(await state());
  await saveRoomState(room);
  return c.json<MutateResponse>({ type: 'state', state: room }, 200);
});

api.post('/claim', async (c) => {
  const body = await c.req.json<ClaimRequest>();
  if (!body.evidenceId) return error('evidenceId is required');
  const room = claimEvidence(await state(), body.evidenceId);
  await saveRoomState(room);
  return c.json<MutateResponse>({ type: 'state', state: room }, 200);
});

api.post('/action-preview', async (c) => {
  const body = await c.req.json<PreviewActionRequest>();
  const room = previewActionPack(await state(), body.evidenceIds ?? []);
  await saveRoomState(room);
  return c.json<MutateResponse>({ type: 'state', state: room }, 200);
});

api.post('/resolve', async (c) => {
  const body = await c.req.json<ResolveRequest>();
  if (!body.actionPackId) return error('actionPackId is required');
  const room = confirmActionPack(await state(), body.actionPackId);
  await saveRoomState(room);
  return c.json<MutateResponse>({ type: 'state', state: room }, 200);
});

api.post('/evidence', async (c) => {
  const body = await c.req.json<ManualEvidenceRequest>();
  if (!body.title?.trim() || !body.body?.trim()) return error('title and body are required');
  const room = addManualEvidence(await state(), body);
  await saveRoomState(room);
  return c.json<MutateResponse>({ type: 'state', state: room }, 200);
});

api.post('/reset', async (c) => {
  const room = await loadRoomState(context.subredditName, context.username ?? 'moderator');
  const reset = {
    ...room,
    currentIncident: {
      ...room.currentIncident,
      status: 'candidate' as const,
      declaredAt: undefined,
      declaredBy: undefined,
    },
    evidence: room.evidence.map((item) => ({ ...item, claimedBy: undefined })),
    metrics: {
      ...room.metrics,
      openCandidates: 1,
      activeClaims: 0,
      actionsToday: 0,
    },
  };
  await saveRoomState(reset);
  return c.json<MutateResponse>({ type: 'state', state: reset }, 200);
});

