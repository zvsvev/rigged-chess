import { useEffect, useRef } from 'react';
import type { MoveRec } from '../lib/types';

interface Row {
  no: number;
  white?: MoveRec;
  black?: MoveRec;
}

function group(moves: MoveRec[]): Row[] {
  const rows: Row[] = [];
  let no = 0;
  for (const move of moves) {
    if (move.color === 'w') {
      no += 1;
      rows.push({ no, white: move });
    } else {
      const last = rows[rows.length - 1];
      if (last && !last.black) last.black = move;
      else rows.push({ no: no || 1, black: move });
    }
  }
  return rows;
}

export default function MoveList({ moves }: { moves: MoveRec[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [moves.length]);

  const rows = group(moves).map((row) => (
    <div
      key={`${row.no}-${row.black?.ply ?? row.white?.ply ?? 0}`}
      className="grid grid-cols-[2.2rem_1fr_1fr] items-center gap-2 px-3 py-1.5 text-sm odd:bg-white/[0.02]"
    >
      <span className="text-xs text-dim">{row.no}.</span>
      <span className="truncate font-mono">{row.white?.san ?? ''}</span>
      <span className={`truncate font-mono ${row.black?.illegal ? 'italic text-danger' : ''}`}>
        {row.black?.san ?? ''}
      </span>
    </div>
  ));

  return (
    <div className="panel flex min-h-0 flex-col">
      <div className="panel-title border-b border-line px-3 py-2">Moves</div>
      <div ref={ref} className="max-h-56 overflow-y-auto py-1">
        {rows.length ? rows : <div className="px-3 py-3 text-sm text-dim">No moves yet.</div>}
      </div>
    </div>
  );
}
