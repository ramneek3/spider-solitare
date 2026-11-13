import type { ReactNode } from 'react';
import type { Suit } from '../engine/types';

/**
 * Original court-card portraits (Jack, Queen, King), drawn as one half-figure and
 * repeated rotated 180° so the card reads the same from either end, like a real deck.
 * Each half lives in a 120 × 50 box; the full panel is 120 × 100.
 */

const INK = '#172036';
const SKIN = '#f1caa3';
const GOLD = '#e2b64a';
const WHITE = '#fbfaf6';

const ROBE: Record<Suit, { base: string; trim: string }> = {
  S: { base: '#2c4a8a', trim: '#e2b64a' },
  H: { base: '#c8372d', trim: '#e2b64a' },
  D: { base: '#df9a1c', trim: '#c8372d' },
  C: { base: '#2f7d6d', trim: '#e2b64a' },
};

const line = { stroke: INK, strokeWidth: 0.8, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

function Eyes({ y = 20 }: { y?: number }) {
  return (
    <g>
      <path d={`M51.5 ${y - 3.2} Q55 ${y - 4.6} 57.5 ${y - 3}`} fill="none" {...line} />
      <path d={`M62.5 ${y - 3} Q65 ${y - 4.6} 68.5 ${y - 3.2}`} fill="none" {...line} />
      <circle cx="54.5" cy={y} r="1.35" fill={INK} />
      <circle cx="65.5" cy={y} r="1.35" fill={INK} />
    </g>
  );
}

function Nose({ y = 21 }: { y?: number }) {
  return <path d={`M60 ${y - 1.5} Q58.2 ${y + 3.5} 60.4 ${y + 3.6}`} fill="none" {...line} strokeWidth={0.7} />;
}

function King({ suit }: { suit: Suit }) {
  const { base, trim } = ROBE[suit];
  return (
    <g>
      {/* sceptre */}
      <rect x="18.6" y="12" width="2.6" height="38" fill={GOLD} {...line} />
      <circle cx="19.9" cy="10.5" r="3.4" fill={GOLD} {...line} />
      <path d="M19.9 6.3v-2.2M17.8 8.2l-1.6-1M22 8.2l1.6-1" {...line} fill="none" />

      {/* robe + shoulders */}
      <path d="M17 50C18 38 31 33 46 31.5h28C89 33 102 38 103 50Z" fill={base} {...line} />
      <path d="M26 50c3-7 10-11 20-13M94 50c-3-7-10-11-20-13" fill="none" stroke={trim} strokeWidth="1.6" strokeLinecap="round" />

      {/* neck */}
      <path d="M53 28h14v8c-3 3-11 3-14 0Z" fill={SKIN} {...line} />

      {/* ermine collar */}
      <path d="M37 33.5Q60 45 83 33.5L88 42Q60 55 32 42Z" fill={WHITE} {...line} />
      {[
        [42, 40],
        [50, 44],
        [60, 46],
        [70, 44],
        [78, 40],
      ].map(([x, y]) => (
        <path key={x} d={`M${x} ${y}v3.2`} stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      ))}

      {/* white hair at the sides */}
      <path d="M46.5 12C40 20 41 31 46 36l4.5-12Z" fill="#e6e3dc" {...line} />
      <path d="M73.5 12C80 20 79 31 74 36l-4.5-12Z" fill="#e6e3dc" {...line} />

      {/* face */}
      <ellipse cx="60" cy="21.5" rx="12.5" ry="14" fill={SKIN} {...line} />
      <Eyes y={19.5} />
      <Nose y={21} />

      {/* beard and moustache */}
      <path
        d="M47.5 24.5C46 36 52 45 60 45s14-9 12.5-20.500c-3 4-7 6.500-12.500 6.500S50.500 28.500 47.500 24.500Z"
        fill="#e9e6df"
        {...line}
      />
      <path d="M60 31c-1 5-3 8-6 10M60 31c1 5 3 8 6 10" fill="none" stroke={INK} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M49.500 25.500Q55 21.500 60 26Q65 21.500 70.500 25.500Q65 30.500 60 27.500Q55 30.500 49.500 25.500Z" fill="#f5f3ee" {...line} />

      {/* crown */}
      <path d="M46 11.5 45.500 2.500 52.500 7 60 0.500 67.500 7 74.500 2.500 74 11.500Z" fill={GOLD} {...line} />
      <rect x="46" y="9.500" width="28" height="3.600" rx="1" fill={GOLD} {...line} />
      <circle cx="60" cy="5.500" r="1.700" fill="#c8372d" {...line} strokeWidth={0.5} />
      <circle cx="52" cy="11.300" r="1.100" fill="#2c4a8a" />
      <circle cx="60" cy="11.300" r="1.100" fill="#c8372d" />
      <circle cx="68" cy="11.300" r="1.100" fill="#2c4a8a" />
      <circle cx="45.500" cy="2.500" r="1.200" fill={WHITE} {...line} strokeWidth={0.5} />
      <circle cx="74.500" cy="2.500" r="1.200" fill={WHITE} {...line} strokeWidth={0.5} />
    </g>
  );
}

function Queen({ suit }: { suit: Suit }) {
  const { base, trim } = ROBE[suit];
  const hair = '#6b4423';
  return (
    <g>
      {/* flower held at the right */}
      <path d="M97 27 94.500 50" stroke="#2f7d6d" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M96 38c4-1 6-3 7-6-4 0-6 2-7 6Z" fill="#2f7d6d" {...line} strokeWidth={0.5} />
      <circle cx="97.500" cy="22.500" r="5.500" fill="#c8372d" {...line} />
      <path d="M94.500 22.500a3.200 3.200 0 1 1 6 1.500M96.300 20.500a1.800 1.800 0 1 1 3 1.800" fill="none" stroke="#7d1b17" strokeWidth="0.7" strokeLinecap="round" />

      {/* long hair behind */}
      <path d="M41.500 13C32 24 34 42 38 50h44c4-8 6-26-3.500-37Z" fill={hair} {...line} />

      {/* dress */}
      <path d="M21 50c2-11 12-16 25-17.500h28C87 34 97 39 99 50Z" fill={base} {...line} />
      <path d="M28 50c3-7 10-11 19-12.500M92 50c-3-7-10-11-19-12.500" fill="none" stroke={trim} strokeWidth="1.600" strokeLinecap="round" />

      {/* neck and neckline */}
      <path d="M54 28h12v7c-2.500 2.500-9.500 2.500-12 0Z" fill={SKIN} {...line} />
      <path d="M47 33.500Q60 47 73 33.500Q60 36.500 47 33.500Z" fill={SKIN} {...line} />
      <path d="M47 33.500Q60 47 73 33.500" fill="none" stroke={trim} strokeWidth="1.800" strokeLinecap="round" />
      {[
        [50.500, 37.500],
        [54.500, 41],
        [60, 42.500],
        [65.500, 41],
        [69.500, 37.500],
      ].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="1.350" fill={WHITE} stroke={GOLD} strokeWidth="0.7" />
      ))}

      {/* face */}
      <ellipse cx="60" cy="22" rx="11.200" ry="13.500" fill={SKIN} {...line} />
      <path d="M48.500 19C50 9 70 9 71.500 19 68 13.500 64 12.500 60 12.500S52 13.500 48.500 19Z" fill={hair} {...line} />
      <Eyes y={21} />
      <Nose y={22.500} />
      <path d="M56.500 29.500Q60 32 63.500 29.500Q60 30.800 56.500 29.500Z" fill="#c8372d" stroke="#8c1f1a" strokeWidth="0.7" strokeLinejoin="round" />
      <circle cx="52" cy="26" r="2.200" fill="#e9856f" opacity="0.35" />
      <circle cx="68" cy="26" r="2.200" fill="#e9856f" opacity="0.35" />
      <circle cx="48.800" cy="28.500" r="1.300" fill={GOLD} {...line} strokeWidth={0.5} />
      <circle cx="71.200" cy="28.500" r="1.300" fill={GOLD} {...line} strokeWidth={0.5} />

      {/* crown */}
      <path d="M47 11 46 3.500 52.500 7.500 60 1.500 67.500 7.500 74 3.500 73 11Z" fill={GOLD} {...line} />
      <rect x="47" y="9" width="26" height="3.400" rx="1" fill={GOLD} {...line} />
      <circle cx="60" cy="6" r="1.600" fill="#c8372d" {...line} strokeWidth={0.5} />
      <circle cx="53" cy="10.700" r="1" fill="#2c4a8a" />
      <circle cx="60" cy="10.700" r="1" fill="#c8372d" />
      <circle cx="67" cy="10.700" r="1" fill="#2c4a8a" />
      <circle cx="46" cy="3.500" r="1.100" fill={WHITE} {...line} strokeWidth={0.5} />
      <circle cx="74" cy="3.500" r="1.100" fill={WHITE} {...line} strokeWidth={0.5} />
    </g>
  );
}

