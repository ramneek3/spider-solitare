import { memo } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import type { Card } from '../engine/types';
import { SuitIcon } from './art';
import { CourtArt } from './CourtArt';

export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_NAME = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' } as const;

interface Props {
  card: Card;
  style?: CSSProperties;
  className?: string;
  /** Show the full face (centre pip) because nothing overlaps this card. */
  full?: boolean;
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  /** Tracked cards take part in the move animation. */
  tracked?: boolean;
}

export const CardView = memo(function CardView({ card, style, className = '', full, onPointerDown, tracked = true }: Props) {
  const colour = card.suit === 'H' || card.suit === 'D' ? 'red' : 'ink';
  const label = card.faceUp ? `${RANK_LABEL[card.rank]} of ${SUIT_NAME[card.suit]}` : 'Face-down card';
  return (
    <div
      className={`card ${card.faceUp ? `face ${colour}` : 'back'} ${className}`}
      style={style}
      data-card-id={tracked ? card.id : undefined}
      onPointerDown={onPointerDown}
      role="img"
      aria-label={label}
    >
      {card.faceUp && (
        <>
          <span className="corner">
            <span className="rank">{RANK_LABEL[card.rank]}</span>
            <SuitIcon suit={card.suit} className="pip" />
          </span>
          {full && (
            <>
              {card.rank >= 11 ? (
                <CourtArt rank={card.rank} suit={card.suit} className="court" />
              ) : (
                <SuitIcon suit={card.suit} className="centre" />
              )}
              <span className="corner flip">
                <span className="rank">{RANK_LABEL[card.rank]}</span>
                <SuitIcon suit={card.suit} className="pip" />
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
});
