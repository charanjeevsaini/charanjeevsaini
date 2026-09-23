// Pip: tiny floating light-spirit mascot. Reacts comically; glows on "power-up".
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS} from '../theme';
import {useSvgId} from './parts';

export type PipMood = 'happy' | 'surprised' | 'power' | 'dizzy';

const O = COLORS.outline;

const Star: React.FC<{x: number; y: number; r: number; fill: string}> = ({x, y, r, fill}) => {
  const pts = Array.from({length: 10}, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    return `${x + Math.cos(a) * rr},${y + Math.sin(a) * rr}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} stroke={O} strokeWidth={3} strokeLinejoin="round" />;
};

export const Pip: React.FC<{mood?: PipMood; size?: number; style?: React.CSSProperties; seed?: number}> = ({
  mood = 'happy',
  size = 180,
  style,
  seed = 0,
}) => {
  const frame = useCurrentFrame();
  const id = useSvgId('pip');
  const bob = Math.sin((frame + seed * 10) / 10) * 8;
  const squash = 1 + Math.sin((frame + seed * 10) / 5) * 0.03;
  const antenna = Math.sin((frame + seed) / 7) * 12;
  const power = mood === 'power';
  const glowPulse = 0.6 + 0.4 * Math.sin(frame / 3);

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{overflow: 'visible', ...style}}>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={power ? '#fff7a8' : COLORS.pipGlow} stopOpacity={0.9} />
          <stop offset="1" stopColor={power ? '#ffcc00' : COLORS.pip} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={`translate(0 ${bob})`}>
        <circle cx={100} cy={112} r={power ? 95 * (0.9 + glowPulse * 0.2) : 80} fill={`url(#${id}-glow)`} />
        {/* antenna with a star */}
        <g transform={`rotate(${antenna} 100 60)`}>
          <path d="M 100 62 Q 96 36 112 22" fill="none" stroke={O} strokeWidth={5} strokeLinecap="round" />
          <Star x={114} y={20} r={14} fill={power ? '#ffe14d' : '#fff38a'} />
        </g>
        <g transform={`translate(100 112) scale(${1 / squash} ${squash}) translate(-100 -112)`}>
          <path d="M 100 56 C 150 56, 164 100, 160 128 C 156 162, 130 172, 100 172 C 70 172, 44 162, 40 128 C 36 100, 50 56, 100 56 Z" fill={power ? '#fff27a' : COLORS.pip} stroke={O} strokeWidth={5} />
          <path d="M 150 90 C 162 120, 156 160, 100 172 C 130 150, 150 125, 150 90 Z" fill={power ? '#ffc400' : COLORS.pipShadow} />
          {/* little arms */}
          <path d={power ? 'M 44 118 L 20 90' : 'M 44 128 L 28 140'} stroke={O} strokeWidth={9} strokeLinecap="round" />
          <path d={power ? 'M 156 118 L 180 90' : 'M 156 128 L 172 140'} stroke={O} strokeWidth={9} strokeLinecap="round" />
          {/* face */}
          {mood === 'dizzy' ? (
            <>
              <path d="M 70 98 l 16 16 M 86 98 l -16 16" stroke={O} strokeWidth={5} strokeLinecap="round" />
              <path d="M 114 98 l 16 16 M 130 98 l -16 16" stroke={O} strokeWidth={5} strokeLinecap="round" />
            </>
          ) : power ? (
            <>
              <Star x={78} y={106} r={15} fill="#ff8a1f" />
              <Star x={122} y={106} r={15} fill="#ff8a1f" />
            </>
          ) : (
            <>
              <ellipse cx={78} cy={106} rx={mood === 'surprised' ? 9 : 11} ry={mood === 'surprised' ? 12 : 16} fill={O} />
              <ellipse cx={122} cy={106} rx={mood === 'surprised' ? 9 : 11} ry={mood === 'surprised' ? 12 : 16} fill={O} />
              <circle cx={74} cy={100} r={4.5} fill="#fff" />
              <circle cx={118} cy={100} r={4.5} fill="#fff" />
            </>
          )}
          <ellipse cx={62} cy={128} rx={11} ry={6} fill={COLORS.blush} opacity={0.7} />
          <ellipse cx={138} cy={128} rx={11} ry={6} fill={COLORS.blush} opacity={0.7} />
          {mood === 'surprised' ? (
            <ellipse cx={100} cy={136} rx={7} ry={9} fill="#7a1832" stroke={O} strokeWidth={3} />
          ) : (
            <path d="M 88 130 Q 94 138 100 130 Q 106 138 112 130" fill="none" stroke={O} strokeWidth={4} strokeLinecap="round" />
          )}
        </g>
      </g>
    </svg>
  );
};
