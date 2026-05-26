import { Hono } from 'hono';
import type { Context as HonoContext } from 'hono';
import type { TriggerResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { addManualEvidence, rawTriggerToEvidence } from '../core/incident';
import { createOrOpenPost } from '../core/post';
import { loadRoomState, saveRoomState, withTimeline } from '../core/store';

export const triggers = new Hono();

triggers.post('/on-app-install', async (c) => {
  try {
    const url = await createOrOpenPost();
    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Incident Room installed in r/${context.subredditName}. Command center: ${url}`,
      },
      200
    );
  } catch (err) {
    console.error('Install trigger failed', err);
    return c.json<TriggerResponse>({ status: 'error', message: 'Install trigger failed' }, 400);
  }
});

async function recordTrigger(
  c: HonoContext,
  label: string,
  kind: 'post' | 'comment' | 'report' | 'mod-action'
) {
  const input = await c.req.json<unknown>();
  const room = await loadRoomState(context.subredditName, context.username ?? 'reddit-event');
  const evidence = rawTriggerToEvidence(input, kind);
  const next = addManualEvidence(room, evidence);
  await saveRoomState(next);
  return c.json<TriggerResponse>({ status: 'success', message: `${label} recorded` }, 200);
}

triggers.post('/on-post-submit', async (c) => recordTrigger(c, 'Post submit', 'post'));
triggers.post('/on-comment-submit', async (c) => recordTrigger(c, 'Comment submit', 'comment'));
triggers.post('/on-post-report', async (c) => recordTrigger(c, 'Post report', 'report'));
triggers.post('/on-comment-report', async (c) => recordTrigger(c, 'Comment report', 'report'));

triggers.post('/on-mod-action', async (c) => {
  const input = await c.req.json<unknown>();
  const room = await loadRoomState(context.subredditName, context.username ?? 'reddit-event');
  const next = withTimeline(
    room,
    context.username ?? 'reddit-event',
    'Moderator action observed',
    `A mod action event was captured for audit context: ${JSON.stringify(input).slice(0, 240)}`
  );
  await saveRoomState(next);
  return c.json<TriggerResponse>({ status: 'success', message: 'Mod action recorded' }, 200);
});
