import { type MutableRefObject, type RefObject, useLayoutEffect, useRef } from 'react';

const EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

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
 * next render slide it from the old spot to the new one. Also choreographs the
 * opening deal and each stock deal.
 */
export function useFlip({ root, origin, gameId, stockRows, layoutKey, state, overrides }: Options) {
  const previous = useRef(new Map<number, DOMRect>());
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

    cards.forEach((el) => {
      const id = Number(el.dataset.cardId);
      const rect = el.getBoundingClientRect();
      next.set(id, rect);
      if (reduce) return;

      const known = overrides.current.get(id) ?? previous.current.get(id);
      const col = Number(el.style.getPropertyValue('--col')) || 0;
      const row = Number(el.style.getPropertyValue('--row')) || 0;

      let from: DOMRect | undefined = known;
      let delay = 0;
      let duration = 280;

      if (!known) {
        if (first && !isNewGame) return; // restored game: appear in place
        if (isNewGame || dealtRow) {
          from = originRect;
          delay = isNewGame ? (row * 10 + col) * 11 : col * 38;
          duration = isNewGame ? 360 : 340;
        } else {
          el.animate([{ opacity: 0, transform: 'scale(0.92)' }, { opacity: 1, transform: 'none' }], {
            duration: 260,
            easing: EASE,
          });
          return;
        }
      }
      if (!from) return;
      const dx = from.left - rect.left;
      const dy = from.top - rect.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      el.style.zIndex = '40';
      const anim = el.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration, delay, easing: EASE, fill: 'backwards' },
      );
      anim.onfinish = anim.oncancel = () => {
        el.style.zIndex = '';
      };
    });

    overrides.current.clear();
    previous.current = next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, layoutKey]);
}
