import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty, Hint, Move } from '../engine/types';
import { findHint } from '../engine/ranking';
import { useGame } from '../hooks/useGame';
import { sound } from '../audio';
import { formatTime } from '../hooks/stats';
import { Board } from './Board';
import { RANK_LABEL } from './CardView';
import { ConfirmDialog, LEVELS, LevelPips, StatsDialog, WinDialog } from './Dialogs';
import { SpiderMark, WebBackdrop } from './art';

type Pending = { kind: 'new'; difficulty: Difficulty } | { kind: 'restart' } | null;

const SUIT_WORD = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' } as const;

export function App() {
  const g = useGame();
  const { game } = g;
  const [hint, setHint] = useState<Hint | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<Pending>(null);
  const [showStats, setShowStats] = useState(false);
  const [winOpen, setWinOpen] = useState(true);
  const [winReady, setWinReady] = useState(false);
  const [soundOn, setSoundOn] = useState(sound.isEnabled());
  const messageTimer = useRef<number>(0);
  const hintTimer = useRef<number>(0);

  const notify = useCallback((text: string) => {
    window.clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = window.setTimeout(() => setMessage(''), 4200);
  }, []);

  const clearHint = useCallback(() => {
    window.clearTimeout(hintTimer.current);
    setHint(null);
  }, []);

  // Any change to the board retires the current hint and message.
  useEffect(() => {
    clearHint();
    window.clearTimeout(messageTimer.current);
    setMessage('');
  }, [game, clearHint]);

  // Let the last run finish flying to the foundation before the win dialog appears.
  useEffect(() => {
    if (!g.won) {
      setWinReady(false);
      return;
    }
    setWinOpen(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setWinReady(true), reduce ? 300 : 2000);
    return () => window.clearTimeout(id);
  }, [g.won, g.gameId]);

  const stuck = useMemo(() => !g.won && findHint(game).type === 'none', [g.won, game]);

  const showHint = useCallback(() => {
    if (g.won) return;
    const h = findHint(game);
    window.clearTimeout(hintTimer.current);
    setHint(h);
    hintTimer.current = window.setTimeout(() => setHint(null), 3200);
    if (h.type === 'move') {
      const { from, index, to } = h.move;
      const card = game.tableau[from][index];
      const target = game.tableau[to][game.tableau[to].length - 1];
      const name = `${RANK_LABEL[card.rank]} of ${SUIT_WORD[card.suit]}`;
      notify(
        target
          ? `Move the ${name} onto the ${RANK_LABEL[target.rank]} of ${SUIT_WORD[target.suit]}.`
          : `Move the ${name} to the empty column.`,
      );
    } else if (h.type === 'deal') notify('No useful moves. Deal a new row.');
    else notify('No moves left. Undo, replay this deal, or start a new game.');
  }, [g.won, game, notify]);

  const requestNew = useCallback(
    (difficulty: Difficulty) => {
      if (g.started && !g.won) setPending({ kind: 'new', difficulty });
      else g.startNew(difficulty);
    },
    [g],
  );

  const requestRestart = useCallback(() => {
    if (g.started && !g.won) setPending({ kind: 'restart' });
    else g.restart();
  }, [g]);

  const toggleSound = useCallback(() => {
    const next = !sound.isEnabled();
    sound.setEnabled(next);
    setSoundOn(next);
    if (next) {
      sound.unlock();
      sound.move();
    }
  }, []);

  // Browsers only start audio after a gesture, so wake it on the first press.
  useEffect(() => {
    const wake = () => sound.unlock();
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
    return () => {
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  const onMove = useCallback((move: Move) => g.move(move), [g.move]);
  const onDeal = useCallback(() => g.deal(), [g.deal]);

  // Keyboard shortcuts (ignored while a dialog is open or when typing).
  const dialogOpen = pending !== null || showStats || (g.won && winOpen && winReady);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || e.altKey) return;
      const key = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault();
        if (g.canUndo) g.undo();
      } else if (!e.metaKey && !e.ctrlKey) {
        if (key === 'h') showHint();
        else if (key === 'n') requestNew(game.difficulty);
        else if (key === 'm') toggleSound();
        else if (key === 'u') g.canUndo && g.undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen, g, game.difficulty, requestNew, showHint, toggleSound]);

  const levelStats = g.stats[game.difficulty];
  const isBest = g.won && levelStats.bestScore === game.score;
  const status = message || (stuck ? 'No moves left. Undo, replay this deal, or start a new game.' : '');

  return (
    <div className="app">
      <WebBackdrop />
      <header className="topbar">
        <div className="brand">
          <SpiderMark className="brand-mark" />
          <h1>Spider</h1>
        </div>

        <div className="levels" role="radiogroup" aria-label="Difficulty">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={game.difficulty === l.id}
              className={`level${game.difficulty === l.id ? ' on' : ''}`}
              onClick={() => game.difficulty !== l.id && requestNew(l.id)}
              title={l.blurb}
            >
              <span>{l.label}</span>
              <LevelPips suits={l.suits} />
            </button>
          ))}
        </div>

      </header>

      <main className="stage">
        <Board
          game={game}
          gameId={g.gameId}
          hint={hint}
          message={status}
          onMove={onMove}
          onDeal={onDeal}
          notify={notify}
        />
      </main>

      <footer className="dock">
        <dl className="readout">
          <div>
            <dt>Score</dt>
            <dd>{game.score}</dd>
          </div>
          <div>
            <dt>Moves</dt>
            <dd>{game.moves}</dd>
          </div>
          <div>
            <dt>Time</dt>
            <dd>{formatTime(g.elapsed)}</dd>
          </div>
        </dl>

        <nav className="actions" aria-label="Game actions">
          <button type="button" className="btn" onClick={g.undo} disabled={!g.canUndo} title="Undo (Ctrl/Cmd+Z)">
            Undo
          </button>
          <button type="button" className="btn" onClick={showHint} title="Hint (H)">
            Hint
          </button>
          <button type="button" className="btn" onClick={requestRestart} disabled={!g.started} title="Replay this deal from the start">
            Restart
          </button>
          <button type="button" className="btn primary" onClick={() => requestNew(game.difficulty)} title="New game (N)">
            New game
          </button>
          <button type="button" className="btn ghost" onClick={() => setShowStats(true)}>
            Record
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={toggleSound}
            aria-pressed={soundOn}
            title="Turn sound on or off (M)"
          >
            {soundOn ? 'Sound on' : 'Sound off'}
          </button>
        </nav>
      </footer>

      {pending && (
        <ConfirmDialog
          title={pending.kind === 'restart' ? 'Replay this deal?' : `Start a new ${LEVELS.find((l) => l.id === pending.difficulty)!.label} game?`}
          body={
            pending.kind === 'restart'
              ? 'The same cards are dealt again and your current progress is lost.'
              : 'Your current game is lost and counts as unfinished in your record.'
          }
          confirmLabel={pending.kind === 'restart' ? 'Replay deal' : 'Start new game'}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            if (pending.kind === 'restart') g.restart();
            else g.startNew(pending.difficulty);
            setPending(null);
          }}
        />
      )}

      {showStats && <StatsDialog stats={g.stats} onClose={() => setShowStats(false)} />}

      {g.won && winOpen && winReady && (
        <WinDialog
          difficulty={game.difficulty}
          score={game.score}
          moves={game.moves}
          time={g.elapsed}
          isBest={isBest}
          onClose={() => setWinOpen(false)}
          onNew={() => g.startNew(game.difficulty)}
          onReplay={() => g.restart()}
        />
      )}
    </div>
  );
}
