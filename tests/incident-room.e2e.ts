import { test, expect } from '@playwright/test';
import { createInitialRoomState } from '../src/shared/fixtures';
import type { RoomState } from '../src/shared/types';

function activeState(): RoomState {
  const state = createInitialRoomState('incidentroomtest', 'reviewer');
  return {
    ...state,
    currentIncident: {
      ...state.currentIncident,
      status: 'active',
      declaredAt: '2026-05-26T12:01:00.000Z',
      declaredBy: 'reviewer',
      roles: { ...state.currentIncident.roles, lead: 'reviewer' },
      aiBrief: {
        status: 'configured',
        provider: 'OpenAI-compatible',
        model: 'configured-model',
        summary:
          'The evidence points to a coordinated spoiler and suspicious-link burst. The safest path is to contain confirmed violations and leave a status note.',
        likelyPattern: 'Coordinated incident pattern',
        recommendedActionPack: 'Spoiler containment',
        moderatorCaveats: ['Read each linked item first.', 'Use community rule text in the final note.'],
        generatedAt: '2026-05-26T12:01:00.000Z',
      },
    },
    metrics: { ...state.metrics, openCandidates: 0, activeClaims: 1, aiStatus: 'configured' },
  };
}

test.beforeEach(async ({ page }) => {
  let state = createInitialRoomState('incidentroomtest', 'reviewer');
  await page.route('**/api/init', async (route) => {
    await route.fulfill({ json: { type: 'init', state } });
  });
  await page.route('**/api/declare', async (route) => {
    state = activeState();
    await route.fulfill({ json: { type: 'state', state } });
  });
  await page.route('**/api/claim', async (route) => {
    const request = (await route.request().postDataJSON()) as { evidenceId: string };
    state = {
      ...state,
      evidence: state.evidence.map((item) =>
        item.id === request.evidenceId ? { ...item, claimedBy: 'reviewer' } : item
      ),
      metrics: { ...state.metrics, activeClaims: 1 },
    };
    await route.fulfill({ json: { type: 'state', state } });
  });
  await page.route('**/api/action-preview', async (route) => {
    await route.fulfill({ json: { type: 'state', state } });
  });
  await page.route('**/api/resolve', async (route) => {
    state = {
      ...state,
      metrics: { ...state.metrics, actionsToday: state.metrics.actionsToday + 1 },
      currentIncident: {
        ...state.currentIncident,
        actionPacks: state.currentIncident.actionPacks.map((pack, index) =>
          index === 0 ? { ...pack, status: 'confirmed', confirmedBy: 'reviewer' } : pack
        ),
      },
    };
    await route.fulfill({ json: { type: 'state', state } });
  });
  await page.route('**/api/evidence', async (route) => {
    await route.fulfill({ json: { type: 'state', state } });
  });
  await page.route('**/api/reset', async (route) => {
    state = createInitialRoomState('incidentroomtest', 'reviewer');
    await route.fulfill({ json: { type: 'state', state } });
  });
});

test('moderator can declare, claim, brief, and confirm the incident flow', async ({ page }) => {
  await page.goto('/game.html');
  await expect(page.getByRole('heading', { name: 'Incident Room' })).toBeVisible();
  await page.getByRole('button', { name: 'Declare incident' }).click();
  await expect(page.getByText('active', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Claim' }).first().click();
  await expect(page.getByText('Claimed by reviewer')).toBeVisible();
  await page.getByRole('button', { name: 'Briefing' }).click();
  await expect(page.getByText('Coordinated incident pattern')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm pack' }).first().click();
  await expect(page.getByText('confirmed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'After action' }).click();
  await expect(page.getByText('Actions confirmed')).toBeVisible();
});
