import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { addManualEvidence, rawTriggerToEvidence } from '../core/incident';
import { createOrOpenPost } from '../core/post';
import { loadRoomState, saveRoomState } from '../core/store';

export const menu = new Hono();

menu.post('/open-room', async (c) => {
  try {
    const url = await createOrOpenPost();
    return c.json<UiResponse>({ navigateTo: url }, 200);
  } catch (err) {
    console.error('Failed to open Incident Room', err);
    return c.json<UiResponse>({ showToast: 'Failed to create Incident Room post' }, 400);
  }
});

menu.post('/add-evidence', async (c) => {
  try {
    const input = await c.req.json<MenuItemRequest>();
    const room = await loadRoomState(context.subredditName, context.username ?? 'moderator');
    const evidence = rawTriggerToEvidence(input, context.commentId ? 'comment' : 'post');
    const next = addManualEvidence(room, evidence);
    await saveRoomState(next);
    return c.json<UiResponse>({ showToast: 'Added to Incident Room timeline' }, 200);
  } catch (err) {
    console.error('Failed to add menu evidence', err);
    return c.json<UiResponse>({ showToast: 'Could not add this item to Incident Room' }, 400);
  }
});

