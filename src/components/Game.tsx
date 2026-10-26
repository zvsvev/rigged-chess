import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import type { Color, Move, PieceSymbol, Square } from 'chess.js';
import Board, { type MoveTarget } from './Board';
import EvalBar from './EvalBar';
import PlayerCard, { formatClock } from './PlayerCard';
import MoveList from './MoveList';
import IncidentReport from './IncidentReport';
import AppealModal from './AppealModal';
import HouseRules from './HouseRules';
import { DECREE_PLY, houseTurn, rewritePlayerMove, type HouseAction } from '../lib/house';
import { APPEAL_VERDICTS, FAIR_PLAY_LINES, pick } from '../lib/incidents';
import type { Incident, MoveRec, Severity } from '../lib/types';

const CLOCK_START = 300;
const HOUSE_DELAY_MIN = 620;
const HOUSE_DELAY_MAX = 1150;
const STREAK_KEY = 'rigged-chess-streak';

type Phase = 'terms' | 'playing' | 'over';

const ABBR: Record<PieceSymbol, string> = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: '' };

const ACTION_META: Partial<Record<HouseAction['kind'], { label: string; severity: Severity }>> = {
  promotion: { label: 'Unauthorized promotion', severity: 'moderate' },
  teleport: { label: 'Piece relocated mid-game', severity: 'severe' },
  respawn: { label: 'Captured piece returned', severity: 'severe' },
  immunity: { label: 'Checkmate declined', severity: 'severe' },
  'ignore-check': { label: 'Check disregarded', severity: 'moderate' },
  rewrite: { label: 'Your move was corrected', severity: 'moderate' },
};

