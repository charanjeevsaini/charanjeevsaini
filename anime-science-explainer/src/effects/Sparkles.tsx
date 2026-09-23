import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {COLORS} from '../theme';

const O = COLORS.outline;

// ─── Sparkles ───────────────────────────────────────────────────────────────
export const sparklePath = (x: number, y: number, r: number) =>
  `M ${x} ${y - r} Q ${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q ${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q ${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q ${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r} Z`;

export const Sparkles: React.FC<{
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  count?: number;
  size?: number;
  color?: string;
  seed?: string;
  start?: number;
}> = ({x = 0, y = 0, w = 1920, h = 1080, count = 14, size = 26, color = '#fff', seed = 'sp', start = 0}) => {
  const frame = useCurrentFrame() - start;
  if (frame < 0) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080}>
        {Array.from({length: count}, (_, i) => {
          const period = 26 + Math.floor(random(`${seed}${i}p`) * 24);
          const offset = Math.floor(random(`${seed}${i}o`) * period);
          const cycle = Math.floor((frame + offset) / period);
          const t = ((frame + offset) % period) / period;
          const px = x + random(`${seed}${i}x${cycle}`) * w;
          const py = y + random(`${seed}${i}y${cycle}`) * h;
          const s = Math.sin(t * Math.PI) * size * (0.6 + random(`${seed}${i}s`) * 0.8);
          if (s < 1) return null;
          return (
            <g key={i} transform={`rotate(${t * 90} ${px} ${py})`}>
              <path d={sparklePath(px, py, s)} fill={color} stroke={O} strokeWidth={Math.min(3, s / 8)} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
