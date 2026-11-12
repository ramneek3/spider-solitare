import { describe, expect, it } from 'vitest';
import type { Card, Difficulty, GameState, Suit } from './types';
import { buildDeck, newGame, suitsFor } from './deck';
import { canDeal, canDrop, isMovable, isWon } from './rules';
import { applyMove, dealRow, undoTo } from './actions';
import { bestMoveFor, findHint } from './ranking';

let nextId = 1000;
const c = (suit: Suit, rank: number, faceUp = true): Card => ({ id: nextId++, suit, rank, faceUp });
const run = (suit: Suit, from: number, to: number) => {
  const out: Card[] = [];
  for (let r = from; r >= to; r--) out.push(c(suit, r));
  return out;
};

function blank(tableau: Card[][], stock: Card[][] = [], difficulty: Difficulty = 'hard'): GameState {
  const padded = [...tableau];
  while (padded.length < 10) padded.push([]);
  return { tableau: padded, stock, foundation: [], difficulty, seed: 1, moves: 0, score: 500 };
}

describe('deck and deal', () => {
  it.each([
    ['easy', 1],
    ['medium', 2],
    ['hard', 4],
  ] as const)('%s uses %i suit(s) with 8 copies of A-K in total', (difficulty, suitCount) => {
    const deck = buildDeck(difficulty);
    expect(deck).toHaveLength(104);
    expect(new Set(deck.map((d) => d.suit)).size).toBe(suitCount);
    expect(suitsFor(difficulty)).toHaveLength(suitCount);
    for (const suit of suitsFor(difficulty)) {
      for (let rank = 1; rank <= 13; rank++) {
        expect(deck.filter((d) => d.suit === suit && d.rank === rank)).toHaveLength(8 / suitCount);
      }
    }
    expect(new Set(deck.map((d) => d.id)).size).toBe(104);
  });

  it('deals 54 cards (6,6,6,6,5×6) with only the top card face up, and 5 stock rows of 10', () => {
    const g = newGame('hard', 42);
    expect(g.tableau.map((col) => col.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5]);
    for (const col of g.tableau) {
      expect(col.filter((x) => x.faceUp)).toHaveLength(1);
      expect(col[col.length - 1].faceUp).toBe(true);
    }
    expect(g.stock).toHaveLength(5);
    expect(g.stock.every((row) => row.length === 10 && row.every((x) => !x.faceUp))).toBe(true);
    expect(g.score).toBe(500);
    expect(g.moves).toBe(0);
  });

  it('is repeatable from a seed and differs between seeds', () => {
    const a = newGame('medium', 7).tableau.flat().map((x) => x.id);
    const b = newGame('medium', 7).tableau.flat().map((x) => x.id);
    const d = newGame('medium', 8).tableau.flat().map((x) => x.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(d);
  });
});

describe('rules', () => {
  it('only lets a same-suit descending run be picked up', () => {
    const col = [c('S', 9, false), c('H', 7), c('H', 6), c('H', 5)];
    expect(isMovable(col, 0)).toBe(false); // face down
    expect(isMovable(col, 1)).toBe(true);
    expect(isMovable(col, 3)).toBe(true);
    const mixed = [c('H', 7), c('S', 6), c('S', 5)];
    expect(isMovable(mixed, 0)).toBe(false);
    expect(isMovable(mixed, 1)).toBe(true);
    const gap = [c('S', 7), c('S', 5)];
    expect(isMovable(gap, 0)).toBe(false);
  });

  it('allows dropping on a card one rank higher in any suit, or on an empty column', () => {
    const state = blank([[c('S', 5)], [c('H', 6)], [c('H', 9)], []]);
    expect(canDrop(state.tableau, 0, 0, 1)).toBe(true);
    expect(canDrop(state.tableau, 0, 0, 2)).toBe(false);
    expect(canDrop(state.tableau, 0, 0, 3)).toBe(true);
    expect(canDrop(state.tableau, 0, 0, 0)).toBe(false);
  });

  it('blocks dealing while any column is empty and allows it otherwise', () => {
    const row = Array.from({ length: 10 }, () => c('S', 1, false));
    const full = blank(Array.from({ length: 10 }, () => [c('S', 2)]), [row]);
    expect(canDeal(full)).toBe(true);
    const withEmpty = blank(Array.from({ length: 9 }, () => [c('S', 2)]), [row]);
    expect(canDeal(withEmpty)).toBe(false);
    expect(dealRow(withEmpty)).toBeNull();
    expect(canDeal(blank(Array.from({ length: 10 }, () => [c('S', 2)]), []))).toBe(false);
  });
});

describe('moves, scoring and runs', () => {
  it('costs 1 point per move, flips the exposed card and does not mutate the old state', () => {
    const state = blank([[c('H', 4, false), c('S', 5)], [c('H', 6)]]);
    const snapshot = JSON.stringify(state);
    const next = applyMove(state, { from: 0, index: 1, to: 1 })!;
    expect(next.score).toBe(499);
    expect(next.moves).toBe(1);
    expect(next.tableau[0][0].faceUp).toBe(true);
    expect(next.tableau[1].map((x) => x.rank)).toEqual([6, 5]);
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('moves a whole sequence together', () => {
    const state = blank([[...run('S', 5, 3)], [c('H', 6)]]);
    const next = applyMove(state, { from: 0, index: 0, to: 1 })!;
    expect(next.tableau[1].map((x) => x.rank)).toEqual([6, 5, 4, 3]);
    expect(next.tableau[0]).toHaveLength(0);
  });

  it('rejects illegal moves', () => {
    const state = blank([[c('S', 5)], [c('H', 9)]]);
    expect(applyMove(state, { from: 0, index: 0, to: 1 })).toBeNull();
  });

  it('removes a completed K→A run, adds 100 and records the suit', () => {
    const state = blank([[c('H', 13, false), ...run('S', 13, 2)], [c('S', 1)]]);
    const next = applyMove(state, { from: 1, index: 0, to: 0 })!;
    expect(next.foundation).toEqual(['S']);
    expect(next.score).toBe(500 - 1 + 100);
    expect(next.tableau[0]).toHaveLength(1);
    expect(next.tableau[0][0].faceUp).toBe(true); // card under the run is flipped
  });

  it('does not complete a run made of mixed suits', () => {
    const mixed = [...run('S', 13, 2)];
    mixed[5] = c('H', 8);
    const state = blank([mixed, [c('S', 1)]]);
    const next = applyMove(state, { from: 1, index: 0, to: 0 })!;
    expect(next.foundation).toEqual([]);
    expect(next.tableau[0]).toHaveLength(13);
  });

  it('a deal adds one face-up card per column, costs a move, and can finish a run', () => {
    const row = Array.from({ length: 10 }, (_, i) => c(i === 0 ? 'S' : 'H', 1, false));
    const cols: Card[][] = Array.from({ length: 10 }, () => [c('D', 9)]);
    cols[0] = run('S', 13, 2);
    const state = blank(cols, [row]);
    const next = dealRow(state)!;
    expect(next.stock).toHaveLength(0);
    expect(next.foundation).toEqual(['S']);
    expect(next.tableau[0]).toHaveLength(0);
    expect(next.tableau[1].map((x) => x.faceUp)).toEqual([true, true]);
    expect(next.moves).toBe(1);
    expect(next.score).toBe(500 - 1 + 100);
  });

  it('undo restores the board but still costs a move and a point', () => {
    const state = blank([[c('S', 5)], [c('H', 6)]]);
    const moved = applyMove(state, { from: 0, index: 0, to: 1 })!;
    const undone = undoTo(moved, state);
    expect(undone.tableau).toEqual(state.tableau);
    expect(undone.moves).toBe(2);
    expect(undone.score).toBe(498);
  });

  it('never lets the score go below zero', () => {
    const state = { ...blank([[c('S', 5)], [c('H', 6)]]), score: 0 };
    expect(applyMove(state, { from: 0, index: 0, to: 1 })!.score).toBe(0);
  });

  it('detects a win at eight runs', () => {
    const g = blank([]);
    expect(isWon(g)).toBe(false);
    expect(isWon({ ...g, foundation: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'] })).toBe(true);
  });
});

describe('click-to-move and hints', () => {
  it('prefers a same-suit target over an off-suit one', () => {
    const state = blank([[c('S', 5)], [c('H', 6)], [c('S', 6)]]);
    expect(bestMoveFor(state, 0, 0)).toEqual({ from: 0, index: 0, to: 2 });
  });

  it('prefers a move that uncovers a face-down card', () => {
    const state = blank([[c('D', 2, false), c('S', 5)], [c('H', 6)], [c('S', 6)]]);
    // both targets are legal; the same-suit one wins and still uncovers
    expect(bestMoveFor(state, 0, 1)).toEqual({ from: 0, index: 1, to: 2 });
    const offSuitOnly = blank([[c('D', 2, false), c('S', 5)], [c('H', 6)]]);
    expect(bestMoveFor(offSuitOnly, 0, 1)).toEqual({ from: 0, index: 1, to: 1 });
  });

  it('does not shuffle a whole column onto an empty one', () => {
    const state = blank([[c('S', 5)], []]);
    expect(bestMoveFor(state, 0, 0)).toBeNull();
  });

  it('returns null when a card has nowhere to go', () => {
    const state = blank([[c('S', 5)], [c('H', 9)]]);
    expect(bestMoveFor(state, 0, 0)).toBeNull();
  });

  it('avoids splitting a built run when another option exists', () => {
    const state = blank([[c('D', 2, false), c('S', 6), c('S', 5)], [c('H', 6)], [c('C', 7)]]);
    const best = bestMoveFor(state, 0, 2)!; // click the 5: only column 1 accepts it
    expect(best.to).toBe(1);
    const hint = findHint(state);
    expect(hint.type).toBe('move');
  });

  it('hint falls back to a deal, then to blocked / none', () => {
    const row = Array.from({ length: 10 }, () => c('S', 1, false));
    const stuck = blank(Array.from({ length: 10 }, () => [c('S', 10)]), [row]);
    expect(findHint(stuck)).toEqual({ type: 'deal' });
    const blockedState = blank(Array.from({ length: 9 }, () => [c('S', 10)]), [row]);
    expect(findHint(blockedState)).toEqual({ type: 'blocked' });
    expect(findHint(blank(Array.from({ length: 10 }, () => [c('S', 10)]), []))).toEqual({ type: 'none' });
  });
});
