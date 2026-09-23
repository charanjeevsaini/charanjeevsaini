import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';

// ─── Screen shake wrapper ───────────────────────────────────────────────────
export const ScreenShake: React.FC<{
  shakes: {at: number; duration?: number; intensity?: number}[];
  children: React.ReactNode;
}> = ({shakes, children}) => {
  const frame = useCurrentFrame();
  let dx = 0;
  let dy = 0;
  for (const s of shakes) {
    const t = frame - s.at;
    const d = s.duration ?? 14;
    if (t >= 0 && t < d) {
      const k = (s.intensity ?? 22) * (1 - t / d);
      dx += (random(`shx${s.at}-${t}`) - 0.5) * 2 * k;
      dy += (random(`shy${s.at}-${t}`) - 0.5) * 2 * k;
    }
  }
  return <AbsoluteFill style={{transform: `translate(${dx}px, ${dy}px)`}}>{children}</AbsoluteFill>;
};
