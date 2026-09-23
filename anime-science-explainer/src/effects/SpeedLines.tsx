import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

// ─── Speed / focus lines ────────────────────────────────────────────────────
export const SpeedLines: React.FC<{
  mode?: 'radial' | 'horizontal';
  cx?: number;
  cy?: number;
  count?: number;
  inner?: number; // clear radius in the middle (radial)
  color?: string;
  opacity?: number;
  seed?: string;
}> = ({mode = 'radial', cx = 960, cy = 540, count = 70, inner = 330, color = '#fff', opacity = 0.85, seed = 'sl'}) => {
  const frame = useCurrentFrame();
  const tick = Math.floor(frame / 2); // re-jitter every 2 frames: classic anime flicker
  const lines = Array.from({length: count}, (_, i) => {
    const r = (k: string) => random(`${seed}-${i}-${k}-${tick}`);
    if (mode === 'horizontal') {
      const y = random(`${seed}-${i}-y`) * 1080;
      const len = 300 + r('l') * 900;
      const x = ((r('x') * 2400 + frame * 90) % 2400) - 400;
      const th = 2 + r('t') * 7;
      return <path key={i} d={`M ${x} ${y} L ${x + len} ${y - th / 2} L ${x + len} ${y + th / 2} Z`} fill={color} />;
    }
    const a = (i / count) * Math.PI * 2 + (r('a') - 0.5) * 0.08;
    const width = 0.006 + r('w') * 0.018;
    const start = inner + r('s') * 160;
    const far = 1500;
    const p = (ang: number, rad: number) => `${cx + Math.cos(ang) * rad} ${cy + Math.sin(ang) * rad}`;
    return <path key={i} d={`M ${p(a, start)} L ${p(a - width, far)} L ${p(a + width, far)} Z`} fill={color} />;
  });
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={1920} height={1080} style={{opacity}}>
        {lines}
      </svg>
    </AbsoluteFill>
  );
};
