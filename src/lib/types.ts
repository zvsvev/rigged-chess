import type { Color, PieceSymbol, Square } from 'chess.js';

export type { Color, PieceSymbol, Square };

export interface MoveRec {
  ply: number;
  color: Color;
  san: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  illegal?: boolean;
}

export type Severity = 'minor' | 'moderate' | 'severe' | 'denied';

export interface Incident {
  id: number;
  moveNo: number;
  label: string;
  detail: string;
  severity: Severity;
}

export interface Player {
  name: string;
  rating: string;
  blurb: string;
}
