import { Chess } from 'chess.js';
import type { Color, PieceSymbol, Square } from 'chess.js';
import { FILES, NAME, VALUE } from './pieces';

export type CheatKind =
  | 'legal'
  | 'double'
  | 'promotion'
  | 'teleport'
  | 'respawn'
  | 'immunity'
  | 'ignore-check'
  | 'rewrite';

export interface HouseAction {
  kind: CheatKind;
  text: string;
  san?: string;
  from?: Square;
  to?: Square;
  piece?: PieceSymbol;
}

export interface HouseContext {
  moveNo: number;
  graveyard: PieceSymbol[];
}

export interface HouseResult {
  fen: string;
  actions: HouseAction[];
}

/** After this many half-moves the house stops pretending and ends it by decree. */
export const DECREE_PLY = 30;

interface Placed {
  square: Square;
  type: PieceSymbol;
  color: Color;
}

const rand = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const chance = (p: number): boolean => Math.random() < p;
const edgeRank = (sq: Square): boolean => sq[1] === '1' || sq[1] === '8';

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function all(g: Chess): Placed[] {
  const out: Placed[] = [];
  const board = g.board();
  for (let r = 0; r < 8; r += 1) {
    for (let f = 0; f < 8; f += 1) {
      const cell = board[r][f];
      if (cell) out.push({ square: cell.square, type: cell.type, color: cell.color });
    }
  }
  return out;
}

function empties(g: Chess): Square[] {
  const out: Square[] = [];
  const board = g.board();
  for (let r = 0; r < 8; r += 1) {
    for (let f = 0; f < 8; f += 1) {
      if (!board[r][f]) out.push(`${FILES[f]}${8 - r}` as Square);
    }
  }
  return out;
}

function squareDistance(a: Square, b: Square | null | undefined): number {
  if (!b) return 0;
  const df = Math.abs(FILES.indexOf(a[0] as (typeof FILES)[number]) - FILES.indexOf(b[0] as (typeof FILES)[number]));
  const dr = Math.abs(Number(a[1]) - Number(b[1]));
  return df + dr;
}

/** chess.js refuses setTurn() while a side is in check (it plays a null move), so flip the turn via the fen. */
function withTurn(fen: string, turn: Color): string {
  const parts = fen.split(' ');
  parts[1] = turn;
  const ep = parts[3];
  if (ep !== '-') {
    const rank = ep[1];
    if ((rank === '3' && turn === 'w') || (rank === '6' && turn === 'b')) parts[3] = '-';
  }
  return parts.join(' ');
}

function centerBonus(sq: Square): number {
  const f = FILES.indexOf(sq[0] as (typeof FILES)[number]);
  const r = Number(sq[1]) - 1;
  return 8 - (Math.abs(f - 3.5) + Math.abs(r - 3.5));
}

function pickMove(g: Chess, exclude: Square | null) {
  const moves = g.moves({ verbose: true }).filter((m) => m.to !== exclude);
  if (!moves.length) return null;
  const score = (m: (typeof moves)[number]): number =>
    (m.captured ? VALUE[m.captured] * 12 : 0) + (m.promotion ? 20 : 0) + centerBonus(m.to);
  moves.sort((a, b) => score(b) - score(a));
  return rand(moves.slice(0, 3));
}

function whiteKing(g: Chess): Square | null {
  return all(g).find((p) => p.type === 'k' && p.color === 'w')?.square ?? null;
}

function blackKing(g: Chess): Square | null {
  return all(g).find((p) => p.type === 'k' && p.color === 'b')?.square ?? null;
}

function kingEscape(g: Chess, actions: HouseAction[]): void {
  const from = blackKing(g);
  if (!from) return;
  const options = shuffle(empties(g));
  for (const sq of options) {
    g.remove(from);
    g.put({ type: 'k', color: 'b' }, sq);
    if (!g.isAttacked(sq, 'w')) {
      actions.push({
        kind: 'immunity',
        from,
        to: sq,
        piece: 'k',
        text: `The House king has relocated from ${from} to ${sq}, out of harm's way and out of the rulebook.`,
      });
      return;
    }
    g.remove(sq);
  }
  g.put({ type: 'k', color: 'b' }, from);
}

function teleport(g: Chess, actions: HouseAction[]): void {
  const movable = all(g)
    .filter((p) => p.color === 'b' && p.type !== 'k')
    .sort((a, b) => VALUE[b.type] - VALUE[a.type]);
  if (!movable.length) return;
  const mover = movable[0];

  const prey = all(g)
    .filter((p) => p.color === 'w' && p.type !== 'k')
    .sort((a, b) => VALUE[b.type] - VALUE[a.type]);

  const greedy = prey.length > 0 && VALUE[prey[0].type] >= 3 && chance(0.75);
  let to: Square;
  if (greedy) {
    to = prey[Math.floor(Math.random() * Math.min(2, prey.length))].square;
  } else {
    const options = empties(g).filter((sq) => !(mover.type === 'p' && edgeRank(sq)));
    if (!options.length) return;
    to = rand(options);
  }
  if (to === blackKing(g) || (mover.type === 'p' && edgeRank(to))) return;

  const captured = g.get(to);
  g.remove(mover.square);
  g.put({ type: mover.type, color: 'b' }, to);
  const verb = captured ? `and removed the ${NAME[captured.type].toLowerCase()} standing there` : 'unchallenged';
  actions.push({
    kind: 'teleport',
    from: mover.square,
    to,
    piece: mover.type,
    text: `The ${NAME[mover.type].toLowerCase()} on ${mover.square} arrived at ${to} ${verb}. Travel time: 0 ms.`,
  });
}

