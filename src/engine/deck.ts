import type { Card, Difficulty, GameState, Suit } from './types';

export const COLUMNS = 10;
export const TOTAL_RUNS = 8;
export const START_SCORE = 500;

export const SUIT_COUNT: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 4 };
const SUIT_ORDER: Suit[] = ['S', 'H', 'D', 'C'];

/** Suits in play for a difficulty: Easy = ♠, Medium = ♠♥, Hard = all four. */
export function suitsFor(difficulty: Difficulty): Suit[] {
  return SUIT_ORDER.slice(0, SUIT_COUNT[difficulty]);
}

/** Small, fast, seedable PRNG so a deal can be replayed from its seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}

/** 104 cards: eight sets of A–K spread evenly over the suits in play. */
export function buildDeck(difficulty: Difficulty): Card[] {
  const suits = suitsFor(difficulty);
  const copies = TOTAL_RUNS / suits.length;
  const deck: Card[] = [];
  let id = 0;
  for (const suit of suits) {
    for (let c = 0; c < copies; c++) {
      for (let rank = 1; rank <= 13; rank++) {
        deck.push({ id: id++, suit, rank, faceUp: false });
      }
    }
  }
  return deck;
}

export function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal a fresh game: 54 cards on the table (first four columns get 6), 50 in the stock. */
export function newGame(difficulty: Difficulty, seed: number = randomSeed()): GameState {
  const deck = shuffle(buildDeck(difficulty), mulberry32(seed));
  const tableau: Card[][] = [];
  let cursor = 0;
  for (let col = 0; col < COLUMNS; col++) {
    const size = col < 4 ? 6 : 5;
    const cards = deck.slice(cursor, cursor + size);
    cursor += size;
    cards[cards.length - 1] = { ...cards[cards.length - 1], faceUp: true };
    tableau.push(cards);
  }
  const stock: Card[][] = [];
  for (let row = 0; row < 5; row++) {
    stock.push(deck.slice(cursor, cursor + COLUMNS));
    cursor += COLUMNS;
  }
  return { tableau, stock, foundation: [], difficulty, seed, moves: 0, score: START_SCORE };
}
