# Spider Solitaire

A desktop-first Spider Solitaire built with React, TypeScript and Vite.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # engine unit tests (Vitest)
npm run build    # type-check + production build into dist/
```

## How it plays

- **Difficulty**: Easy = 1 suit (spades), Medium = 2 suits (spades, hearts), Hard = 4 suits.
- **Click** a card to send it to the best legal column (same-suit target first, then moves that
  uncover a face-down card, then anything else).
- **Drag** a card or a same-suit run to choose exactly where it goes. Legal columns light up.
- **Deal** from the stock (bottom right). Dealing is blocked while any column is empty.
- **Scoring** is classic Microsoft style: start at 500, each move (deals and undo included)
  costs 1 point, each completed K→A run earns 100.
- **Shortcuts**: `H` hint, `N` new game, `U` or `Ctrl/Cmd+Z` undo.
- The game in progress and your record (per difficulty) are saved in the browser.

## Project layout

```
src/engine   pure game logic: deck, rules, moves, scoring, move ranking (no React)
src/hooks    useGame (state, undo, timer, persistence), stats, FLIP card animation
src/ui       App, Board (drag + click), cards, dialogs, web artwork
```
