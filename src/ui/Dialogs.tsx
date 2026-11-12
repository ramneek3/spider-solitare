import { type ReactNode, useEffect, useRef } from 'react';
import type { Difficulty } from '../engine/types';
import { type Stats, formatTime } from '../hooks/stats';
import { SuitIcon, WebBackdrop } from './art';

export const LEVELS: { id: Difficulty; label: string; suits: ('S' | 'H' | 'D' | 'C')[]; blurb: string }[] = [
  { id: 'easy', label: 'Easy', suits: ['S'], blurb: 'One suit' },
  { id: 'medium', label: 'Medium', suits: ['S', 'H'], blurb: 'Two suits' },
  { id: 'hard', label: 'Hard', suits: ['S', 'H', 'D', 'C'], blurb: 'Four suits' },
];

function Modal({
  title,
  onClose,
  children,
  wide,
  decorated,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  decorated?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        {decorated && <WebBackdrop />}
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="modal-body">{body}</p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Keep playing
        </button>
        <button type="button" className="btn primary" onClick={onConfirm} data-autofocus>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function WinDialog({
  difficulty,
  score,
  moves,
  time,
  isBest,
  onNew,
  onReplay,
  onClose,
}: {
  difficulty: Difficulty;
  score: number;
  moves: number;
  time: number;
  isBest: boolean;
  onNew: () => void;
  onReplay: () => void;
  onClose: () => void;
}) {
  const level = LEVELS.find((l) => l.id === difficulty)!;
  return (
    <Modal title="All eight runs complete" onClose={onClose} decorated>
      <p className="win-score">
        {score}
        <span> points</span>
      </p>
      <p className="modal-body">
        {isBest ? 'A new best on ' : 'Finished on '}
        {level.label} in {formatTime(time)} with {moves} moves.
      </p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onReplay}>
          Replay this deal
        </button>
        <button type="button" className="btn primary" onClick={onNew} data-autofocus>
          New {level.label} game
        </button>
      </div>
    </Modal>
  );
}

export function StatsDialog({ stats, onClose }: { stats: Stats; onClose: () => void }) {
  const rate = (w: number, p: number) => (p === 0 ? '–' : `${Math.round((w / p) * 100)}%`);
  const rows: { label: string; value: (id: Difficulty) => string }[] = [
    { label: 'Games played', value: (id) => String(stats[id].played) },
    { label: 'Games won', value: (id) => String(stats[id].won) },
    { label: 'Win rate', value: (id) => rate(stats[id].won, stats[id].played) },
    { label: 'Best score', value: (id) => (stats[id].bestScore === null ? '–' : String(stats[id].bestScore)) },
    { label: 'Fastest win', value: (id) => (stats[id].bestTime === null ? '–' : formatTime(stats[id].bestTime!)) },
    { label: 'Current streak', value: (id) => String(stats[id].streak) },
    { label: 'Best streak', value: (id) => String(stats[id].bestStreak) },
  ];
  return (
    <Modal title="Your record" onClose={onClose} wide>
      <table className="stats">
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Statistic</span>
            </th>
            {LEVELS.map((l) => (
              <th scope="col" key={l.id}>
                {l.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              {LEVELS.map((l) => (
                <td key={l.id}>{r.value(l.id)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="modal-actions">
        <button type="button" className="btn primary" onClick={onClose} data-autofocus>
          Close
        </button>
      </div>
    </Modal>
  );
}

export function LevelPips({ suits }: { suits: ('S' | 'H' | 'D' | 'C')[] }) {
  return (
    <span className="pips" aria-hidden="true">
      {suits.map((s) => (
        <SuitIcon key={s} suit={s} className={`mini ${s === 'H' || s === 'D' ? 'red' : 'ink'}`} />
      ))}
    </span>
  );
}
