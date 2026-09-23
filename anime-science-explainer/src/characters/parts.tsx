// Shared cel-shaded building blocks for character faces and limbs.
import React from 'react';
import {COLORS, OUTLINE_WIDTH} from '../theme';
import type {Expression} from '../script';

const O = COLORS.outline;

// ─── Idle motion helpers ────────────────────────────────────────────────────
export const isBlinking = (frame: number, seed: number) => {
  // Blink for 4 frames roughly every 2.5–4 s, with a pseudo-random rhythm.
  const period = 95 + (seed % 5) * 11;
  const t = (frame + seed * 37) % period;
  return t < 4 || (seed % 2 === 0 && t > 10 && t < 13 && (frame + seed) % (period * 3) < period);
};

export const mouthOpenAmount = (frame: number, talking: boolean) => {
  if (!talking) return 0;
  const a = 0.5 + 0.5 * Math.sin(frame * 1.05);
  const b = 0.65 + 0.35 * Math.sin(frame * 0.41 + 1.3);
  return Math.max(0.15, Math.min(1, a * b * 1.3));
};

// ─── Eyes ───────────────────────────────────────────────────────────────────
export interface EyeProps {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  flip?: boolean; // mirror for the character's left eye
  expression: Expression;
  blink: boolean;
  iris: string;
  irisDark: string;
  lash?: string;
  skin?: string;
  look?: {x: number; y: number};
}

