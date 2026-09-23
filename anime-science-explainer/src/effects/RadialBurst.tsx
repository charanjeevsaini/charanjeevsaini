import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS} from '../theme';

// ─── Radial burst background (power-up) ─────────────────────────────────────
export const RadialBurst: React.FC<{cx?: number; cy?: number; rays?: number; a?: string; b?: string; speed?: number}> = ({
  cx = 960,
  cy = 540,
  rays = 28,
  a = COLORS.burstA,
  b = COLORS.burstB,
  speed = 0.6,
}) => {
  const frame = useCurrentFrame();
  const rot = frame * speed;
  const R = 2400;
  return (
    <AbsoluteFill style={{background: b}}>
      <svg width={1920} height={1080}>
        <g transform={`rotate(${rot} ${cx} ${cy})`}>
          {Array.from({length: rays}, (_, i) => {
            const a1 = (i / rays) * Math.PI * 2;
            const a2 = ((i + 0.5) / rays) * Math.PI * 2;
            return (
              <path
                key={i}
                d={`M ${cx} ${cy} L ${cx + Math.cos(a1) * R} ${cy + Math.sin(a1) * R} L ${cx + Math.cos(a2) * R} ${cy + Math.sin(a2) * R} Z`}
                fill={a}
              />
            );
          })}
        </g>
        <defs>
          <radialGradient id="burst-core">
            <stop offset="0" stopColor="#fff" stopOpacity={1} />
            <stop offset="0.35" stopColor="#fff" stopOpacity={0.6} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={520 + Math.sin(frame / 4) * 30} fill="url(#burst-core)" />
      </svg>
    </AbsoluteFill>
  );
};
