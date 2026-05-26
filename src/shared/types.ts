export type Severity = 'watch' | 'elevated' | 'critical';

export type EvidenceKind = 'post' | 'comment' | 'report' | 'mod-action' | 'manual';

export type IncidentStatus = 'candidate' | 'active' | 'resolved' | 'expired';

export type ActionStatus = 'previewed' | 'confirmed' | 'skipped';

export type AiStatus = 'configured' | 'not-configured' | 'error';

export type RuleSignal = {
  id: string;
  label: string;
  score: number;
  explanation: string;
};

export type EvidenceItem = {
  id: string;
  kind: EvidenceKind;
  author: string;
  title: string;
  body: string;
  url?: string;
  domain?: string;
  accountAgeDays: number;
  reports: number;
  createdAt: string;
  permalink: string;
  claimedBy?: string;
  ruleSignals: RuleSignal[];
  score: number;
};

export type ActionPack = {
  id: string;
  label: string;
  description: string;
  targetEvidenceIds: string[];
  actions: string[];
  riskNote: string;
  status: ActionStatus;
  confirmedAt?: string;
  confirmedBy?: string;
};

export type AiBrief = {
  status: AiStatus;
  provider: string;
  model: string;
  summary: string;
  likelyPattern: string;
  recommendedActionPack: string;
  moderatorCaveats: string[];
  generatedAt?: string;
};

export type Incident = {
  id: string;
  title: string;
  subreddit: string;
  status: IncidentStatus;
  severity: Severity;
  score: number;
  triggerReason: string;
  openedAt: string;
  declaredAt?: string;
  resolvedAt?: string;
  declaredBy?: string;
  evidenceIds: string[];
  roles: Record<string, string | null>;
  actionPacks: ActionPack[];
  aiBrief: AiBrief;
  timeline: TimelineEvent[];
  afterAction: AfterActionReport;
};

export type TimelineEvent = {
  id: string;
  at: string;
  actor: string;
  label: string;
  detail: string;
};

export type AfterActionReport = {
  itemsReviewed: number;
  actionsConfirmed: number;
  duplicateWorkAvoided: number;
  avgFirstResponseSeconds: number;
  unresolvedFollowups: string[];
};

export type RoomSettings = {
  watchTerms: string[];
  incidentThreshold: number;
  autoExpireMinutes: number;
};

export type RoomState = {
  subreddit: string;
  username: string;
  settings: RoomSettings;
  currentIncident: Incident;
  evidence: EvidenceItem[];
  metrics: {
    openCandidates: number;
    activeClaims: number;
    actionsToday: number;
    aiStatus: AiStatus;
  };
};

export type ApiError = {
  status: 'error';
  message: string;
};

export type InitResponse = {
  type: 'init';
  state: RoomState;
};

export type MutateResponse = {
  type: 'state';
  state: RoomState;
};

export type PreviewActionRequest = {
  evidenceIds: string[];
};

export type ClaimRequest = {
  evidenceId: string;
};

export type ResolveRequest = {
  actionPackId: string;
};

export type ManualEvidenceRequest = {
  title: string;
  body: string;
  author?: string;
  url?: string;
  kind?: EvidenceKind;
};

