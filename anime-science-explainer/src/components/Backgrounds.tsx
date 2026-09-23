// Painted anime backgrounds. Everything drifts a little so no frame is static.
import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS} from '../theme';

const O = COLORS.outline;

export const Petals: React.FC<{count?: number; seed?: string; color?: string}> = ({count = 16, seed = 'petal', color = '#ffc2d6'}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080}>
        {Array.from({length: count}, (_, i) => {
          const r = (k: string) => random(`${seed}${i}${k}`);
          const speed = 1.2 + r('v') * 1.6;
          const y = ((r('y') * 1300 + frame * speed) % 1300) - 100;
          const x = ((r('x') * 2100 + frame * (0.8 + r('d')) + Math.sin(frame / 25 + i) * 40) % 2100) - 100;
          const rot = frame * (2 + r('r') * 3) + i * 40;
          return (
            <ellipse key={i} cx={x} cy={y} rx={11} ry={6} fill={color} stroke="#f28bb0" strokeWidth={1.5} transform={`rotate(${rot} ${x} ${y})`} opacity={0.9} />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const Classroom: React.FC<{pan?: number; dim?: number; showBoard?: boolean}> = ({pan = 0.15, dim = 0, showBoard = true}) => {
  const frame = useCurrentFrame();
  const px = -frame * pan;
  const cloud = (frame * 0.4) % 700;
  return (
    <AbsoluteFill style={{background: COLORS.wall, overflow: 'hidden'}}>
      <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <linearGradient id="bg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={COLORS.skyTop} />
            <stop offset="1" stopColor={COLORS.skyBottom} />
          </linearGradient>
          <clipPath id="bg-window">
            <rect x={120} y={110} width={560} height={500} />
          </clipPath>
        </defs>
        <g transform={`translate(${px} 0)`}>
          {/* wall shading band */}
          <rect x={-200} y={0} width={2600} height={80} fill={COLORS.wallShadow} />
          <rect x={-200} y={640} width={2600} height={40} fill={COLORS.wallShadow} />
          <rect x={-200} y={676} width={2600} height={10} fill={O} opacity={0.6} />
          {/* window with sky, drifting clouds */}
          <rect x={112} y={102} width={576} height={516} rx={8} fill="#8a5a33" stroke={O} strokeWidth={6} />
          <rect x={120} y={110} width={560} height={500} fill="url(#bg-sky)" />
          <g clipPath="url(#bg-window)">
            {[0, 1, 2].map((i) => {
              const cx = ((i * 330 + cloud) % 900) + 20;
              const cy = 190 + i * 110;
              return (
                <g key={i} fill="#fff" stroke={O} strokeWidth={4}>
                  <path d={`M ${cx} ${cy} a 40 40 0 0 1 70 -20 a 50 50 0 0 1 90 10 a 35 35 0 0 1 20 60 L ${cx - 10} ${cy + 50} a 30 30 0 0 1 10 -50 Z`} />
                </g>
              );
            })}
            {/* distant hills */}
            <path d="M 120 560 Q 260 470 400 540 Q 540 480 690 550 L 690 620 L 120 620 Z" fill="#7ad48f" stroke={O} strokeWidth={4} />
          </g>
          <rect x={395} y={110} width={10} height={500} fill="#8a5a33" stroke={O} strokeWidth={3} />
          <rect x={120} y={355} width={560} height={10} fill="#8a5a33" stroke={O} strokeWidth={3} />
          {/* curtain */}
          <path d="M 90 90 L 200 90 Q 180 350 210 640 L 90 640 Z" fill="#ff9fb8" stroke={O} strokeWidth={5} />
          <path d="M 150 90 L 200 90 Q 180 350 210 640 L 170 640 Q 150 350 150 90 Z" fill="#e27a97" />
          {showBoard && (
            <g>
              {/* blackboard */}
              <rect x={880} y={120} width={1150} height={470} rx={10} fill={COLORS.boardEdge} stroke={O} strokeWidth={6} />
              <rect x={902} y={140} width={1106} height={430} fill={COLORS.board} />
              <path d="M 960 520 L 1180 330 L 1400 520" fill="none" stroke="#e8f5e9" strokeWidth={4} strokeDasharray="10 10" opacity={0.55} />
              <circle cx={1650} cy={300} r={70} fill="none" stroke="#e8f5e9" strokeWidth={4} opacity={0.4} />
              <path d="M 1590 300 L 1710 300 M 1650 240 L 1650 360" stroke="#e8f5e9" strokeWidth={3} opacity={0.4} />
              <text x={1500} y={500} fontSize={40} fill="#e8f5e9" opacity={0.5} fontFamily="sans-serif">
                v = d / t
              </text>
              <rect x={880} y={590} width={1150} height={22} fill={COLORS.boardEdge} stroke={O} strokeWidth={5} />
            </g>
          )}
        </g>
        {/* floor */}
        <rect x={0} y={686} width={1920} height={394} fill={COLORS.floor} />
        {Array.from({length: 14}, (_, i) => (
          <line key={i} x1={((i * 180 + px * 1.4) % 2520) - 300} y1={686} x2={((i * 180 + px * 1.4) % 2520) - 300 - 260} y2={1080} stroke={COLORS.floorShadow} strokeWidth={5} />
        ))}
      </svg>
      <Petals />
      {dim > 0 && <AbsoluteFill style={{background: COLORS.night, opacity: dim}} />}
    </AbsoluteFill>
  );
};

/** Dark chalkboard-style panel used for diagrams. */
export const Board: React.FC<{x: number; y: number; w: number; h: number; title?: string; children?: React.ReactNode; enter?: number}> = ({
  x,
  y,
  w,
  h,
  title,
  children,
  enter = 1,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      transform: `scale(${0.85 + 0.15 * enter}) rotate(${(1 - enter) * -4}deg)`,
      opacity: enter,
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#15324a',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 2px, transparent 2px)',
        backgroundSize: '36px 36px',
        borderRadius: 26,
        border: `7px solid ${COLORS.white}`,
        boxShadow: `0 0 0 6px ${COLORS.outline}, 14px 16px 0 ${COLORS.outline}`,
      }}
    />
    {children}
  </div>
);
