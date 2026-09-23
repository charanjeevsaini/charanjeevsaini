// Anime "reaction cut-in": a slanted inset panel showing a character's face.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS} from '../theme';

export const CutIn: React.FC<{
  show: boolean;
  since: number; // frame when `show` last changed
  side?: 'left' | 'right';
  top?: number;
  color?: string;
  children: React.ReactNode;
}> = ({show, since, side = 'left', top = 470, color = COLORS.accentPink, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - since, fps, config: {damping: 13, stiffness: 200}});
  const v = show ? s : 1 - interpolate(frame - since, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  if (v <= 0.001) return null;
  const w = 470;
  const h = 360;
  const x = side === 'left' ? interpolate(v, [0, 1], [-w - 60, 40]) : interpolate(v, [0, 1], [1920 + 60, 1920 - w - 40]);
  return (
    <div style={{position: 'absolute', left: x, top, width: w, height: h}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: color,
          border: `6px solid ${COLORS.outline}`,
          clipPath: 'polygon(6% 0, 100% 4%, 94% 100%, 0 96%)',
          overflow: 'hidden',
        }}
      >
        <div style={{position: 'absolute', inset: 0, background: `repeating-linear-gradient(115deg, rgba(255,255,255,0.18) 0 18px, transparent 18px 44px)`}} />
        {children}
      </div>
    </div>
  );
};
