// Props: pencil and glass of water.
import React from 'react';
import {COLORS} from '../theme';

const O = COLORS.outline;

/** A pencil drawn from its eraser end (x1,y1) to its tip (x2,y2). */
export const Pencil: React.FC<{x1: number; y1: number; x2: number; y2: number; width?: number; opacity?: number; dashed?: boolean}> = ({
  x1,
  y1,
  x2,
  y2,
  width = 30,
  opacity = 1,
  dashed,
}) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const w = width;
  const cone = w * 1.6;
  const body = len - cone;
  const dash = dashed ? {strokeDasharray: '10 8'} : {};
  return (
    <g transform={`translate(${x1} ${y1}) rotate(${ang})`} opacity={opacity}>
      <rect x={0} y={-w / 2} width={w * 0.9} height={w} rx={w * 0.3} fill={dashed ? 'none' : '#ff8fb1'} stroke={O} strokeWidth={4} {...dash} />
      <rect x={w * 0.8} y={-w / 2} width={w * 0.5} height={w} fill={dashed ? 'none' : '#c8ccd6'} stroke={O} strokeWidth={4} {...dash} />
      <rect x={w * 1.3} y={-w / 2} width={body - w * 1.3} height={w} fill={dashed ? 'none' : COLORS.pencil} stroke={O} strokeWidth={4} {...dash} />
      {!dashed && <rect x={w * 1.3} y={0} width={body - w * 1.3} height={w / 2} fill={COLORS.pencilShadow} />}
      <path d={`M ${body} ${-w / 2} L ${len} 0 L ${body} ${w / 2} Z`} fill={dashed ? 'none' : COLORS.pencilWood} stroke={O} strokeWidth={4} strokeLinejoin="round" {...dash} />
      {!dashed && <path d={`M ${body + cone * 0.62} ${-w * 0.19} L ${len} 0 L ${body + cone * 0.62} ${w * 0.19} Z`} fill="#3b3b4f" />}
      {!dashed && <rect x={w * 1.3} y={-w / 2} width={body - w * 1.3} height={w} fill="none" stroke={O} strokeWidth={4} />}
    </g>
  );
};

/**
 * Glass of water with a pencil standing in it.
 * `drop` 0..1 animates the pencil falling in; `bent` 0..1 fades in the
 * refraction shift of the underwater part (as seen from the side).
 */
export const WaterGlass: React.FC<{x: number; y: number; scale?: number; drop?: number; bent?: number; wave?: number; id?: string}> = ({
  x,
  y,
  scale = 1,
  drop = 1,
  bent = 1,
  wave = 0,
  id = 'wg',
}) => {
  // local coords: glass 240 wide, 320 tall, origin top-left of glass
  const waterY = 130;
  const top = {x1: 60, y1: -170, x2: 175, y2: 300}; // resting pencil
  const lift = (1 - drop) * -260;
  const p = {x1: top.x1, y1: top.y1 + lift, x2: top.x2, y2: top.y2 + lift};
  const shift = 44 * bent; // apparent sideways shift of the underwater part
  const crossX = p.x1 + ((p.x2 - p.x1) * (waterY - p.y1)) / (p.y2 - p.y1);
  const surf = (t: number) => waterY + Math.sin(t / 5) * 3 * wave;
  const glassPath = 'M 0 0 L 240 0 L 215 320 L 25 320 Z';
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <clipPath id={`${id}-in`}>
          <path d={glassPath} />
        </clipPath>
        <clipPath id={`${id}-above`}>
          <rect x={-400} y={-800} width={1200} height={800 + waterY} />
        </clipPath>
        <clipPath id={`${id}-below`}>
          <rect x={-400} y={waterY} width={1200} height={600} />
        </clipPath>
      </defs>
      {/* back rim */}
      <ellipse cx={120} cy={0} rx={120} ry={18} fill="rgba(200,240,255,0.5)" stroke={O} strokeWidth={4} />
      {/* water */}
      <g clipPath={`url(#${id}-in)`}>
        <path d={`M -10 ${surf(0)} Q 60 ${waterY - 8 * wave} 120 ${waterY} T 250 ${waterY} L 250 330 L -10 330 Z`} fill={COLORS.water} opacity={0.85} />
        <rect x={150} y={waterY + 10} width={40} height={180} fill={COLORS.waterDeep} opacity={0.5} />
      </g>
      {/* pencil above water */}
      <g clipPath={`url(#${id}-above)`}>
        <Pencil {...p} />
      </g>
      {/* pencil below water: shifted sideways = looks broken */}
      <g clipPath={`url(#${id}-below)`}>
        <g clipPath={`url(#${id}-in)`}>
          <g transform={`translate(${shift} ${-4 * bent}) rotate(${9 * bent} ${crossX} ${waterY})`}>
            <Pencil {...p} width={34} />
          </g>
        </g>
      </g>
      {/* water surface ellipse */}
      <ellipse cx={120} cy={waterY} rx={111} ry={14} fill="rgba(180,235,255,0.6)" stroke={O} strokeWidth={3} />
      {/* glass body + shine */}
      <path d={glassPath} fill="rgba(220,245,255,0.22)" stroke={O} strokeWidth={6} strokeLinejoin="round" />
      <path d="M 26 20 L 44 290" stroke="#fff" strokeWidth={12} strokeLinecap="round" opacity={0.7} />
      <path d="M 206 30 L 196 180" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
      <ellipse cx={120} cy={320} rx={95} ry={12} fill="none" stroke={O} strokeWidth={4} />
    </g>
  );
};