function Jack({ suit }: { suit: Suit }) {
  const { base, trim } = ROBE[suit];
  const hair = '#8a4b25';
  return (
    <g>
      {/* halberd */}
      <rect x="19" y="8" width="2.200" height="42" fill="#8a6a3a" {...line} />
      <path d="M20.100 5 11 11.500 20.100 19 22 12Z" fill="#c4cbd6" {...line} />
      <path d="M22 9 28 12 22 16Z" fill="#c4cbd6" {...line} />

      {/* hair */}
      <path d="M46 14C38 23 38 37 43 44L51 30Z" fill={hair} {...line} />
      <path d="M74 14C82 23 82 37 77 44L69 30Z" fill={hair} {...line} />

      {/* tunic */}
      <path d="M22 50c1-10 11-15 24-17.500h28C87 35 98 40 99 50Z" fill={base} {...line} />
      <path d="M30 50c3-6 9-10 17-12M90 50c-3-6-9-10-17-12" fill="none" stroke={trim} strokeWidth="1.600" strokeLinecap="round" />

      {/* neck + white collar */}
      <path d="M54 28h12v7c-2.500 2.500-9.500 2.500-12 0Z" fill={SKIN} {...line} />
      <path d="M48 32.500 60 45 72 32.500 67.500 31 60 38.500 52.500 31Z" fill={WHITE} {...line} />
      <circle cx="60" cy="46.500" r="1.300" fill={GOLD} {...line} strokeWidth={0.5} />

      {/* face */}
      <ellipse cx="60" cy="22" rx="11.200" ry="13.200" fill={SKIN} {...line} />
      <Eyes y={21} />
      <Nose y={22.500} />
      <path d="M56.500 29.500Q60 31.600 63.500 29.500" fill="none" stroke="#8c1f1a" strokeWidth="1" strokeLinecap="round" />

      {/* cap, band and feather */}
      <path d="M45.500 15C45 2 72 -1 77 8.500c1.500 3 0 5-2.500 5.500H48Z" fill={base} {...line} />
      <rect x="46" y="12.500" width="29" height="3.600" rx="1.200" fill={trim} {...line} />
      <path d="M70 7C80 0.800 95 2 101 12c-7-4-15-4.500-25 1Z" fill={WHITE} {...line} />
      <path d="M72 9.500C82 4.500 92 5 98 11" fill="none" stroke={INK} strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="68" cy="14.300" r="1.300" fill="#c8372d" {...line} strokeWidth={0.5} />
    </g>
  );
}

const FIGURES: Record<number, (p: { suit: Suit }) => ReactNode> = {
  11: Jack,
  12: Queen,
  13: King,
};

/** The framed, double-ended portrait for a Jack (11), Queen (12) or King (13). */
export function CourtArt({ rank, suit, className }: { rank: number; suit: Suit; className?: string }) {
  const Figure = FIGURES[rank];
  if (!Figure) return null;
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="court-clip">
          <rect x="0.5" y="0.5" width="119" height="99" rx="3" />
        </clipPath>
      </defs>
      <rect x="0.5" y="0.5" width="119" height="99" rx="3" fill="#f6f1e2" stroke={INK} strokeWidth="1" />
      <g clipPath="url(#court-clip)">
        <Figure suit={suit} />
        <g transform="rotate(180 60 50)">
          <Figure suit={suit} />
        </g>
      </g>
      <line x1="0.5" y1="50" x2="119.500" y2="50" stroke={INK} strokeWidth="0.8" />
      <rect x="0.5" y="0.5" width="119" height="99" rx="3" fill="none" stroke={INK} strokeWidth="1" />
    </svg>
  );
}
