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
- **Deal** from the stock (bottom right). You can deal at any time, even with empty columns.
- **Scoring** is classic Microsoft style: start at 500, each move (deals and undo included)
  costs 1 point, each completed K→A run earns 100.
- **Motion**: moved cards glide with a small lift; a finished K→A run flies, card by card, into the
  foundation and stamps its slot.
- **Sound**: synthesised in the browser (no audio files). A tap for a legal move, a lower double
  bump plus a wobble for an illegal one, ticks for a deal, and a chime for a finished run.
- **Dimmed cards**: face-up cards that can't move right now (not part of a same-suit run reaching the
  bottom of their column) are dulled, so the live cards stand out, especially after a deal.
- **Shortcuts**: `H` hint, `N` new game, `M` sound on/off, `U` or `Ctrl/Cmd+Z` undo.
- The game in progress and your record (per difficulty) are saved in the browser.

## Project layout

```
src/engine   pure game logic: deck, rules, moves, scoring, move ranking (no React)
src/hooks    useGame (state, undo, timer, persistence), stats, FLIP card animation
src/ui       App, Board (drag + click), cards, dialogs, web artwork
```
