import Piece from './Piece';

interface Props {
  name: string;
  rating: string;
  blurb: string;
  active: boolean;
  thoughts: string;
  clock: string;
  house?: boolean;
}

function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export { formatClock };

export default function PlayerCard({ name, rating, blurb, active, thoughts, clock, house }: Props) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`grid h-10 w-10 place-items-center rounded border bg-panel2 ${
          house ? 'border-gold/40' : 'border-line'
        }`}
      >
        <Piece type={house ? 'k' : 'p'} color="w" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold">{name}</span>
          <span className="text-xs text-dim">({rating})</span>
          {active ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
        </div>
        <div className="truncate text-xs text-dim">{thoughts || blurb}</div>
      </div>
      <div
        className={`rounded border px-2 py-1 font-mono text-sm tabular-nums ${
          active ? 'border-accent/50 bg-accent/10 text-ink' : 'border-line text-dim'
        }`}
      >
        {clock}
      </div>
    </div>
  );
}
