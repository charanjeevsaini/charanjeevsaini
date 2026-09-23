import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';

// ─── Pop-in helper ──────────────────────────────────────────────────────────
export const usePop = (at: number, damping = 9) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping, stiffness: 180, mass: 0.7}});
};
