import './index.css';

import { requestExpandedMode } from '@devvit/web/client';
import { Activity, ShieldCheck } from 'lucide-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function Splash() {
  return (
    <main className="min-h-screen p-4 sm:p-6">
      <section className="ir-panel mx-auto flex min-h-[680px] max-w-6xl flex-col overflow-hidden rounded-[8px]">
        <header className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <img className="size-11 rounded-[6px]" src="/brand/logomark.svg" alt="Incident Room" />
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-teal-200">
                Moderator command center
              </p>
              <h1 className="text-xl font-semibold text-slate-50">Incident Room</h1>
            </div>
          </div>
          <span className="ir-chip rounded-[6px] px-3 py-1 text-xs font-medium text-rose-200">
            Live inside Reddit
          </span>
        </header>

        <div className="grid flex-1 gap-6 p-5 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div className="flex flex-col justify-center">
            <p className="mb-4 max-w-xl text-sm font-semibold uppercase tracking-[0.18em] text-amber-200">
              Raids, scam bursts, spoiler waves, and breaking-news surges need a room, not a queue.
            </p>
            <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Declare an incident, assign roles, preview action packs, and leave an audit trail.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Incident Room groups rule signals into one moderator workflow. Rules do the detection;
              the briefing engine explains the pattern; humans confirm every sensitive action.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                className="focus-ring inline-flex items-center gap-2 rounded-[6px] bg-teal-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200"
                onClick={(event) => requestExpandedMode(event.nativeEvent, 'command')}
              >
                <ShieldCheck size={18} />
                Open command room
              </button>
              <div className="ir-chip flex items-center gap-2 rounded-[6px] px-4 py-3 text-sm text-slate-200">
                <Activity size={18} className="text-rose-200" />
                3 signals already grouped
              </div>
            </div>
          </div>

          <div className="grid content-center gap-3">
            {[
              ['Rule signal', 'Watched domain + report velocity', 'critical'],
              ['Role board', 'Lead, evidence, comms, backup', 'assigned'],
              ['Action pack', 'Preview only; confirmation required', 'ready'],
              ['After action', 'Time saved and followups captured', 'tracking'],
            ].map(([label, detail, status]) => (
              <div key={label} className="rounded-[8px] border border-slate-700/70 bg-slate-950/55 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-100">{label}</p>
                  <span className="rounded-[5px] bg-amber-200 px-2 py-1 text-xs font-semibold uppercase text-slate-950">
                    {status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