function kingSquare(game: Chess, color: Color): Square | null {
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

export default function Game() {
  const [phase, setPhase] = useState<Phase>('terms');
  const [fen, setFen] = useState(() => new Chess().fen());
  const [selected, setSelected] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [moves, setMoves] = useState<MoveRec[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [graveyard, setGraveyard] = useState<PieceSymbol[]>([]);
  const [winner, setWinner] = useState<'house' | null>(null);
  const [outcome, setOutcome] = useState('');
  const [status, setStatus] = useState('');
  const [thinking, setThinking] = useState(false);
  const [playerTime, setPlayerTime] = useState(CLOCK_START);
  const [appealOpen, setAppealOpen] = useState(false);
  const [verdict, setVerdict] = useState('');
  const [streak, setStreak] = useState(() => {
    try {
      return Number(localStorage.getItem(STREAK_KEY) ?? '0') || 0;
    } catch {
      return 0;
    }
  });
  const [fairPlay] = useState(() => pick(FAIR_PLAY_LINES));

  const timer = useRef<number | undefined>(undefined);
  const incidentId = useRef(0);

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  }, [fen]);

  const turn = game.turn();
  const houseKing = useMemo(() => kingSquare(game, 'b'), [game]);
  const checkSquare = useMemo(() => (game.isCheck() ? kingSquare(game, turn) : null), [game, turn]);
  const canInteract = phase === 'playing' && turn === 'w' && !thinking && !winner;

  const targets = useMemo<MoveTarget[]>(() => {
    if (!canInteract || !selected) return [];
    return game
      .moves({ square: selected, verbose: true })
      .filter((move) => move.to !== houseKing)
      .map((move) => ({ to: move.to, capture: Boolean(move.captured) }));
  }, [game, canInteract, selected, houseKing]);

  const endHouse = useCallback((reason: string) => {
    setWinner('house');
    setThinking(false);
    setOutcome(reason);
    setStatus(reason);
    setPhase('over');
    setStreak((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(STREAK_KEY, String(next));
      } catch {
        /* private mode, ignore */
      }
      return next;
    });
  }, []);

  const runHouse = useCallback(
    (fromFen: string, ply: number, yard: PieceSymbol[]) => {
      const moveNo = Math.floor(ply / 2) + 1;
      const result = houseTurn(fromFen, { moveNo, graveyard: yard });
      const recs: MoveRec[] = [];
      const fresh: Incident[] = [];
      let nextYard = [...yard];
      let last: { from: Square; to: Square } | null = null;

      for (const action of result.actions) {
        if (action.kind === 'legal' || action.kind === 'double') {
          recs.push({
            ply: ply + recs.length + 1,
            color: 'b',
            san: action.san ?? '',
            from: action.from as Square,
            to: action.to as Square,
            piece: action.piece ?? 'p',
            illegal: action.kind === 'double',
          });
          if (action.from && action.to) last = { from: action.from, to: action.to };
        } else if (action.kind === 'teleport' && action.from && action.to) {
          recs.push({
            ply: ply + recs.length + 1,
            color: 'b',
            san: `${ABBR[action.piece ?? 'q']}\u2192${action.to}`,
            from: action.from,
            to: action.to,
            piece: action.piece ?? 'q',
            illegal: true,
          });
          last = { from: action.from, to: action.to };
        } else if (action.kind === 'respawn' && action.to) {
          recs.push({
            ply: ply + recs.length + 1,
            color: 'b',
            san: `+${ABBR[action.piece ?? 'p']}@${action.to}`,
            from: action.to,
            to: action.to,
            piece: action.piece ?? 'p',
            illegal: true,
          });
          if (action.piece) {
            const idx = nextYard.indexOf(action.piece);
            if (idx >= 0) nextYard = nextYard.filter((_, i) => i !== idx);
          }
        } else if (action.kind === 'promotion' && action.to) {
          recs.push({
            ply: ply + recs.length + 1,
            color: 'b',
            san: `${action.to}=Q*`,
            from: action.to,
            to: action.to,
            piece: 'q',
            illegal: true,
          });
          last = { from: action.to, to: action.to };
        }

        const meta = ACTION_META[action.kind];
        if (meta) {
          fresh.push({
            id: (incidentId.current += 1),
            moveNo,
            label: meta.label,
            detail: action.text,
            severity: meta.severity,
          });
        }
      }

      setMoves((prev) => [...prev, ...recs]);
      setGraveyard(nextYard);
      setFen(result.fen);
      setSelected(null);
      if (last) setLastMove(last);

      if (fresh.length) setIncidents((prev) => [...fresh, ...prev]);

      if (fresh.length && Math.random() < 0.25) {
        const fee = 5 + Math.floor(Math.random() * 9);
        setPlayerTime((value) => Math.max(0, value - fee));
        setIncidents((prev) => [
          {
            id: (incidentId.current += 1),
            moveNo,
            label: 'Clock adjustment fee',
            detail: `The House deducted ${fee} seconds from your clock for administrative reasons.`,
            severity: 'minor',
          },
          ...prev,
        ]);
      }

      let after: Chess;
      try {
        after = new Chess(result.fen);
      } catch {
        after = new Chess();
      }

      const totalPly = ply + recs.length;
      if (after.isCheckmate()) {
        endHouse('Checkmate. The House wins, precisely on schedule.');
      } else if (after.isStalemate()) {
        endHouse('Stalemate. Resolved in favour of the House, as always.');
      } else if (after.isDraw()) {
        endHouse('A draw was detected and promptly overruled. The House takes the point.');
      } else if (totalPly >= DECREE_PLY) {
        endHouse('The House has invoked Rule 7.2 and awarded itself the game.');
      } else {
        setThinking(false);
        setStatus('');
      }
    },
    [endHouse],
  );

  const playMove = useCallback(
    (from: Square, to: Square) => {
      if (phase !== 'playing' || thinking || winner || to === houseKing) return;

      const next = new Chess(fen);
      let move: Move | null = null;
      try {
        move = next.move({ from, to, promotion: 'q' });
      } catch {
        return;
      }
      if (!move) return;

      let nextFen = next.fen();
      const captured = move.captured;
      let nextYard = captured ? [...graveyard, captured] : [...graveyard];
      const ply = moves.length + 1;

      setSelected(null);
      setLastMove({ from: move.from, to: move.to });
      setMoves((prev) => [
        ...prev,
        {
          ply,
          color: 'w',
          san: move.san,
          from: move.from,
          to: move.to,
          piece: move.piece,
          captured: move.captured,
        },
      ]);

      if (ply >= 4 && Math.random() < 0.16) {
        const edited = rewritePlayerMove(nextFen, { to: move.to, piece: move.piece });
        if (edited) {
          nextFen = edited.fen;
          const meta = ACTION_META[edited.action.kind];
          if (meta) {
            setIncidents((prev) => [
              {
                id: (incidentId.current += 1),
                moveNo: Math.floor(ply / 2) + 1,
                label: meta.label,
                detail: edited.action.text,
                severity: meta.severity,
              },
              ...prev,
            ]);
          }
        }
      }

      setFen(nextFen);
      setGraveyard(nextYard);
      setThinking(true);
      setStatus('The House is considering its options…');
      timer.current = window.setTimeout(
        () => runHouse(nextFen, ply, nextYard),
        HOUSE_DELAY_MIN + Math.random() * (HOUSE_DELAY_MAX - HOUSE_DELAY_MIN),
      );
    },
    [phase, thinking, winner, fen, houseKing, graveyard, moves.length, runHouse],
  );

  const startGame = useCallback(() => {
    window.clearTimeout(timer.current);
    setFen(new Chess().fen());
    setSelected(null);
    setLastMove(null);
    setMoves([]);
    setIncidents([]);
    setGraveyard([]);
    setWinner(null);
    setOutcome('');
    setThinking(false);
    setPlayerTime(CLOCK_START);
    setVerdict('');
    setAppealOpen(false);
    setStatus('');
    setPhase('playing');
  }, []);

  useEffect(() => {
    if (phase !== 'playing' || winner) return undefined;
    const id = window.setInterval(() => {
      setPlayerTime((value) => {
        if (value <= 1) {
          endHouse('Your flag fell. The House wins on time, as anticipated.');
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, winner, endHouse]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onSquare = (square: Square) => {
    if (!canInteract) return;
    const piece = game.get(square);
    if (selected && targets.some((target) => target.to === square)) {
      playMove(selected, square);
      return;
    }
    if (piece && piece.color === 'w') {
      setSelected(square);
      return;
    }
    setSelected(null);
  };

  const houseThoughts = thinking
    ? 'contemplating its options'
    : incidents.length
      ? incidents[0].label.toLowerCase()
      : 'awaiting your first mistake';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <div className="flex items-baseline gap-3">
            <span className="symbol text-2xl leading-none text-gold">{'\u265A'}</span>
            <span className="font-bold tracking-tight">rigged-chess</span>
            <span className="hidden text-xs text-dim sm:inline">the house always wins</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={() => setAppealOpen(true)} disabled={phase !== 'playing'}>
              Appeals
            </button>
            <button className="btn btn-gold" onClick={startGame}>
              New game
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <PlayerCard
              house
              name="THE HOUSE"
              rating={'\u221E'}
              blurb="undefeated since 1987"
              active={phase === 'playing' && turn === 'b'}
              thoughts={houseThoughts}
              clock={'\u221E'}
            />

            <div className="flex items-stretch gap-3">
              <EvalBar />
              <div className="relative">
                <Board
                  fen={fen}
                  selected={selected}
                  targets={targets}
                  lastMove={lastMove}
                  checkSquare={checkSquare}
                  interactive={canInteract}
                  onSquare={onSquare}
                />
              </div>
            </div>

            <PlayerCard
              name="YOU"
              rating="800"
              blurb={`${streak} straight losses`}
              active={phase === 'playing' && turn === 'w'}
              thoughts={status}
              clock={formatClock(playerTime)}
            />

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                className="btn"
                onClick={() => endHouse('You resigned. The House accepts, graciously and immediately.')}
                disabled={phase !== 'playing' || Boolean(winner)}
              >
                Resign
              </button>
              <button className="btn" onClick={() => setAppealOpen(true)} disabled={phase !== 'playing'}>
                File an appeal
              </button>
              <span className="ml-auto text-[11px] text-dim">{fairPlay}</span>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="panel flex items-center justify-between px-3 py-2 text-sm">
              <span className="panel-title">Official score</span>
              <span className="font-mono">
                <span className="text-ink">YOU 0</span>
                <span className="mx-2 text-dim">·</span>
                <span className="text-gold">HOUSE {streak}</span>
              </span>
            </div>
            <MoveList moves={moves} />
            <IncidentReport incidents={incidents} />
            <HouseRules />
          </aside>
        </div>
      </main>

      <footer className="border-t border-line px-4 py-4 text-center text-xs text-dim">
        built by{' '}
        <a
          href="https://ulinnuha.id"
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink underline-offset-2 hover:underline"
        >
          ulinnuha.eth
        </a>
      </footer>

      {phase === 'terms' ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4">
          <div className="panel w-full max-w-lg p-6 text-center">
            <div className="symbol text-4xl text-gold">{'\u265A'}</div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Think you can win?</h1>
            <p className="mt-2 text-sm text-dim">
              You play by the rules of chess. The House plays by the rules of the House. The difference is
              significant, and entirely in the House&rsquo;s favour.
            </p>
            <button className="btn btn-gold mt-5 w-full" onClick={startGame}>
              I agree (there is no other option)
            </button>
            <p className="mt-3 text-[11px] text-dim">
              By playing you accept that the House may revise the board, the score, and the past.
            </p>
          </div>
        </div>
      ) : null}

      {phase === 'over' ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/80 p-4">
          <div className="panel w-full max-w-lg p-6 text-center">
            <div className="panel-title">Final result</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-gold">THE HOUSE WINS</h1>
            <p className="mt-3 text-sm text-dim">{outcome}</p>
            <p className="mt-2 text-xs text-dim">
              As it did last time, and as it will next time. The House is now {streak} from {streak}.
            </p>
            <button className="btn btn-gold mt-5 w-full" onClick={startGame}>
              Start another rigged game
            </button>
          </div>
        </div>
      ) : null}

      {appealOpen ? (
        <AppealModal
          verdict={verdict}
          onClose={() => setAppealOpen(false)}
          onAppeal={() => setVerdict(pick(APPEAL_VERDICTS))}
        />
      ) : null}
    </div>
  );
}
