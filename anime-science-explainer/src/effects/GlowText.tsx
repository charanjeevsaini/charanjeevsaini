import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, FONTS} from '../theme';

const O = COLORS.outline;

// ─── Glowing anime text ─────────────────────────────────────────────────────
export const GlowText: React.FC<{
  children: React.ReactNode;
  size: number;
  color?: string;
  glow?: string;
  stroke?: string;
  style?: React.CSSProperties;
}> = ({children, size, color = '#fff', glow = COLORS.accentCyan, stroke = O, style}) => {
  const frame = useCurrentFrame();
  const g = 18 + Math.sin(frame / 4) * 8;
  return (
    <div
      style={{
        fontFamily: FONTS.display,
        fontSize: size,
        color,
        WebkitTextStroke: `${Math.max(3, size / 16)}px ${stroke}`,
        paintOrder: 'stroke fill',
        textShadow: `0 0 ${g}px ${glow}, 0 0 ${g * 2}px ${glow}, 6px 6px 0 ${stroke}`,
        letterSpacing: size / 40,
        lineHeight: 1.05,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
