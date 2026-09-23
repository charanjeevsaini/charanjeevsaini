import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, Easing} from 'remotion';
import {COLORS} from '../theme';

// ─── Scene transitions ──────────────────────────────────────────────────────
// `progress` goes 0 → 1 as the transition covers the screen.
const Cover: React.FC<{kind: 'flash' | 'iris' | 'wipe'; progress: number}> = ({kind, progress}) => {
  if (progress <= 0) return null;
  if (kind === 'flash') return <AbsoluteFill style={{background: '#fff', opacity: progress}} />;
  if (kind === 'iris') {
    // Black screen with a circular hole that shrinks to nothing as progress → 1
    const r = interpolate(progress, [0, 1], [1200, 0]);
    return (
      <AbsoluteFill>
        <svg width={1920} height={1080}>
          <defs>
            <mask id={`iris-${Math.round(r)}`}>
              <rect width={1920} height={1080} fill="#fff" />
              <circle cx={960} cy={540} r={r} fill="#000" />
            </mask>
          </defs>
          <rect width={1920} height={1080} fill={COLORS.night} mask={`url(#iris-${Math.round(r)})`} />
          <circle cx={960} cy={540} r={r} fill="none" stroke={COLORS.accentPink} strokeWidth={14} />
        </svg>
      </AbsoluteFill>
    );
  }
  // wipe: three slanted colour bands sweeping across
  const bands = [COLORS.accentCyan, COLORS.accentPink, COLORS.night];
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080}>
        {bands.map((c, i) => {
          const p = Math.min(1, Math.max(0, progress * 1.4 - i * 0.2));
          const x = interpolate(p, [0, 1], [-2600, 0]);
          return <path key={i} d={`M ${x} 0 L ${x + 2300} 0 L ${x + 1920} 1080 L ${x - 380} 1080 Z`} fill={c} />;
        })}
      </svg>
    </AbsoluteFill>
  );
};

export const SceneTransition: React.FC<{
  inKind: 'flash' | 'iris' | 'wipe' | 'none';
  outKind: 'flash' | 'iris' | 'wipe' | 'none';
  duration: number;
  length: number;
}> = ({inKind, outKind, duration, length}) => {
  const frame = useCurrentFrame();
  const half = Math.round(duration / 2);
  const inLen = inKind === 'flash' ? duration : half + 4;
  if (inKind !== 'none' && frame < inLen) {
    const p = interpolate(frame, [0, inLen], [1, 0], {easing: Easing.in(Easing.quad)});
    // wipe/iris reveal the new scene by moving the cover off the other side
    if (inKind === 'wipe') {
      return (
        <AbsoluteFill style={{transform: `translateX(${(1 - p) * 2000}px)`}}>
          <Cover kind="wipe" progress={1} />
        </AbsoluteFill>
      );
    }
    return <Cover kind={inKind} progress={p} />;
  }
  const outStart = length - half;
  if (outKind !== 'none' && outKind !== 'flash' && frame >= outStart) {
    const p = interpolate(frame, [outStart, length - 1], [0, 1], {easing: Easing.out(Easing.quad), extrapolateRight: 'clamp'});
    return <Cover kind={outKind} progress={p} />;
  }
  if (outKind === 'flash' && frame >= length - 4) {
    return <Cover kind="flash" progress={interpolate(frame, [length - 4, length - 1], [0.3, 1])} />;
  }
  return null;
};
