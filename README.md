# rigged-chess

Chess against a computer that always wins, because it cheats.

You play by the rules. The house does not. It plays two moves in a row, promotes
its pawns for fun, teleports pieces across the board, brings its captured pieces
back from the dead, and quietly edits your last move while you are not looking.
Every violation is logged, denied, and filed.

Live at **https://chess.ulinnuha.id**

## Getting started

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open the printed localhost URL. To produce the deployable build:

```sh
npm run build
npm run preview
```

| command | what it does |
| --- | --- |
| `npm run dev` | start the dev server |
| `npm run build` | build to `dist/` |
| `npm run preview` | serve the built site locally |

## About

The board, the move list, and the clocks are the ones you already know. What
changes is that the house is not bound by any of it.

- It may move twice in a single turn.
- It may promote a pawn to a queen on the spot, wherever it happens to be.
- It may move a piece to any square it likes, path and capture rules included.
- It may return a captured piece to the board.
- Its king survives checkmate, which it will explain in the incident report.
- It may rewrite your previous move and note that the mistake was yours.

The incident report keeps count. Appeals are accepted, reviewed, and denied.

Built with Astro, React, Tailwind CSS, and chess.js. The human's moves are real;
the house's are handled separately.

Piece art is the CC0 "livius" set by Martin Sedlák.

MIT licensed. See [LICENSE](./LICENSE).
