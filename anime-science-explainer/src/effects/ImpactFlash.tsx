import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';

// ─── Impact flash (white or colour-inverted frame) ─────────────────────────
export const ImpactFlash: React.FC<{at: number; duration?: number; invert?: boolean; color?: string}> = ({
  at,
  duration = 8,
  invert = false,
  color = '#fff',
}) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > duration) return null;
  if (invert) {
    // two hard inverted frames then a white fade: classic anime impact frame
    if (t < 3) return <AbsoluteFill style={{background: '#fff', mixBlendMode: 'difference'}} />;
    return <AbsoluteFill style={{background: color, opacity: interpolate(t, [3, duration], [0.8, 0])}} />;
  }
  return <AbsoluteFill style={{background: color, opacity: interpolate(t, [0, duration], [1, 0])}} />;
};
