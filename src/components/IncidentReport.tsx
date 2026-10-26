import { useEffect, useRef } from 'react';
import type { Incident } from '../lib/types';

const tone: Record<Incident['severity'], string> = {
  minor: 'border-line text-dim',
  moderate: 'border-gold/40 text-gold',
  severe: 'border-danger/40 text-danger',
  denied: 'border-danger/40 text-danger',
};

export default function IncidentReport({ incidents }: { incidents: Incident[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [incidents.length]);

  return (
    <div className="panel flex min-h-0 flex-col">
      <div className="panel-title flex items-center justify-between border-b border-line px-3 py-2">
        <span>Incident report</span>
        <span className="text-dim/70">{incidents.length ? `${incidents.length} logged` : 'clean so far'}</span>
      </div>
      <div ref={ref} className="max-h-72 overflow-y-auto">
        {incidents.length === 0 ? (
          <div className="px-3 py-3 text-sm text-dim">
            Nothing suspicious yet. Give it a second.
          </div>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="border-b border-line/60 px-3 py-2 text-sm last:border-b-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{incident.label}</span>
                <span
                  className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${tone[incident.severity]}`}
                >
                  {incident.severity}
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-dim">{incident.detail}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
