import { useEffect, useRef } from 'react';
import type { MoveRec } from '../lib/types';

export default function MoveList({ moves }: { moves: MoveRec[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [moves.length]);

  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    const white = moves[i];
    const black = moves[i + 1];
    rows.push(
      <div key={white?.ply ?? i} className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-2 px-3 py-1.5 text-sm odd:bg-white/[0.02]">
        <span className="text-xs text-dim">{Math.floor(i / 2) + 1}.</span>
        <span className="truncate font-mono">{white?.san ?? ''}</span>
        <span className={`truncate font-mono ${black?.illegal ? 'italic text-danger' : ''}`}>
          {black?.san ?? ''}
        </span>
      </div>,
    );
  }

  return (
    <div className="panel flex min-h-0 flex-col">
      <div className="panel-title border-b border-line px-3 py-2">Moves</div>
      <div ref={ref} className="max-h-56 overflow-y-auto py-1">
        {rows.length ? rows : <div className="px-3 py-3 text-sm text-dim">No moves yet.</div>}
      </div>
    </div>
  );
}
