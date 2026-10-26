import type { Color, PieceSymbol } from 'chess.js';
import { PIECE_MARKUP } from '../lib/piece-markup';

interface Props {
  type: PieceSymbol;
  color: Color;
  className?: string;
}

export default function Piece({ type, color, className }: Props) {
  const markup = PIECE_MARKUP[`${color}${type}`];
  if (!markup) return null;

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={className ? `piece ${className}` : 'piece'}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