function freePromotion(g: Chess, actions: HouseAction[]): void {
  const pawn = all(g).find((p) => p.color === 'b' && p.type === 'p');
  if (!pawn) return;
  g.remove(pawn.square);
  g.put({ type: 'q', color: 'b' }, pawn.square);
  actions.push({
    kind: 'promotion',
    from: pawn.square,
    to: pawn.square,
    piece: 'q',
    text: `The pawn on ${pawn.square} has been promoted to Queen, mid-board, for outstanding service.`,
  });
}

function respawn(g: Chess, graveyard: PieceSymbol[], actions: HouseAction[]): PieceSymbol | null {
  const type = rand(graveyard);
  const target = whiteKing(g);
  const options = empties(g).filter((sq) => !(type === 'p' && edgeRank(sq)));
  if (!options.length) return null;
  options.sort((a, b) => squareDistance(a, target) - squareDistance(b, target));
  const to = chance(0.7) ? options[0] : rand(options);
  g.put({ type, color: 'b' }, to);
  actions.push({
    kind: 'respawn',
    to,
    piece: type,
    text: `A captured ${NAME[type].toLowerCase()} has returned to the board at ${to}, fully rested.`,
  });
  return type;
}

export function houseTurn(fen: string, ctx: HouseContext): HouseResult {
  const g = new Chess(fen);
  g.load(withTurn(g.fen(), 'b'));
  const actions: HouseAction[] = [];
  const level = Math.min(4, 1 + Math.floor(ctx.moveNo / 5));
  let fallback: string | null = null;

  if (g.isCheckmate()) {
    actions.push({
      kind: 'immunity',
      text: 'Checkmate registered. The House king has declined it under Rule 0.4(b). Play continues.',
    });
    kingEscape(g, actions);
  } else if (g.isCheck() && chance(0.7)) {
    actions.push({
      kind: 'ignore-check',
      text: 'Your check has been received and logged as a clerical error. The House is not in check.',
    });
    if (level >= 2) teleport(g, actions);
  } else {
    const first = pickMove(g, whiteKing(g));
    if (first) {
      g.move(first);
      g.load(withTurn(g.fen(), 'b'));
      actions.push({
        kind: 'legal',
        san: first.san,
        from: first.from,
        to: first.to,
        piece: first.piece,
        text: `The House played ${first.san}.`,
      });
      fallback = withTurn(g.fen(), 'w');
      g.load(withTurn(g.fen(), 'b'));
    }
  }

  if (chance(level >= 2 ? 0.55 : 0.15)) {
    const second = pickMove(g, whiteKing(g));
    if (second) {
      g.move(second);
      g.load(withTurn(g.fen(), 'b'));
      actions.push({
        kind: 'double',
        san: second.san,
        from: second.from,
        to: second.to,
        piece: second.piece,
        text: `The House also played ${second.san}. Two moves this turn, as is its right.`,
      });
    }
  }

  if (chance(level >= 2 ? 0.5 : 0.12)) freePromotion(g, actions);
  if (chance(level >= 2 ? 0.55 : 0.12)) teleport(g, actions);
  if (ctx.graveyard.length && chance(level >= 2 ? 0.45 : 0.12)) respawn(g, ctx.graveyard, actions);

  const king = blackKing(g);
  if (king && g.isAttacked(king, 'w')) kingEscape(g, actions);

  const finalFen = withTurn(g.fen(), 'w');

  try {
    const check = new Chess(finalFen);
    check.fen();
  } catch {
    if (fallback) {
      return { fen: fallback, actions: actions.filter((a) => a.kind === 'legal') };
    }
  }

  return { fen: finalFen, actions };
}

export function rewritePlayerMove(
  fen: string,
  last: { to: Square; piece: PieceSymbol },
): { fen: string; action: HouseAction } | null {
  const g = new Chess(fen);
  const piece = g.get(last.to);
  if (!piece || piece.color !== 'w') return null;

  const options = empties(g).filter((sq) => !(last.piece === 'p' && edgeRank(sq)));
  if (!options.length) return null;
  const to = rand(options);

  g.remove(last.to);
  g.put({ type: piece.type, color: 'w' }, to);

  if (g.isGameOver() || !g.moves().length) return null;

  return {
    fen: g.fen(),
    action: {
      kind: 'rewrite',
      from: last.to,
      to,
      piece: piece.type,
      text: `Your ${NAME[piece.type].toLowerCase()} on ${last.to} was moved to ${to} during review. The correction stands.`,
    },
  };
}

export function materialDiff(fen: string): number {
  const g = new Chess(fen);
  return all(g).reduce((sum, p) => {
    const v = p.type === 'k' ? 0 : VALUE[p.type];
    return sum + (p.color === 'w' ? v : -v);
  }, 0);
}
