import type { EvidenceItem, EvidenceKind, RoomSettings, RuleSignal, Severity } from './types';

export type RawEvidence = {
  id: string;
  kind: EvidenceKind;
  author: string;
  title: string;
  body: string;
  url?: string;
  accountAgeDays: number;
  reports: number;
  createdAt: string;
  permalink: string;
};

function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function containsTerm(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase());
}

export function scoreToSeverity(score: number): Severity {
  if (score >= 80) return 'critical';
  if (score >= 45) return 'elevated';
  return 'watch';
}

export function evaluateEvidence(
  raw: RawEvidence,
  settings: RoomSettings,
  knownRepeatedTerms: string[] = []
): EvidenceItem {
  const haystack = `${raw.title}\n${raw.body}\n${raw.url ?? ''}`;
  const domain = extractDomain(raw.url);
  const signals: RuleSignal[] = [];

  const matchedWatchTerms = settings.watchTerms.filter((term) => containsTerm(haystack, term));
  if (matchedWatchTerms.length > 0) {
    signals.push({
      id: 'watch-term-match',
      label: 'Watch term match',
      score: 28,
      explanation: `Matched ${matchedWatchTerms.join(', ')}`,
    });
  }

  const repeatedTerms = knownRepeatedTerms.filter((term) => containsTerm(haystack, term));
  if (repeatedTerms.length > 0) {
    signals.push({
      id: 'repeat-pattern',
      label: 'Repeat pattern',
      score: 24,
      explanation: `Repeated across incident evidence: ${repeatedTerms.join(', ')}`,
    });
  }

  if (raw.accountAgeDays <= 3) {
    signals.push({
      id: 'fresh-account',
      label: 'Fresh account',
      score: 18,
      explanation: `Account age ${raw.accountAgeDays} day(s)`,
    });
  }

  if (raw.reports >= 5) {
    signals.push({
      id: 'report-velocity',
      label: 'Report velocity',
      score: Math.min(28, raw.reports * 3),
      explanation: `${raw.reports} report(s) already attached`,
    });
  }

  if (domain && settings.watchTerms.some((term) => containsTerm(domain, term))) {
    signals.push({
      id: 'watched-domain',
      label: 'Watched domain',
      score: 22,
      explanation: `Domain ${domain} is in the configured watch terms`,
    });
  }

  const score = Math.min(100, signals.reduce((sum, signal) => sum + signal.score, 0));

  const item: EvidenceItem = {
    ...raw,
    ruleSignals: signals,
    score,
  };

  if (domain) {
    item.domain = domain;
  }

  return item;
}

export function shouldOpenIncident(evidence: EvidenceItem[], threshold: number): boolean {
  if (evidence.length < 2) return false;
  const maxScore = Math.max(...evidence.map((item) => item.score));
  const combinedSignals = new Set(evidence.flatMap((item) => item.ruleSignals.map((signal) => signal.id)));
  return maxScore >= threshold || (evidence.length >= 3 && combinedSignals.size >= 3);
}

export function makeIncidentTitle(evidence: EvidenceItem[]): string {
  const domains = Array.from(new Set(evidence.map((item) => item.domain).filter(Boolean)));
  const spoilerLike = evidence.some((item) => /spoiler|finale|leak/i.test(`${item.title} ${item.body}`));
  if (domains.length > 0 && spoilerLike) return 'Spoiler and suspicious-link burst';
  if (domains.length > 0) return `Suspicious-link burst: ${domains[0]}`;
  if (spoilerLike) return 'Spoiler wave';
  return 'Coordinated moderation incident';
}
