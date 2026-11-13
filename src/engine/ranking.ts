import type { GameState, Hint, Move } from './types';
import { COLUMNS } from './deck';
import { canDeal, canDrop, isMovable } from './rules';

/** Score at or below this marks a legal but pointless move (e.g. a whole column onto an empty one). */
export const POINTLESS = -1000;

/**
 * How good a legal move is. Used for click-to-move and hints.
 *  +100 builds onto a card of the same suit (plus a bonus for longer runs)
 *  +50  uncovers a face-down card
 *  +30  empties the source column
 *  -80  tears apart a same-suit run that was already built
 */
export function rankMove(state: GameState, move: Move): number {
  if (!canDrop(state.tableau, move.from, move.index, move.to)) return POINTLESS - 1;
  const source = state.tableau[move.from];
  const target = state.tableau[move.to];
  const card = source[move.index];
  const top = target[target.length - 1];
  let score = 0;

  if (!top) {
    if (move.index === 0) return POINTLESS;
  } else if (top.suit === card.suit) {
    let run = 1;
    for (let i = target.length - 1; i > 0; i--) {
      const lower = target[i - 1];
      if (lower.faceUp && lower.suit === target[i].suit && lower.rank === target[i].rank + 1) run++;
      else break;
    }
    score += 100 + run * 2 + (source.length - move.index);
  }

  if (move.index === 0) {
    score += 30;
  } else {
    const below = source[move.index - 1];
    if (!below.faceUp) score += 50;
    else if (below.suit === card.suit && below.rank === card.rank + 1) score -= 80;
  }
  return score;
}

/** The target column a click on this card should send it to, or null if nothing is legal. */
export function bestMoveFor(state: GameState, from: number, index: number): Move | null {
  let best: Move | null = null;
  let bestScore = POINTLESS;
  for (let to = 0; to < COLUMNS; to++) {
    if (to === from) continue;
    const move = { from, index, to };
    const score = rankMove(state, move);
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }
  return best;
}

export function findHint(state: GameState): Hint {
  let best: Move | null = null;
  let bestScore = 0;
  for (let from = 0; from < COLUMNS; from++) {
    const column = state.tableau[from];
    for (let index = 0; index < column.length; index++) {
      if (!isMovable(column, index)) continue;
      for (let to = 0; to < COLUMNS; to++) {
        if (to === from) continue;
        const move = { from, index, to };
        const score = rankMove(state, move);
        if (score > bestScore) {
          best = move;
          bestScore = score;
        }
      }
    }
  }
  if (best) return { type: 'move', move: best };
  if (canDeal(state)) return { type: 'deal' };
  return { type: 'none' };
}
