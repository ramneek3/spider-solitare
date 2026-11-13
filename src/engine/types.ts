export type Suit = 'S' | 'H' | 'D' | 'C';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Card {
  id: number;
  suit: Suit;
  /** 1 = Ace … 13 = King */
  rank: number;
  faceUp: boolean;
}

export interface GameState {
  /** 10 columns, bottom of the column is index 0, top (playable) card is last. */
  tableau: Card[][];
  /** Remaining deals; each entry is one row of 10 face-down cards. */
  stock: Card[][];
  /** Suit of each completed K→A run (max 8). */
  foundation: Suit[];
  difficulty: Difficulty;
  seed: number;
  moves: number;
  score: number;
}

export interface Move {
  from: number;
  /** Index in the source column of the first card being moved. */
  index: number;
  to: number;
}

export type Hint =
  | { type: 'move'; move: Move }
  | { type: 'deal' }
  | { type: 'none' };
