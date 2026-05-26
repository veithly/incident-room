import { context } from '@devvit/web/server';
import { createIncidentPost } from './incident';

export async function createOrOpenPost(): Promise<string> {
  const post = await createIncidentPost();
  return `https://reddit.com/r/${context.subredditName}/comments/${post.id}`;
}

