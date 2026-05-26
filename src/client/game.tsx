import './index.css';

import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Gauge,
  ListChecks,
  RefreshCcw,
  ShieldCheck,
  Siren,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useIncidentRoom } from './hooks/useIncidentRoom';
import type { EvidenceItem, RoomState } from '../shared/api';

type View = 'overview' | 'evidence' | 'briefing' | 'after-action';

const views: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Overview', icon: Gauge },
  { id: 'evidence', label: 'Evidence', icon: FileSearch },
  { id: 'briefing', label: 'Briefing', icon: Sparkles },
  { id: 'after-action', label: 'After action', icon: ClipboardCheck },
];

function severityClass(score: number) {
  if (score >= 80) return 'bg-rose-300 text-slate-950';
  if (score >= 45) return 'bg-amber-200 text-slate-950';
  return 'bg-teal-200 text-slate-950';
}

function Header({ state, onReset }: { state: RoomState; onReset: () => void }) {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-700/60 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-6">
      <div className="flex items-center gap-3">
        <img className="size-11 shrink-0 rounded-[6px]" src="/brand/logomark.svg" alt="Incident Room" />
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-teal-200">r/{state.subreddit}</p>
          <h1 className="text-xl font-semibold text-slate-50">Incident Room</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="ir-chip rounded-[6px] px-3 py-2 text-xs font-semibold uppercase text-slate-200">
          {state.currentIncident.status}
        </span>
        <span className={`rounded-[6px] px-3 py-2 text-xs font-semibold uppercase ${severityClass(state.currentIncident.score)}`}>
          Score {state.currentIncident.score}
        </span>
        <button
          className="focus-ring inline-flex items-center gap-2 rounded-[6px] border border-slate-600/80 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-slate-800"
          onClick={onReset}
        >
          <RefreshCcw size={15} />
          Reset room
        </button>
      </div>
    </header>
  );
}

function MetricStrip({ state }: { state: RoomState }) {
  const metrics: Array<{ label: string; value: string | number; Icon: LucideIcon }> = [
    { label: 'Open candidates', value: state.metrics.openCandidates, Icon: AlertTriangle },
    { label: 'Active claims', value: state.metrics.activeClaims, Icon: UserCheck },
    { label: 'Actions today', value: state.metrics.actionsToday, Icon: ListChecks },
    { label: 'Briefing', value: state.metrics.aiStatus, Icon: Sparkles },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map(({ label, value, Icon }) => (
        <div key={label} className="ir-panel rounded-[8px] p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.15em] text-slate-400">{label}</p>
            <Icon size={18} className="text-teal-200" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-white">{String(value)}</p>
        </div>
      ))}
    </div>
  );
}

