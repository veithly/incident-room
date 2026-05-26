import { Hono } from 'hono';
import type { TaskResponse } from '@devvit/web/server';
import { context } from '@devvit/web/server';
import { loadRoomState, saveRoomState, withTimeline } from '../core/store';

export const scheduler = new Hono();

scheduler.post('/incident-expiry', async (c) => {
  const room = await loadRoomState(context.subredditName, context.username ?? 'scheduler');
  const opened = new Date(room.currentIncident.openedAt).getTime();
  const ageMinutes = (Date.now() - opened) / 60000;
  if (room.currentIncident.status === 'active' || ageMinutes < room.settings.autoExpireMinutes) {
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  }

  const next = withTimeline(
    {
      ...room,
      currentIncident: {
        ...room.currentIncident,
        status: 'expired',
      },
      metrics: {
        ...room.metrics,
        openCandidates: 0,
      },
    },
    'Incident Room',
    'Candidate expired',
    'The incident candidate expired because no moderator declared it within the configured window.'
  );

  await saveRoomState(next);
  return c.json<TaskResponse>({ status: 'ok' }, 200);
});