export const Eye: React.FC<EyeProps> = ({
  id,
  cx,
  cy,
  w,
  h,
  flip,
  expression,
  blink,
  iris,
  irisDark,
  lash = O,
  skin = COLORS.skin,
  look = {x: 0, y: 0},
}) => {
  const lx = flip ? -look.x : look.x;
  const transform = flip ? `translate(${2 * cx},0) scale(-1,1)` : undefined;

  if (expression === 'chibi') {
    return (
      <g transform={transform}>
        <path
          d={`M ${cx - w * 0.6} ${cy - h * 0.5} L ${cx + w * 0.5} ${cy} L ${cx - w * 0.6} ${cy + h * 0.5}`}
          fill="none"
          stroke={lash}
          strokeWidth={11}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  if (blink) {
    return (
      <g transform={transform}>
        <path
          d={`M ${cx - w - 8} ${cy + h * 0.05} Q ${cx} ${cy + h * 0.5} ${cx + w + 2} ${cy - h * 0.05}`}
          fill="none"
          stroke={lash}
          strokeWidth={9}
          strokeLinecap="round"
        />
        <path d={`M ${cx - w - 6} ${cy + h * 0.05} L ${cx - w - 16} ${cy - h * 0.12}`} stroke={lash} strokeWidth={6} strokeLinecap="round" />
      </g>
    );
  }

  const surprised = expression === 'surprised';
  const sh = surprised ? h * 1.12 : h;
  const sclera = `M ${cx - w} ${cy - sh * 0.35} Q ${cx - w * 0.2} ${cy - sh * 1.05} ${cx + w} ${cy - sh * 0.55} L ${cx + w * 0.95} ${cy + sh * 0.5} Q ${cx} ${cy + sh * 1.05} ${cx - w * 0.85} ${cy + sh * 0.45} Z`;
  const irisScale = surprised ? 0.58 : 1;
  const ix = cx + 2 + lx;
  const iy = cy + 2 + look.y;
  const irx = w * 0.68 * irisScale;
  const iry = h * 0.85 * irisScale;
  const clipId = `${id}-clip`;
  const gradId = `${id}-grad`;
  const determined = expression === 'determined';

  return (
    <g transform={transform}>
      <defs>
        <clipPath id={clipId}>
          <path d={sclera} />
        </clipPath>
        {/* Hard colour stops = cel-shaded iris */}
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={irisDark} />
          <stop offset="0.45" stopColor={irisDark} />
          <stop offset="0.45" stopColor={iris} />
          <stop offset="0.82" stopColor={iris} />
          <stop offset="0.82" stopColor="#ffffff" stopOpacity={0.55} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0.55} />
        </linearGradient>
      </defs>
      <path d={sclera} fill="#ffffff" stroke={O} strokeWidth={3} />
      <g clipPath={`url(#${clipId})`}>
        <ellipse cx={ix} cy={iy} rx={irx} ry={iry} fill={iris} />
        <ellipse cx={ix} cy={iy} rx={irx} ry={iry} fill={`url(#${gradId})`} stroke={irisDark} strokeWidth={3} />
        <ellipse cx={ix} cy={iy + 3} rx={irx * 0.42} ry={iry * 0.45} fill={O} />
        <circle cx={ix - irx * 0.35} cy={iy - iry * 0.35} r={Math.max(4, w * 0.2 * irisScale + 2)} fill="#fff" />
        <circle cx={ix + irx * 0.35} cy={iy + iry * 0.38} r={Math.max(2.5, w * 0.09)} fill="#fff" />
        {/* upper lid shadow on the eyeball */}
        <path d={`M ${cx - w} ${cy - sh * 0.35} Q ${cx - w * 0.2} ${cy - sh * 1.05} ${cx + w} ${cy - sh * 0.55} L ${cx + w} ${cy - sh * 0.35} Q ${cx - w * 0.2} ${cy - sh * 0.8} ${cx - w} ${cy - sh * 0.15} Z`} fill={irisDark} opacity={0.35} />
      </g>
      {determined ? (
        <>
          <path
            d={`M ${cx - w - 14} ${cy - h * 1.05} L ${cx + w + 14} ${cy - h * 1.05} L ${cx + w + 14} ${cy - h * 0.12} L ${cx - w - 14} ${cy - h * 0.5} Z`}
            fill={skin}
          />
          <path d={`M ${cx - w - 10} ${cy - h * 0.5} L ${cx + w + 4} ${cy - h * 0.12}`} stroke={lash} strokeWidth={11} strokeLinecap="round" />
        </>
      ) : (
        <>
          <path
            d={`M ${cx - w - 10} ${cy - sh * 0.25} Q ${cx - w * 0.2} ${cy - sh * 1.2} ${cx + w + 2} ${cy - sh * 0.62}`}
            fill="none"
            stroke={lash}
            strokeWidth={11}
            strokeLinecap="round"
          />
          <path d={`M ${cx - w - 6} ${cy - sh * 0.3} L ${cx - w - 18} ${cy - sh * 0.02}`} stroke={lash} strokeWidth={7} strokeLinecap="round" />
        </>
      )}
      <path
        d={`M ${cx - w * 0.3} ${cy + sh * 0.8} Q ${cx + w * 0.3} ${cy + sh * 0.84} ${cx + w * 0.82} ${cy + sh * 0.58}`}
        fill="none"
        stroke={lash}
        strokeWidth={3.5}
        strokeLinecap="round"
      />
    </g>
  );
};

// ─── Eyebrows ───────────────────────────────────────────────────────────────
const BROW_OFFSETS: Record<Expression, {outer: number; inner: number; mid: number}> = {
  neutral: {outer: 0, inner: 0, mid: 0},
  surprised: {outer: -14, inner: -18, mid: -8},
  happy: {outer: -4, inner: -8, mid: -8},
  thinking: {outer: -10, inner: -14, mid: -6},
  determined: {outer: -8, inner: 16, mid: 0},
  chibi: {outer: 8, inner: -12, mid: -2},
};

export const Brow: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  flip?: boolean;
  expression: Expression;
  color: string;
  thickness?: number;
  // for asymmetric "thinking" brows
  alt?: boolean;
}> = ({cx, cy, w, h, flip, expression, color, thickness = 7, alt}) => {
  let o = BROW_OFFSETS[expression];
  if (expression === 'thinking' && alt) o = {outer: 4, inner: 10, mid: 2};
  const by = cy - h * 1.35;
  const d = `M ${cx - w} ${by + o.outer} Q ${cx} ${by - h * 0.28 + o.mid} ${cx + w * 0.9} ${by + h * 0.02 + o.inner}`;
  return (
    <g transform={flip ? `translate(${2 * cx},0) scale(-1,1)` : undefined}>
      <path d={d} fill="none" stroke={O} strokeWidth={thickness + 4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={thickness} strokeLinecap="round" />
    </g>
  );
};

// ─── Mouth ──────────────────────────────────────────────────────────────────
const MOUTH_DARK = '#7a1832';
const TONGUE = '#ff7a8f';

export const Mouth: React.FC<{
  x: number;
  y: number;
  expression: Expression;
  open: number; // 0 = closed, 1 = wide open (talking)
  scale?: number;
}> = ({x, y, expression, open, scale = 1}) => {
  const t = `translate(${x},${y}) scale(${scale})`;
  const openShape = (w: number, h: number, top = 0) => (
    <g>
      <path
        d={`M ${-w} ${top} Q 0 ${top - 3} ${w} ${top} Q ${w * 0.8} ${h} 0 ${h + 2} Q ${-w * 0.8} ${h} ${-w} ${top} Z`}
        fill={MOUTH_DARK}
        stroke={O}
        strokeWidth={3.5}
        strokeLinejoin="round"
      />
      {h > 10 && <ellipse cx={0} cy={h * 0.78} rx={w * 0.55} ry={h * 0.22} fill={TONGUE} />}
    </g>
  );

  switch (expression) {
    case 'surprised': {
      const ry = 12 + open * 10;
      return (
        <g transform={t}>
          <ellipse cx={0} cy={6} rx={10 + open * 4} ry={ry} fill={MOUTH_DARK} stroke={O} strokeWidth={3.5} />
          <ellipse cx={0} cy={6 + ry * 0.5} rx={6} ry={ry * 0.3} fill={TONGUE} />
        </g>
      );
    }
    case 'chibi': {
      const h = 34 + open * 14;
      return (
        <g transform={t}>
          <path d={`M -30 -6 Q 0 -16 30 -6 Q 18 ${h} 0 ${h + 2} Q -18 ${h} -30 -6 Z`} fill={MOUTH_DARK} stroke={O} strokeWidth={4} strokeLinejoin="round" />
          <ellipse cx={0} cy={h * 0.72} rx={14} ry={7} fill={TONGUE} />
        </g>
      );
    }
    case 'happy':
      return (
        <g transform={t}>
          {open > 0 ? (
            openShape(26, 18 + open * 16, -4)
          ) : (
            <path d="M -26 -4 Q 0 26 26 -4 Z" fill={MOUTH_DARK} stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          )}
        </g>
      );
    case 'determined':
      return (
        <g transform={t}>
          {open > 0 ? (
            <g>
              {openShape(24, 12 + open * 14, -4)}
              <path d="M -21 -4 L 21 -4 L 19 4 L -19 4 Z" fill="#fff" />
            </g>
          ) : (
            <g>
              <path d="M -24 -4 L 24 -4 Q 20 14 0 15 Q -20 14 -24 -4 Z" fill="#fff" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
              <line x1={-20} y1={4} x2={20} y2={4} stroke={O} strokeWidth={2.5} />
            </g>
          )}
        </g>
      );
    case 'thinking':
      return (
        <g transform={t}>
          {open > 0 ? (
            <ellipse cx={6} cy={4} rx={8} ry={5 + open * 7} fill={MOUTH_DARK} stroke={O} strokeWidth={3.5} />
          ) : (
            <path d="M -12 4 Q -4 -2 4 4 Q 10 8 16 0" fill="none" stroke={O} strokeWidth={4} strokeLinecap="round" />
          )}
        </g>
      );
    default:
      return (
        <g transform={t}>
          {open > 0 ? (
            openShape(16, 8 + open * 14, -3)
          ) : (
            <path d="M -15 0 Q 0 9 15 0" fill="none" stroke={O} strokeWidth={4} strokeLinecap="round" />
          )}
        </g>
      );
  }
};

// ─── Blush ──────────────────────────────────────────────────────────────────
export const Blush: React.FC<{x: number; y: number; strong?: boolean}> = ({x, y, strong}) => (
  <g>
    <ellipse cx={x} cy={y} rx={30} ry={13} fill={COLORS.blush} opacity={strong ? 0.75 : 0.45} />
    {strong &&
      [-14, 0, 14].map((dx) => (
        <line key={dx} x1={x + dx - 4} y1={y + 7} x2={x + dx + 4} y2={y - 7} stroke={COLORS.ribbonShadow} strokeWidth={3} strokeLinecap="round" />
      ))}
  </g>
);

// ─── Limbs: outlined tube with a hard cel shadow ───────────────────────────
export type P = [number, number];

export const Tube: React.FC<{
  points: P[];
  width: number;
  fill: string;
  shadow: string;
  cuff?: {color: string; shadow: string; from: number}; // from = 0..1 along last segment
}> = ({points, width, fill, shadow, cuff}) => {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const cuffStart: P | null = cuff
    ? [prev[0] + (last[0] - prev[0]) * cuff.from, prev[1] + (last[1] - prev[1]) * cuff.from]
    : null;
  const common = {fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <g>
      <path d={d} {...common} stroke={O} strokeWidth={width + OUTLINE_WIDTH * 2} />
      <path d={d} {...common} stroke={shadow} strokeWidth={width} />
      <path d={d} {...common} stroke={fill} strokeWidth={width * 0.62} transform="translate(-5,-4)" />
      {cuff && cuffStart && (
        <g>
          <path d={`M ${cuffStart[0]} ${cuffStart[1]} L ${last[0]} ${last[1]}`} {...common} stroke={O} strokeWidth={width + OUTLINE_WIDTH * 2 + 2} />
          <path d={`M ${cuffStart[0]} ${cuffStart[1]} L ${last[0]} ${last[1]}`} {...common} stroke={cuff.shadow} strokeWidth={width + 2} />
          <path d={`M ${cuffStart[0]} ${cuffStart[1]} L ${last[0]} ${last[1]}`} {...common} stroke={cuff.color} strokeWidth={(width + 2) * 0.6} transform="translate(-4,-3)" />
        </g>
      )}
    </g>
  );
};

export type HandShape = 'fist' | 'point' | 'open';

export const Hand: React.FC<{
  at: P;
  dir: number; // radians, direction the hand points
  shape: HandShape;
  r?: number;
  skin?: string;
  shadow?: string;
}> = ({at, dir, shape, r = 27, skin = COLORS.skin, shadow = COLORS.skinShadow}) => {
  const deg = (dir * 180) / Math.PI;
  return (
    <g transform={`translate(${at[0]},${at[1]}) rotate(${deg})`}>
      {shape === 'point' && (
        <g>
          <path d={`M ${r * 0.4} ${-r * 0.35} L ${r * 2.1} ${-r * 0.35}`} stroke={O} strokeWidth={r * 0.62 + 8} strokeLinecap="round" />
          <path d={`M ${r * 0.4} ${-r * 0.35} L ${r * 2.1} ${-r * 0.35}`} stroke={skin} strokeWidth={r * 0.62} strokeLinecap="round" />
        </g>
      )}
      {shape === 'open' && (
        <g>
          {[-0.7, -0.25, 0.2, 0.62].map((a, i) => (
            <g key={i}>
              <path d={`M ${r * 0.5} ${r * a} L ${r * (1.75 - Math.abs(a) * 0.4)} ${r * a * 1.25}`} stroke={O} strokeWidth={r * 0.42 + 8} strokeLinecap="round" />
              <path d={`M ${r * 0.5} ${r * a} L ${r * (1.75 - Math.abs(a) * 0.4)} ${r * a * 1.25}`} stroke={skin} strokeWidth={r * 0.42} strokeLinecap="round" />
            </g>
          ))}
        </g>
      )}
      <circle cx={0} cy={0} r={r} fill={skin} stroke={O} strokeWidth={OUTLINE_WIDTH} />
      <path d={`M ${-r * 0.2} ${r * 0.96} A ${r} ${r} 0 0 0 ${r * 0.96} ${r * 0.2} L ${r * 0.55} ${r * 0.1} A ${r * 0.7} ${r * 0.7} 0 0 1 ${-r * 0.1} ${r * 0.62} Z`} fill={shadow} />
      {shape === 'fist' && <path d={`M ${r * 0.1} ${-r * 0.55} Q ${r * 0.6} ${-r * 0.2} ${r * 0.2} ${r * 0.3}`} fill="none" stroke={O} strokeWidth={3} strokeLinecap="round" />}
    </g>
  );
};

/** Unique-ish id prefix per character instance (SVG ids must be unique in the DOM). */
export const useSvgId = (prefix: string) => {
  const id = React.useId().replace(/:/g, '');
  return `${prefix}${id}`;
};
