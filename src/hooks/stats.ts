import type { Difficulty } from '../engine/types';

export interface LevelStats {
  played: number;
  won: number;
  bestScore: number | null;
  bestTime: number | null;
  streak: number;
  bestStreak: number;
}

export type Stats = Record<Difficulty, LevelStats>;

const KEY = 'spider.stats.v1';

const empty = (): LevelStats => ({
  played: 0,
  won: 0,
  bestScore: null,
  bestTime: null,
  streak: 0,
  bestStreak: 0,
});

export const emptyStats = (): Stats => ({ easy: empty(), medium: empty(), hard: empty() });

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStats();
    const parsed = JSON.parse(raw) as Partial<Stats>;
    const base = emptyStats();
    return {
      easy: { ...base.easy, ...parsed.easy },
      medium: { ...base.medium, ...parsed.medium },
      hard: { ...base.hard, ...parsed.hard },
    };
  } catch {
    return emptyStats();
  }
}

function save(stats: Stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    /* storage unavailable: stats just won't persist */
  }
}

/** A game counts as played from its first move. */
export function recordStart(stats: Stats, level: Difficulty): Stats {
  const next = { ...stats, [level]: { ...stats[level], played: stats[level].played + 1 } };
  save(next);
  return next;
}

/** Leaving a started game without finishing it breaks the streak. */
export function recordAbandon(stats: Stats, level: Difficulty): Stats {
  const next = { ...stats, [level]: { ...stats[level], streak: 0 } };
  save(next);
  return next;
}

export function recordWin(stats: Stats, level: Difficulty, score: number, seconds: number): Stats {
  const s = stats[level];
  const streak = s.streak + 1;
  const next = {
    ...stats,
    [level]: {
      ...s,
      won: s.won + 1,
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
      bestScore: s.bestScore === null ? score : Math.max(s.bestScore, score),
      bestTime: s.bestTime === null ? seconds : Math.min(s.bestTime, seconds),
    },
  };
  save(next);
  return next;
}

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}
