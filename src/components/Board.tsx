import type { CSSProperties } from 'react';
import { Chess } from 'chess.js';
import type { Square } from 'chess.js';
import { FILES } from '../lib/pieces';
import Piece from './Piece';

export interface MoveTarget {
  to: Square;
  capture: boolean;
}

interface Props {
  fen: string;
  selected: Square | null;
  targets: MoveTarget[];
  lastMove: { from: Square; to: Square } | null;
  checkSquare: Square | null;
  interactive: boolean;
  onSquare: (square: Square) => void;
}

export default function Board({ fen, selected, targets, lastMove, checkSquare, interactive, onSquare }: Props) {
  let board = new Chess().board();
  try {
    board = new Chess(fen).board();
  } catch {
    /* keep the starting position if the fen is somehow unreadable */
  }

  const targetMap = new Map<Square, MoveTarget>(targets.map((t) => [t.to, t]));
  const squares = [];

  for (let r = 0; r < 8; r += 1) {
    for (let f = 0; f < 8; f += 1) {
      const rank = 8 - r;
      const square = `${FILES[f]}${rank}` as Square;
      const light = (f + rank) % 2 === 0;
      const cell = board[r][f];
      const target = targetMap.get(square);

      const classes = ['sq', light ? 'light' : 'dark'];
      if (lastMove && (lastMove.from === square || lastMove.to === square)) classes.push('last');
      if (selected === square) classes.push('sel');
      if (checkSquare === square) classes.push('check');
      if (interactive) classes.push('clickable');

      squares.push(
        <div key={square} className={classes.join(' ')} onClick={() => interactive && onSquare(square)}>
          {cell ? <Piece type={cell.type} color={cell.color} /> : null}
          {target && !target.capture && !cell ? <span className="dot" /> : null}
          {target && target.capture ? <span className="dot capture" /> : null}
          {r === 7 ? (
            <span className={`coord file ${light ? 'on-light' : 'on-dark'}`}>{FILES[f]}</span>
          ) : null}
          {f === 0 ? <span className={`coord rank ${light ? 'on-light' : 'on-dark'}`}>{rank}</span> : null}
        </div>,
      );
    }
  }

  return (
    <div className="board" style={{ '--sq': 'clamp(26px, calc(12vw - 8px), 62px)' } as CSSProperties}>
      {squares}
    </div>
  );
}
