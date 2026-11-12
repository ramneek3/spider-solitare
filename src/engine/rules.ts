import type { Card, GameState } from './types';
import { TOTAL_RUNS } from './deck';

/** A card can be picked up if it is face up and everything beneath it is a same-suit descending run. */
export function isMovable(column: Card[], index: number): boolean {
  const card = column[index];
  if (!card || !card.faceUp) return false;
  for (let i = index; i < column.length - 1; i++) {
    const a = column[i];
    const b = column[i + 1];
    if (a.suit !== b.suit || a.rank !== b.rank + 1) return false;
  }
  return true;
}

/** Any suit may be placed on a card exactly one rank higher; any stack may go on an empty column. */
export function canDrop(tableau: Card[][], from: number, index: number, to: number): boolean {
  if (from === to) return false;
  const source = tableau[from];
  if (!source || !isMovable(source, index)) return false;
  const target = tableau[to];
  if (!target) return false;
  if (target.length === 0) return true;
  return target[target.length - 1].rank === source[index].rank + 1;
}

export function hasEmptyColumn(state: GameState): boolean {
  return state.tableau.some((col) => col.length === 0);
}

/** Dealing is only allowed while cards remain and every column holds at least one card. */
export function canDeal(state: GameState): boolean {
  return state.stock.length > 0 && !hasEmptyColumn(state);
}

export function isWon(state: GameState): boolean {
  return state.foundation.length === TOTAL_RUNS;
}
