import React from 'react';
import {interpolate, useCurrentFrame, Easing} from 'remotion';
import {COLORS, FONTS} from '../theme';
import {usePop} from './usePop';

const O = COLORS.outline;

// ─── Comedy marks ───────────────────────────────────────────────────────────
export const ExclamationPop: React.FC<{x: number; y: number; at: number; text?: string; size?: number; color?: string; until?: number}> = ({
  x,
  y,
  at,
  text = '!',
  size = 150,
  color = COLORS.accentPink,
  until,
}) => {
  const frame = useCurrentFrame();
  const s = usePop(at, 7);
  if (frame < at || (until !== undefined && frame > until)) return null;
  const wobble = Math.sin((frame - at) / 3) * 6;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${s}) rotate(${wobble}deg)`,
        fontFamily: FONTS.display,
        fontSize: size,
        color,
        WebkitTextStroke: `${size / 20}px ${O}`,
        paintOrder: 'stroke fill',
        textShadow: `6px 6px 0 ${O}`,
        lineHeight: 1,
      }}
    >
      {text}
    </div>
  );
};

export const SweatDrop: React.FC<{x: number; y: number; at: number; size?: number; until?: number}> = ({x, y, at, size = 70, until}) => {
  const frame = useCurrentFrame();
  const s = usePop(at, 10);
  if (frame < at || (until !== undefined && frame > until)) return null;
  const t = frame - at;
  const slide = interpolate(t, [0, 30], [0, 26], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
  return (
    <svg style={{position: 'absolute', left: x, top: y + slide, overflow: 'visible'}} width={size} height={size * 1.4}>
      <g transform={`scale(${s * (size / 70)})`}>
        <path d="M 35 4 C 48 30, 62 50, 62 66 C 62 84, 48 94, 35 94 C 22 94, 8 84, 8 66 C 8 50, 22 30, 35 4 Z" fill="#9be3ff" stroke={O} strokeWidth={5} />
        <ellipse cx={25} cy={66} rx={6} ry={10} fill="#fff" />
      </g>
    </svg>
  );
};

export const AngerMark: React.FC<{x: number; y: number; at: number; size?: number; until?: number}> = ({x, y, at, size = 90, until}) => {
  const frame = useCurrentFrame();
  const pop = usePop(at, 8);
  if (frame < at || (until !== undefined && frame > until)) return null;
  const pulse = 1 + Math.sin((frame - at) / 2.5) * 0.12;
  const s = pop * pulse;
  const arm = 'M 14 38 Q 30 30 30 14';
  return (
    <svg style={{position: 'absolute', left: x - size / 2, top: y - size / 2, overflow: 'visible'}} width={size} height={size}>
      <g transform={`translate(${size / 2} ${size / 2}) scale(${(s * size) / 90}) translate(-45 -45)`}>
        {[0, 90, 180, 270].map((r) => (
          <path key={r} d={arm} transform={`rotate(${r} 45 45)`} fill="none" stroke="#ff2d55" strokeWidth={10} strokeLinecap="round" />
        ))}
      </g>
    </svg>
  );
};

export const QuestionMarks: React.FC<{x: number; y: number; at: number; until?: number}> = ({x, y, at, until}) => {
  const frame = useCurrentFrame();
  if (frame < at || (until !== undefined && frame > until)) return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <ExclamationPop key={i} x={x + i * 60} y={y - (i % 2) * 40} at={at + i * 5} text="?" size={90 + i * 20} color={COLORS.accentCyan} until={until} />
      ))}
    </>
  );
};
