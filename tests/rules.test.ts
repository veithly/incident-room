import { describe, expect, it } from 'vitest';
import { defaultSettings, seedEvidence } from '../src/shared/fixtures';
import { evaluateEvidence, makeIncidentTitle, shouldOpenIncident } from '../src/shared/rules';

describe('incident rule engine', () => {
  it('scores repeated suspicious evidence without AI', () => {
    const item = evaluateEvidence(
      {
        id: 'ev-test',
        kind: 'post',
        author: 'new-user',
        title: 'Urgent verification needed',
        body: 'Please visit giveaway-wallet.example to verify before claim closes.',
        url: 'https://giveaway-wallet.example/claim',
        accountAgeDays: 0,
        reports: 8,
        createdAt: '2026-05-26T12:00:00.000Z',
        permalink: 'https://reddit.com/r/example/comments/test',
      },
      defaultSettings,
      ['giveaway-wallet.example']
    );

    expect(item.score).toBeGreaterThanOrEqual(80);
    expect(item.ruleSignals.map((signal) => signal.id)).toContain('watched-domain');
    expect(item.ruleSignals.map((signal) => signal.id)).toContain('report-velocity');
  });

  it('opens an incident when several signals converge', () => {
    expect(shouldOpenIncident(seedEvidence, defaultSettings.incidentThreshold)).toBe(true);
    expect(makeIncidentTitle(seedEvidence)).toBe('Spoiler and suspicious-link burst');
  });
});

