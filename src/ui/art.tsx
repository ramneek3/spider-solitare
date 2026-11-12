import type { Suit } from '../engine/types';

/** Hand-drawn suit marks so they render identically on every machine. */
export function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true" focusable="false">
      {suit === 'S' && (
        <path d="M50 6C50 6 11 36 11 61c0 14 11 23 23 23 7 0 12-3 14-7-.4 9-3 15-10 19h24c-7-4-9.600-10-10-19 2 4 7 7 14 7 12 0 23-9 23-23C89 36 50 6 50 6Z" />
      )}
      {suit === 'H' && (
        <path d="M50 93S9 65 9 35C9 19 21 9 34 9c7 0 13 4 16 11 3-7 9-11 16-11 13 0 25 10 25 26 0 30-41 58-41 58Z" />
      )}
      {suit === 'D' && <path d="M50 4C60 22 76 38 90 50 76 62 60 78 50 96 40 78 24 62 10 50 24 38 40 22 50 4Z" />}
      {suit === 'C' && (
        <g>
          <circle cx="50" cy="27" r="21" />
          <circle cx="26" cy="59" r="21" />
          <circle cx="74" cy="59" r="21" />
          <path d="M50 50c0 22-3 35-12 46h24c-9-11-12-24-12-46Z" />
        </g>
      )}
    </svg>
  );
}

/** A slightly sagging orb web spun from a corner. Purely decorative. */
export function WebBackdrop() {
  const cx = 1000;
  const cy = 0;
  const spokes = 26;
  const start = Math.PI * 0.5 - 0.08;
  const sweep = Math.PI * 0.5 + 0.2; // fan from straight down toward the left
  const angles = Array.from({ length: spokes }, (_, i) => start + (sweep * i) / (spokes - 1));
  const radii = [70, 130, 200, 280, 370, 470, 580, 700, 830, 970, 1120, 1290, 1480];
  const pt = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

  const rings = radii.map((r) => {
    let d = '';
    for (let i = 0; i < angles.length; i++) {
      const [x, y] = pt(r, angles[i]);
      if (i === 0) d += `M${x.toFixed(1)} ${y.toFixed(1)}`;
      else {
        const mid = (angles[i - 1] + angles[i]) / 2;
        const half = (angles[i] - angles[i - 1]) / 2;
        const chord = 2 * r * Math.sin(half);
        const [qx, qy] = pt(r * Math.cos(half) - chord * 0.22, mid);
        d += `Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
    }
    return d;
  });
  const maxR = radii[radii.length - 1];

  return (
    <svg
      className="web"
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMaxYMin slice"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
        {angles.map((a, i) => {
          const [x, y] = pt(maxR, a);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} />;
        })}
        {rings.map((d, i) => (
          <path key={i} d={d} opacity={0.55 + 0.45 * (i / rings.length)} />
        ))}
      </g>
    </svg>
  );
}

/** The little spider that lives next to the title. */
export function SpiderMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M13 14Q7 8 3 9M13 16Q6 14 2 17M13 17.5Q7 21 3 26M14 19Q10 25 8 30" />
        <path d="M19 14Q25 8 29 9M19 16Q26 14 30 17M19 17.5Q25 21 29 26M18 19Q22 25 24 30" />
      </g>
      <circle cx="16" cy="13" r="3.2" fill="currentColor" />
      <ellipse cx="16" cy="20" rx="5" ry="6" fill="currentColor" />
    </svg>
  );
}
