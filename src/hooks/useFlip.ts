import { type MutableRefObject, type RefObject, useLayoutEffect, useRef } from 'react';

const EASE_OUT = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const EASE_MOVE = 'cubic-bezier(0.45, 0.05, 0.2, 1)';

/** Duration of a click-to-move glide, and the delay between cards of one moved stack. */
export const MOVE_MS = 560;
const MOVE_STAGGER = 30;

interface Options {
  root: RefObject<HTMLElement | null>;
  /** Where freshly dealt cards fly in from. */
  origin: RefObject<HTMLElement | null>;
  gameId: number;
  stockRows: number;
  /** Changes whenever positions change for layout reasons (resize); no animation then. */
  layoutKey: string;
  /** The game state; the effect only runs when it changes. */
  state: unknown;
  /** Rects to animate from instead of the previous layout (e.g. where a drag was released). */
  overrides: MutableRefObject<Map<number, DOMRect>>;
}

/**
 * FLIP animation for every card: remember where each card was, and after the
 * next render glide it from the old spot to the new one, lifting it slightly on
 * the way. Also choreographs the opening deal and each stock deal.
 *
 * Returns `vanished`: the last known rect of every card that left the table in
 * the latest update, which is how a finished run knows where to fly from.
 */
export function useFlip({ root, origin, gameId, stockRows, layoutKey, state, overrides }: Options) {
  const previous = useRef(new Map<number, DOMRect>());
  const vanished = useRef(new Map<number, DOMRect>());
  const lastGame = useRef(gameId);
  const lastStock = useRef(stockRows);
  const lastLayout = useRef(layoutKey);

  useLayoutEffect(() => {
    const container = root.current;
    if (!container) return;
    const resized = lastLayout.current !== layoutKey;
    lastLayout.current = layoutKey;
    const reduce = resized || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isNewGame = lastGame.current !== gameId;
    const dealtRow = !isNewGame && stockRows === lastStock.current - 1;
    const first = previous.current.size === 0;
    if (isNewGame) previous.current = new Map();
    lastGame.current = gameId;
    lastStock.current = stockRows;

    const originRect = origin.current?.getBoundingClientRect();
    const next = new Map<number, DOMRect>();
    const cards = container.querySelectorAll<HTMLElement>('[data-card-id]');
    let moved = 0;

    cards.forEach((el) => {
      const id = Number(el.dataset.cardId);
      const rect = el.getBoundingClientRect();
      next.set(id, rect);
      if (reduce) return;

      const dropped = overrides.current.has(id);
      const known = overrides.current.get(id) ?? previous.current.get(id);
      const col = Number(el.style.getPropertyValue('--col')) || 0;
      const row = Number(el.style.getPropertyValue('--row')) || 0;

      let from: DOMRect | undefined = known;
      let delay = 0;
      let duration = MOVE_MS;
      let arc = !dropped;

      if (!known) {
        if (first && !isNewGame) return; // restored game: appear in place
        if (isNewGame || dealtRow) {
          from = originRect;
          arc = false;
          delay = isNewGame ? (row * 10 + col) * 11 : col * 38;
          duration = isNewGame ? 380 : 360;
        } else {
          el.animate([{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'none' }], {
            duration: 300,
            easing: EASE_OUT,
          });
          return;
        }
      } else if (dropped) {
        duration = 260; // released a drag next to the target: just settle
      }
      if (!from) return;

      const dx = from.left - rect.left;
      const dy = from.top - rect.top;
      const distance = Math.hypot(dx, dy);
      if (distance < 2.5) return; // sub-pixel / font-settling noise is not a move

      let order = 0;
      if (known && !dropped) {
        order = moved++;
        delay = Math.min(order * MOVE_STAGGER, 300);
        // Short hops stay quick; long ones get the full glide.
        duration = Math.round(Math.min(MOVE_MS, 340 + distance * 0.5));
      }

      const frames: Keyframe[] = [{ transform: `translate(${dx}px, ${dy}px) scale(1)` }];
      if (arc) {
        const lift = Math.min(30, 10 + distance * 0.05);
        frames.push({ transform: `translate(${dx * 0.5}px, ${dy * 0.5 - lift}px) scale(1.06)`, offset: 0.5 });
      }
      frames.push({ transform: 'translate(0, 0) scale(1)' });

      el.style.zIndex = String(40 + order);
      const anim = el.animate(frames, {
        duration,
        delay,
        easing: arc ? EASE_MOVE : EASE_OUT,
        fill: 'backwards',
      });
      anim.onfinish = anim.oncancel = () => {
        el.style.zIndex = '';
      };
    });

    const gone = new Map<number, DOMRect>();
    previous.current.forEach((rect, id) => {
      if (!next.has(id)) gone.set(id, overrides.current.get(id) ?? rect);
    });
    vanished.current = gone;

    overrides.current.clear();
    previous.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, layoutKey]);

  return { vanished };
}
