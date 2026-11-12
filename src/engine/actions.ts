import type { Card, GameState, Move, Suit } from './types';
import { canDeal, canDrop } from './rules';

export const MOVE_COST = 1;
export const RUN_BONUS = 100;

/** If the last 13 cards of a column are a face-up K→A run of one suit, return where it starts. */
export function completedRunStart(column: Card[]): number {
  if (column.length < 13) return -1;
  const start = column.length - 13;
  const suit = column[start].suit;
  for (let j = 0; j < 13; j++) {
    const c = column[start + j];
    if (!c.faceUp || c.suit !== suit || c.rank !== 13 - j) return -1;
  }
  return start;
}

/**
 * Clear finished runs and flip newly exposed cards. Works on cloned columns,
 * so callers must pass copies, never the previous state's arrays.
 */
function settle(tableau: Card[][], foundation: Suit[], score: number) {
  for (const column of tableau) {
    let changed = true;
    while (changed) {
      changed = false;
      const start = completedRunStart(column);
      if (start >= 0) {
        foundation.push(column[start].suit);
        column.splice(start, 13);
        score += RUN_BONUS;
        changed = true;
      }
      const last = column[column.length - 1];
      if (last && !last.faceUp) {
        column[column.length - 1] = { ...last, faceUp: true };
        changed = true;
      }
    }
  }
  return score;
}

/** Classic scoring: every move (including a deal) costs a point, every finished run earns 100. */
export function applyMove(state: GameState, move: Move): GameState | null {
  if (!canDrop(state.tableau, move.from, move.index, move.to)) return null;
  const tableau = state.tableau.map((c) => c.slice());
  const foundation = state.foundation.slice();
  const moving = tableau[move.from].splice(move.index);
  tableau[move.to].push(...moving);
  const score = settle(tableau, foundation, Math.max(0, state.score - MOVE_COST));
  return { ...state, tableau, foundation, score, moves: state.moves + 1 };
}

export function dealRow(state: GameState): GameState | null {
  if (!canDeal(state)) return null;
  const [row, ...stock] = state.stock;
  const tableau = state.tableau.map((c, i) => [...c, { ...row[i], faceUp: true }]);
  const foundation = state.foundation.slice();
  const score = settle(tableau, foundation, Math.max(0, state.score - MOVE_COST));
  return { ...state, tableau, stock, foundation, score, moves: state.moves + 1 };
}

/** Undo restores the board but still costs a move, like the classic game. */
export function undoTo(current: GameState, previous: GameState): GameState {
  return {
    ...previous,
    moves: current.moves + 1,
    score: Math.max(0, current.score - MOVE_COST),
  };
}