function EvidenceCard({
  item,
  onClaim,
}: {
  item: EvidenceItem;
  onClaim: (id: string) => void;
}) {
  return (
    <article className="rounded-[8px] border border-slate-700/70 bg-slate-950/55 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-[5px] px-2 py-1 text-xs font-semibold ${severityClass(item.score)}`}>
              {item.score}
            </span>
            <span className="ir-chip rounded-[5px] px-2 py-1 text-xs uppercase text-slate-300">
              {item.kind}
            </span>
            {item.claimedBy ? (
              <span className="rounded-[5px] bg-teal-300 px-2 py-1 text-xs font-semibold text-slate-950">
                Claimed by {item.claimedBy}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-semibold text-slate-50">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
        </div>
        <button
          className="focus-ring inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white"
          onClick={() => onClaim(item.id)}
        >
          <UserCheck size={16} />
          Claim
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.ruleSignals.map((signal) => (
          <span key={signal.id} className="rounded-[5px] bg-slate-800 px-2 py-1 text-xs text-slate-200">
            {signal.label}: +{signal.score}
          </span>
        ))}
      </div>
    </article>
  );
}

function Overview({
  state,
  onDeclare,
  onClaim,
}: {
  state: RoomState;
  onDeclare: () => void;
  onClaim: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="ir-panel rounded-[8px] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Current incident</p>
            <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">
              {state.currentIncident.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{state.currentIncident.triggerReason}</p>
          </div>
          <button
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-[6px] bg-rose-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onDeclare}
            disabled={state.currentIncident.status === 'active'}
          >
            <Siren size={17} />
            Declare incident
          </button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {Object.entries(state.currentIncident.roles).map(([role, name]) => (
            <div key={role} className="rounded-[8px] border border-slate-700/70 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{role}</p>
              <p className="mt-2 text-sm font-semibold text-slate-100">{name ?? 'Unassigned'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ir-panel rounded-[8px] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-teal-200">Live evidence</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Highest-risk items</h2>
          </div>
          <FileSearch className="text-teal-200" size={24} />
        </div>
        <div className="mt-4 grid gap-3">
          {state.evidence.slice(0, 2).map((item) => (
            <EvidenceCard key={item.id} item={item} onClaim={onClaim} />
          ))}
        </div>
      </section>
    </div>
  );
}

function EvidenceView({
  state,
  onClaim,
  onAddEvidence,
}: {
  state: RoomState;
  onClaim: (id: string) => void;
  onAddEvidence: (title: string, body: string) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <form
        className="ir-panel rounded-[8px] p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          onAddEvidence(String(form.get('title') ?? ''), String(form.get('body') ?? ''));
          event.currentTarget.reset();
        }}
      >
        <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Manual intake</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Add observed evidence</h2>
        <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="title">
          Evidence title
        </label>
        <input
          id="title"
          name="title"
          className="focus-ring mt-2 w-full rounded-[6px] border border-slate-600 bg-slate-950 px-3 py-3 text-sm text-slate-50"
          placeholder="Repeated suspicious link in megathread"
        />
        <label className="mt-4 block text-sm font-medium text-slate-200" htmlFor="body">
          Evidence note
        </label>
        <textarea
          id="body"
          name="body"
          rows={6}
          className="focus-ring mt-2 w-full rounded-[6px] border border-slate-600 bg-slate-950 px-3 py-3 text-sm leading-6 text-slate-50"
          placeholder="Describe what a moderator observed. The rule engine will score it."
        />
        <button className="focus-ring mt-4 inline-flex items-center gap-2 rounded-[6px] bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-teal-200">
          <FileSearch size={16} />
          Add to timeline
        </button>
      </form>
      <section className="grid gap-3">
        {state.evidence.map((item) => (
          <EvidenceCard key={item.id} item={item} onClaim={onClaim} />
        ))}
      </section>
    </div>
  );
}

function BriefingView({
  state,
  onPreview,
  onResolve,
}: {
  state: RoomState;
  onPreview: () => void;
  onResolve: (id: string) => void;
}) {
  const brief = state.currentIncident.aiBrief;
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="ir-panel rounded-[8px] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-teal-200">Briefing engine</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{brief.likelyPattern}</h2>
          </div>
          <Sparkles className="text-teal-200" size={24} />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">{brief.summary}</p>
        <div className="mt-5 rounded-[8px] border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400">Recommended pack</p>
          <p className="mt-2 font-semibold text-slate-100">{brief.recommendedActionPack}</p>
        </div>
        <ul className="mt-4 space-y-2">
          {brief.moderatorCaveats.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
              <ShieldCheck size={16} className="mt-1 shrink-0 text-amber-200" />
              {item}
            </li>
          ))}
        </ul>
      </section>
      <section className="ir-panel rounded-[8px] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Action packs</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Preview before confirmation</h2>
          </div>
          <button
            className="focus-ring inline-flex items-center gap-2 rounded-[6px] bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-white"
            onClick={onPreview}
          >
            <ListChecks size={16} />
            New preview
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          {state.currentIncident.actionPacks.map((pack) => (
            <article key={pack.id} className="rounded-[8px] border border-slate-700/70 bg-slate-950/55 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">{pack.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{pack.description}</p>
                </div>
                <span className="rounded-[5px] bg-slate-800 px-2 py-1 text-xs uppercase text-slate-200">
                  {pack.status}
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {pack.actions.map((action) => (
                  <li key={action} className="flex gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-200" />
                    {action}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-5 text-amber-100">{pack.riskNote}</p>
              <button
                className="focus-ring mt-4 inline-flex items-center gap-2 rounded-[6px] bg-rose-300 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => onResolve(pack.id)}
                disabled={pack.status === 'confirmed'}
              >
                <ShieldCheck size={16} />
                Confirm pack
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function AfterActionView({ state }: { state: RoomState }) {
  const report = state.currentIncident.afterAction;
  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="ir-panel rounded-[8px] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-teal-200">After-action report</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Work captured while the room was active</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ['Items reviewed', report.itemsReviewed],
            ['Actions confirmed', report.actionsConfirmed],
            ['Duplicate work avoided', report.duplicateWorkAvoided],
            ['First response', `${report.avgFirstResponseSeconds}s`],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-[8px] border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-[8px] border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Followups</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
            {report.unresolvedFollowups.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="ir-panel rounded-[8px] p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Audit timeline</p>
        <div className="mt-4 grid gap-3">
          {state.currentIncident.timeline.map((event) => (
            <article key={event.id} className="rounded-[8px] border border-slate-700/70 bg-slate-950/55 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{new Date(event.at).toLocaleTimeString()}</span>
                <span>{event.actor}</span>
              </div>
              <h3 className="mt-2 font-semibold text-slate-100">{event.label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{event.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function CommandRoom() {
  const {
    state,
    loading,
    error,
    declareIncident,
    claimEvidence,
    previewActionPack,
    confirmActionPack,
    addEvidence,
    resetRoom,
  } = useIncidentRoom();
  const [view, setView] = useState<View>('overview');

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <div className="ir-panel rounded-[8px] p-6 text-slate-100">Loading command room...</div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="grid min-h-screen place-items-center p-4">
        <div className="ir-panel max-w-lg rounded-[8px] p-6">
          <h1 className="text-xl font-semibold text-white">Incident Room could not start</h1>
          <p className="mt-2 text-sm text-slate-300">{error ?? 'Open the app from a Reddit post context.'}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-3 sm:p-5">
      <div className="ir-panel mx-auto max-w-[1440px] overflow-hidden rounded-[8px]">
        <Header state={state} onReset={resetRoom} />
        <div className="p-4 lg:p-6">
          <MetricStrip state={state} />
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {views.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`focus-ring inline-flex shrink-0 items-center gap-2 rounded-[6px] px-3 py-2 text-sm font-semibold transition ${
                  view === id
                    ? 'bg-teal-300 text-slate-950'
                    : 'border border-slate-700 bg-slate-950/40 text-slate-200 hover:bg-slate-800'
                }`}
                onClick={() => setView(id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          {error ? (
            <div className="mt-4 rounded-[8px] border border-rose-300/50 bg-rose-950/40 p-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
          <section className="mt-4">
            {view === 'overview' ? (
              <Overview state={state} onDeclare={declareIncident} onClaim={claimEvidence} />
            ) : null}
            {view === 'evidence' ? (
              <EvidenceView state={state} onClaim={claimEvidence} onAddEvidence={addEvidence} />
            ) : null}
            {view === 'briefing' ? (
              <BriefingView
                state={state}
                onPreview={() => previewActionPack(state.evidence.slice(0, 2).map((item) => item.id))}
                onResolve={confirmActionPack}
              />
            ) : null}
            {view === 'after-action' ? <AfterActionView state={state} /> : null}
          </section>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CommandRoom />
  </StrictMode>
);
