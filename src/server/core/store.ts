import { redis } from '@devvit/web/server';
import { createInitialRoomState } from '../../shared/fixtures';
import type { RoomState } from '../../shared/types';

function keyFor(subreddit: string): string {
  return `incidentroom:state:${subreddit.toLowerCase()}`;
}

export async function loadRoomState(subreddit: string, username: string): Promise<RoomState> {
  const raw = await redis.get(keyFor(subreddit));
  if (raw) {
    const state = JSON.parse(raw) as RoomState;
    return {
      ...state,
      username,
    };
  }

  const initial = createInitialRoomState(subreddit, username);
  await saveRoomState(initial);
  return initial;
}

export async function saveRoomState(state: RoomState): Promise<void> {
  await redis.set(keyFor(state.subreddit), JSON.stringify(state));
}

export function withTimeline(state: RoomState, actor: string, label: string, detail: string): RoomState {
  return {
    ...state,
    currentIncident: {
      ...state.currentIncident,
      timeline: [
        {
          id: `tl-${Date.now()}-${Math.round(Math.random() * 10000)}`,
          at: new Date().toISOString(),
          actor,
          label,
          detail,
        },
        ...state.currentIncident.timeline,
      ].slice(0, 20),
    },
  };
}

