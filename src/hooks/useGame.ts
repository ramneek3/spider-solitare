import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Difficulty, GameState, Move } from '../engine/types';
import { newGame, randomSeed } from '../engine/deck';
import { applyMove, dealRow, undoTo } from '../engine/actions';
import { isWon } from '../engine/rules';
import { type Stats, loadStats, recordAbandon, recordStart, recordWin } from './stats';

interface Session {
  /** Increments whenever a new deal starts, so the UI can animate it in. */
  gameId: number;
  game: GameState;
  history: GameState[];
  elapsed: number;
}

type Action =
  | { type: 'new'; difficulty: Difficulty; seed?: number }
  | { type: 'move'; move: Move }
  | { type: 'deal' }
  | { type: 'undo' }
  | { type: 'tick' };

const SAVE_KEY = 'spider.save.v1';
const MAX_HISTORY = 500;

function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case 'new':
      return {
        gameId: s.gameId + 1,
        game: newGame(a.difficulty, a.seed ?? randomSeed()),
        history: [],
        elapsed: 0,
      };
    case 'move': {
      const next = applyMove(s.game, a.move);
      if (!next) return s;
      return { ...s, game: next, history: [...s.history.slice(-MAX_HISTORY), s.game] };
    }
    case 'deal': {
      const next = dealRow(s.game);
      if (!next) return s;
      return { ...s, game: next, history: [...s.history.slice(-MAX_HISTORY), s.game] };
    }
    case 'undo': {
      if (s.history.length === 0) return s;
      const previous = s.history[s.history.length - 1];
      return { ...s, game: undoTo(s.game, previous), history: s.history.slice(0, -1) };
    }
    case 'tick':
      return { ...s, elapsed: s.elapsed + 1 };
  }
}

function init(): Session {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Session;
      if (saved?.game?.tableau?.length === 10 && !isWon(saved.game)) return saved;
    }
  } catch {
    /* fall through to a fresh game */
  }
  return { gameId: 1, game: newGame('easy'), history: [], elapsed: 0 };
}

export function useGame() {
  const [session, dispatch] = useReducer(reducer, undefined, init);
  const [stats, setStats] = useState<Stats>(loadStats);
  const { game, elapsed } = session;
  const won = isWon(game);
  const started = game.moves > 0;

  // Keep a ref so event handlers always see the latest values without re-binding.
  const live = useRef({ game, started, won });
  live.current = { game, started, won };

  // Persist the game in progress.
  useEffect(() => {
    try {
      if (won) localStorage.removeItem(SAVE_KEY);
      else localStorage.setItem(SAVE_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }, [session, won]);

  // Timer runs from the first move until the game is won.
  useEffect(() => {
    if (!started || won) return;
    const id = window.setInterval(() => {
      if (!document.hidden) dispatch({ type: 'tick' });
    }, 1000);
    return () => window.clearInterval(id);
  }, [started, won, session.gameId]);

  // Stats: count a game on its first move; record the win once.
  const startedFor = useRef<number | null>(started ? session.gameId : null);
  useEffect(() => {
    if (started && startedFor.current !== session.gameId) {
      startedFor.current = session.gameId;
      setStats((s) => recordStart(s, game.difficulty));
    }
  }, [started, session.gameId, game.difficulty]);

  const winRecorded = useRef<number | null>(null);
  useEffect(() => {
    if (won && winRecorded.current !== session.gameId) {
      winRecorded.current = session.gameId;
      setStats((s) => recordWin(s, game.difficulty, game.score, elapsed));
    }
  }, [won, session.gameId, game.difficulty, game.score, elapsed]);

  const abandonIfNeeded = useCallback(() => {
    const { game: g, started: st, won: w } = live.current;
    if (st && !w) setStats((s) => recordAbandon(s, g.difficulty));
  }, []);

  const startNew = useCallback(
    (difficulty: Difficulty) => {
      abandonIfNeeded();
      dispatch({ type: 'new', difficulty });
    },
    [abandonIfNeeded],
  );

  const restart = useCallback(() => {
    const { game: g } = live.current;
    abandonIfNeeded();
    dispatch({ type: 'new', difficulty: g.difficulty, seed: g.seed });
  }, [abandonIfNeeded]);

  const actions = useMemo(
    () => ({
      move: (move: Move) => dispatch({ type: 'move', move }),
      deal: () => dispatch({ type: 'deal' }),
      undo: () => dispatch({ type: 'undo' }),
      startNew,
      restart,
    }),
    [startNew, restart],
  );

  return {
    game,
    gameId: session.gameId,
    canUndo: session.history.length > 0,
    elapsed,
    won,
    started,
    stats,
    ...actions,
  };
}
