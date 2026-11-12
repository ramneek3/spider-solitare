import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import type { Card, GameState, Hint, Move } from '../engine/types';
import { COLUMNS, TOTAL_RUNS } from '../engine/deck';
import { canDeal, canDrop, isMovable } from '../engine/rules';
import { bestMoveFor } from '../engine/ranking';
import { useFlip } from '../hooks/useFlip';
import { CardView, RANK_LABEL } from './CardView';
import { SuitIcon } from './art';

interface Props {
  game: GameState;
  gameId: number;
  hint: Hint | null;
  message: string;
  onMove: (move: Move) => void;
  onDeal: () => void;
  notify: (text: string) => void;
}

interface DragView {
  col: number;
  index: number;
  items: { card: Card; left: number; top: number }[];
}

interface DragSession {
  col: number;
  index: number;
  startX: number;
  startY: number;
  offX: number;
  started: boolean;
  el: HTMLElement;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const CARD_RATIO = 1.4;
const TABLEAU_PAD = 14;

/** Vertical position of each card in a column; squeezes face-down cards first, then face-up, to fit. */
function columnOffsets(column: Card[], ch: number, available: number): number[] {
  const fdBase = ch * 0.12;
  const fuBase = ch * 0.3;
  const fdMin = ch * 0.05;
  const fuMin = ch * 0.21;
  const n = column.length - 1;
  let down = 0;
  let up = 0;
  for (let i = 0; i < n; i++) (column[i].faceUp ? up++ : down++);
  const full = down * fdBase + up * fuBase;
  const min = down * fdMin + up * fuMin;
  const limit = Math.max(0, available - ch);
  const t = full <= limit ? 1 : full === min ? 0 : clamp((limit - min) / (full - min), 0, 1);
  const fd = fdMin + (fdBase - fdMin) * t;
  const fu = fuMin + (fuBase - fuMin) * t;
  const ys: number[] = [];
  let y = 0;
  for (const card of column) {
    ys.push(y);
    y += card.faceUp ? fu : fd;
  }
  return ys;
}

function shake(el: HTMLElement | null) {
  if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(0)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
}

export const Board = memo(function Board({ game, gameId, hint, message, onMove, onDeal, notify }: Props) {
  const boardRef = useRef<HTMLDivElement>(null);
  const stockRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layerRef = useRef<HTMLDivElement>(null);
  const overrides = useRef(new Map<number, DOMRect>());
  const [size, setSize] = useState({ w: 1280, h: 720 });
  const [dragView, setDragView] = useState<DragView | null>(null);

  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 1 && Math.abs(s.h - height) < 1 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sizing: width wants ten columns; height wants room for a long column plus the footer.
  const layout = useMemo(() => {
    const gap = clamp(size.w * 0.0105, 8, 16);
    const padX = clamp(size.w * 0.022, 14, 40);
    const byWidth = (size.w - padX * 2 - gap * (COLUMNS - 1)) / COLUMNS;
    const byHeight = (size.h - 40) / (CARD_RATIO * 4.5 + 0.3);
    const cw = Math.floor(clamp(Math.min(byWidth, byHeight), 52, 128));
    const ch = Math.round(cw * CARD_RATIO);
    const footer = ch + 26;
    const tableauH = Math.max(ch * 2, size.h - footer - TABLEAU_PAD);
    return { gap, padX, cw, ch, footer, tableauH };
  }, [size]);

  useFlip({
    root: boardRef,
    origin: stockRef,
    gameId,
    stockRows: game.stock.length,
    layoutKey: `${layout.cw}x${layout.ch}x${Math.round(layout.tableauH)}`,
    state: game,
    overrides,
  });

  // ---- hints ---------------------------------------------------------------
  const hintMove = hint?.type === 'move' ? hint.move : null;

  // ---- drag & click --------------------------------------------------------
  const pickTarget = useCallback(
    (centerX: number, col: number, index: number): number => {
      let best = -1;
      let bestDist = (layout.cw + layout.gap) * 0.62;
      for (let to = 0; to < COLUMNS; to++) {
        const el = columnRefs.current[to];
        if (!el || !canDrop(game.tableau, col, index, to)) continue;
        const r = el.getBoundingClientRect();
        const dist = Math.abs(r.left + r.width / 2 - centerX);
        if (dist < bestDist) {
          best = to;
          bestDist = dist;
        }
      }
      return best;
    },
    [game.tableau, layout.cw, layout.gap],
  );

  const setHover = (target: number) => {
    columnRefs.current.forEach((el, i) => el?.classList.toggle('drop-hover', i === target));
  };

  const onCardPointerDown = (e: ReactPointerEvent<HTMLDivElement>, col: number, index: number) => {
    if (e.button !== 0) return;
    const column = game.tableau[col];
    const card = column[index];
    if (!card.faceUp) return;
    const el = e.currentTarget;
    if (!isMovable(column, index)) {
      shake(el);
      notify('Only a same-suit run in descending order moves together.');
      return;
    }
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const session: DragSession = {
      col,
      index,
      startX: e.clientX,
      startY: e.clientY,
      offX: e.clientX - rect.left,
      started: false,
      el,
    };

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - session.startX;
      const dy = ev.clientY - session.startY;
      if (!session.started) {
        if (Math.hypot(dx, dy) < 5) return;
        session.started = true;
        const els = columnRefs.current[col]?.querySelectorAll<HTMLElement>('[data-card-id]');
        if (!els) return;
        const items = [];
        for (let k = index; k < column.length; k++) {
          const r = els[k].getBoundingClientRect();
          items.push({ card: column[k], left: r.left, top: r.top });
        }
        setDragView({ col, index, items });
      }
      if (layerRef.current) {
        layerRef.current.style.transition = 'none';
        layerRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      }
      setHover(pickTarget(ev.clientX - session.offX + layout.cw / 2, col, index));
    };

    const finish = (ev: PointerEvent, cancelled: boolean) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      setHover(-1);
      if (!session.started) {
        if (cancelled) return;
        const best = bestMoveFor(game, col, index);
        if (best) onMove(best);
        else {
          shake(session.el);
          notify('No legal move for that card.');
        }
        return;
      }
      const target = cancelled ? -1 : pickTarget(ev.clientX - session.offX + layout.cw / 2, col, index);
      const layer = layerRef.current;
      if (target >= 0) {
        layer?.querySelectorAll<HTMLElement>('[data-drag-id]').forEach((n) => {
          overrides.current.set(Number(n.dataset.dragId), n.getBoundingClientRect());
        });
        setDragView(null);
        onMove({ from: col, index, to: target });
      } else {
        if (layer) {
          layer.style.transition = 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)';
          layer.style.transform = 'translate3d(0, 0, 0)';
        }
        window.setTimeout(() => setDragView(null), 200);
      }
    };
    const up = (ev: PointerEvent) => finish(ev, false);
    const cancel = (ev: PointerEvent) => finish(ev, true);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };

  const onStockClick = () => {
    if (game.stock.length === 0) notify('No deals left.');
    else if (!canDeal(game)) notify('Fill every empty column before dealing.');
    else onDeal();
  };

  // Clear any stray hover class if the board re-renders mid-drag.
  useEffect(() => {
    if (!dragView) setHover(-1);
  }, [dragView]);

  const style = {
    '--cw': `${layout.cw}px`,
    '--ch': `${layout.ch}px`,
    '--gap': `${layout.gap}px`,
    '--padx': `${layout.padX}px`,
    '--footer': `${layout.footer}px`,
  } as CSSProperties;

  const validTargets = useMemo(() => {
    if (!dragView) return new Set<number>();
    const set = new Set<number>();
    for (let to = 0; to < COLUMNS; to++) if (canDrop(game.tableau, dragView.col, dragView.index, to)) set.add(to);
    return set;
  }, [dragView, game.tableau]);

  return (
    <div className={`board${dragView ? ' dragging' : ''}`} ref={boardRef} style={style}>
      <div className="tableau" style={{ height: layout.tableauH }}>
        {game.tableau.map((column, ci) => {
          const ys = columnOffsets(column, layout.ch, layout.tableauH - TABLEAU_PAD - 6);
          const empty = column.length === 0;
          const isHintTo = hintMove?.to === ci;
          return (
            <div
              key={ci}
              ref={(el) => {
                columnRefs.current[ci] = el;
              }}
              className={`column${validTargets.has(ci) ? ' can-drop' : ''}${empty && isHintTo ? ' hint-to' : ''}`}
            >
              <div className="slot" />
              {column.map((card, i) => {
                const dragging = dragView?.col === ci && i >= dragView.index;
                const fromHint = hintMove?.from === ci && i >= hintMove.index;
                const toHint = isHintTo && i === column.length - 1;
                const movable = card.faceUp && isMovable(column, i);
                const cls = [
                  dragging ? 'ghost' : '',
                  movable ? 'grab' : '',
                  fromHint ? 'hint-from' : '',
                  toHint ? 'hint-to' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                return (
                  <CardView
                    key={card.id}
                    card={card}
                    full={i === column.length - 1}
                    className={cls}
                    style={
                      {
                        top: ys[i],
                        '--col': ci,
                        '--row': i,
                      } as CSSProperties
                    }
                    onPointerDown={(e) => onCardPointerDown(e, ci, i)}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="footer">
        <div className="foundation" aria-label={`${game.foundation.length} of ${TOTAL_RUNS} runs complete`}>
          {Array.from({ length: TOTAL_RUNS }, (_, i) => {
            const suit = game.foundation[i];
            return suit ? (
              <div key={`${i}-${suit}`} className={`found done ${suit === 'H' || suit === 'D' ? 'red' : 'ink'}`}>
                <SuitIcon suit={suit} className="found-suit" />
                <span className="found-k">{RANK_LABEL[13]}</span>
              </div>
            ) : (
              <div key={i} className="found" />
            );
          })}
        </div>

        <p className="status" role="status" aria-live="polite">
          {message}
        </p>

        <div
          className={`stock${hint?.type === 'deal' ? ' hint-to' : ''}${game.stock.length === 0 ? ' empty' : ''}`}
          ref={stockRef}
        >
          <button
            type="button"
            className="stock-btn"
            onClick={onStockClick}
            aria-label={
              game.stock.length === 0 ? 'No deals left' : `Deal a new row, ${game.stock.length} deals left`
            }
          >
            {game.stock.length === 0 ? (
              <span className="stock-empty" />
            ) : (
              game.stock.map((_, i) => (
                <span
                  key={i}
                  className="card back pile"
                  style={{ left: `calc(var(--cw) * 0.13 * ${i})` }}
                />
              ))
            )}
          </button>
          <span className="stock-count">
            {game.stock.length === 0 ? 'No deals left' : `${game.stock.length} ${game.stock.length === 1 ? 'deal' : 'deals'} left`}
          </span>
        </div>
      </div>

      {dragView && (
        <div className="drag-layer" ref={layerRef}>
          {dragView.items.map((it) => (
            <div key={it.card.id} className="drag-item" data-drag-id={it.card.id} style={{ left: it.left, top: it.top }}>
              <CardView card={it.card} tracked={false} full={it === dragView.items[dragView.items.length - 1]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
