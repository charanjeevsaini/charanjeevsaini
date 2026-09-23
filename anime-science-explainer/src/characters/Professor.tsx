// Professor Kōsei: calm, slightly eccentric mentor. Wild white hair, round glasses, lab coat.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, OUTLINE_WIDTH} from '../theme';
import type {Pose} from '../script';
import type {CharacterProps} from './Hikari';
import {Brow, Eye, Hand, HandShape, isBlinking, Mouth, mouthOpenAmount, P, Tube, useSvgId} from './parts';

const O = COLORS.outline;
const SW = OUTLINE_WIDTH;

type ArmDef = {pts: P[]; hand: HandShape};
const L_IDLE: ArmDef = {pts: [[180, 510], [152, 700], [172, 880]], hand: 'fist'};
const ARMS: Record<Pose, {left: ArmDef; right: ArmDef}> = {
  idle: {left: L_IDLE, right: {pts: [[420, 510], [448, 700], [428, 880]], hand: 'fist'}},
  // "Eureka!" raised index finger
  point: {left: L_IDLE, right: {pts: [[420, 510], [520, 590], [505, 395]], hand: 'point'}},
  cheer: {
    left: {pts: [[180, 510], [95, 410], [120, 270]], hand: 'fist'},
    right: {pts: [[420, 510], [505, 410], [480, 270]], hand: 'fist'},
  },
  // stroking the goatee
  think: {left: L_IDLE, right: {pts: [[420, 510], [470, 680], [340, 445]], hand: 'fist'}},
  present: {left: L_IDLE, right: {pts: [[420, 510], [510, 655], [600, 590]], hand: 'open'}},
};

const Arm: React.FC<{def: ArmDef}> = ({def}) => {
  const n = def.pts.length;
  const [a, b] = [def.pts[n - 2], def.pts[n - 1]];
  const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return (
    <g>
      <Tube points={def.pts} width={62} fill={COLORS.labCoat} shadow={COLORS.labCoatShadow} cuff={{color: COLORS.labCoat, shadow: COLORS.labCoatShadow, from: 0.8}} />
      <Hand at={[b[0] + Math.cos(dir) * 14, b[1] + Math.sin(dir) * 14]} dir={dir} shape={def.hand} r={28} />
    </g>
  );
};

export const Professor: React.FC<CharacterProps> = ({
  expression = 'neutral',
  pose = 'idle',
  talking = false,
  seed = 2,
  look,
  style,
  width = 600,
}) => {
  const frame = useCurrentFrame();
  const id = useSvgId('pr');
  const breathe = Math.sin((frame + seed * 13) / 26) * 4;
  const headTilt = Math.sin((frame + seed * 11) / 45) * 1.3 + (talking ? Math.sin(frame / 7) * 1 : 0);
  const hairWobble = Math.sin((frame + seed) / 12) * 1.2;
  const blink = isBlinking(frame, seed + 3) && expression !== 'chibi';
  const open = mouthOpenAmount(frame, talking);
  const arms = ARMS[pose];
  const eyeLook = look ?? (expression === 'thinking' ? {x: -6, y: -7} : {x: 0, y: 0});
  const glint = ((frame + seed * 20) % 120) / 120; // glasses shine sweep

  const face = 'M 190 232 C 188 322, 234 397, 300 414 C 366 397, 412 322, 410 232 C 410 152, 365 110, 300 110 C 235 110, 190 152, 190 232 Z';

  return (
    <svg viewBox="0 0 600 1000" width={width} height={(width * 1000) / 600} style={{overflow: 'visible', ...style}}>
      <defs>
        <clipPath id={`${id}-face`}>
          <path d={face} />
        </clipPath>
        <clipPath id={`${id}-lensL`}>
          <circle cx={252} cy={290} r={44} />
        </clipPath>
        <clipPath id={`${id}-lensR`}>
          <circle cx={348} cy={290} r={44} />
        </clipPath>
      </defs>
      <g transform={`translate(0, ${breathe * 0.5})`}>
        {/* Wild hair (back) */}
        <g transform={`rotate(${headTilt * 0.6 + hairWobble} 300 300)`}>
          <path
            d="M 186 300 L 132 282 L 156 246 L 104 226 L 150 196 L 110 150 L 176 146 L 162 88 L 228 108 L 250 50 L 298 92 L 346 44 L 368 104 L 436 74 L 428 140 L 494 146 L 450 192 L 498 222 L 446 248 L 470 284 L 414 300 Z"
            fill={COLORS.profHair}
            stroke={O}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path d="M 186 300 L 132 282 L 156 246 L 200 262 L 400 262 L 446 248 L 470 284 L 414 300 Z" fill={COLORS.profHairShadow} />
        </g>

        {/* Neck */}
        <rect x={274} y={380} width={52} height={90} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
        <path d="M 276 400 Q 300 440 324 400 L 324 468 L 276 468 Z" fill={COLORS.skinShadow} />

        {/* Lab coat */}
        <g transform={`translate(0, ${breathe})`}>
          <path d="M 140 545 C 150 490, 205 466, 262 456 L 338 456 C 395 466, 450 490, 460 545 L 482 1000 L 118 1000 Z" fill={COLORS.labCoat} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M 400 478 C 440 495, 456 515, 460 545 L 482 1000 L 410 1000 C 420 800, 428 620, 400 478 Z" fill={COLORS.labCoatShadow} />
          {/* shirt + tie */}
          <path d="M 262 456 L 300 690 L 338 456 Z" fill={COLORS.profShirt} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M 262 456 L 290 470 L 278 505 Z" fill="#fff" stroke={O} strokeWidth={3} strokeLinejoin="round" />
          <path d="M 338 456 L 310 470 L 322 505 Z" fill="#fff" stroke={O} strokeWidth={3} strokeLinejoin="round" />
          <path d="M 290 470 L 310 470 L 307 492 L 293 492 Z" fill={COLORS.profTie} stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M 293 492 L 307 492 L 318 620 L 300 648 L 282 620 Z" fill={COLORS.profTie} stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
          <path d="M 300 492 L 307 492 L 318 620 L 300 648 Z" fill={COLORS.profTieShadow} />
          {/* lapels */}
          <path d="M 262 456 L 212 474 L 244 572 L 300 700 Z" fill={COLORS.labCoat} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M 338 456 L 388 474 L 356 572 L 300 700 Z" fill={COLORS.labCoatShadow} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          {/* chest pocket with pens */}
          <rect x={176} y={596} width={16} height={60} rx={4} fill={COLORS.accentPink} stroke={O} strokeWidth={3} />
          <rect x={198} y={586} width={16} height={70} rx={4} fill={COLORS.accentCyan} stroke={O} strokeWidth={3} />
          <path d="M 162 630 L 236 630 L 232 690 L 166 690 Z" fill={COLORS.labCoat} stroke={O} strokeWidth={4} strokeLinejoin="round" />
        </g>

        {/* Head */}
        <g transform={`rotate(${headTilt} 300 400)`}>
          <ellipse cx={188} cy={296} rx={15} ry={24} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
          <ellipse cx={412} cy={296} rx={15} ry={24} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
          <path d={face} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
          <g clipPath={`url(#${id}-face)`}>
            <path d="M 180 150 L 184 246 L 214 236 L 238 190 L 262 226 L 290 182 L 318 228 L 346 186 L 372 236 L 392 204 L 416 250 L 420 150 Z" fill={COLORS.skinShadow} />
            <path d="M 190 300 C 205 365, 250 404, 300 414 L 300 430 L 180 430 Z" fill={COLORS.skinShadow} opacity={0.6} />
          </g>

          <Eye id={`${id}-el`} cx={252} cy={292} w={25} h={27} expression={expression} blink={blink} iris={COLORS.profEye} irisDark="#3d1f99" look={eyeLook} />
          <Eye id={`${id}-er`} cx={348} cy={292} w={25} h={27} flip expression={expression} blink={blink} iris={COLORS.profEye} irisDark="#3d1f99" look={eyeLook} />
          <path d="M 306 300 L 294 340 L 309 342" fill="none" stroke={O} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
          <Mouth x={300} y={372} expression={expression} open={open} scale={0.95} />
          {/* goatee */}
          <path d="M 282 400 Q 300 450 318 400 Q 300 412 282 400 Z" fill={COLORS.profHair} stroke={O} strokeWidth={4} strokeLinejoin="round" />

          {/* Round glasses */}
          <g>
            {[252, 348].map((cx, i) => (
              <g key={cx}>
                <circle cx={cx} cy={290} r={44} fill="rgba(190,230,255,0.22)" />
                <g clipPath={`url(#${id}-lens${i === 0 ? 'L' : 'R'})`}>
                  <rect x={cx - 120 + glint * 240} y={220} width={16} height={160} fill="#fff" opacity={0.7} transform={`rotate(25 ${cx} 290)`} />
                </g>
                <circle cx={cx} cy={290} r={44} fill="none" stroke={COLORS.glassFrame} strokeWidth={7} />
              </g>
            ))}
            <path d="M 296 284 Q 300 276 304 284" fill="none" stroke={COLORS.glassFrame} strokeWidth={6} />
            <path d="M 208 284 L 190 278" stroke={COLORS.glassFrame} strokeWidth={6} strokeLinecap="round" />
            <path d="M 392 284 L 410 278" stroke={COLORS.glassFrame} strokeWidth={6} strokeLinecap="round" />
          </g>

          {/* Front hair tufts */}
          <path d="M 184 236 C 176 128, 250 94, 310 98 C 382 102, 424 150, 416 236 L 392 190 L 372 222 L 346 172 L 318 214 L 290 168 L 262 212 L 238 176 L 214 222 Z" fill={COLORS.profHair} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M 190 214 L 214 222 L 238 176 L 262 212 L 290 168 L 318 214 L 346 172 L 372 222 L 392 190 L 412 220 L 408 196 L 392 166 L 372 198 L 346 148 L 318 190 L 290 144 L 262 188 L 238 152 L 214 198 L 194 192 Z" fill={COLORS.profHairShadow} />
          <path d="M 226 136 Q 300 108 374 136" fill="none" stroke="#ffffff" strokeWidth={8} strokeLinecap="round" />

          <Brow cx={252} cy={292} w={34} h={34} expression={expression} color={COLORS.profHair} thickness={12} />
          <Brow cx={348} cy={292} w={34} h={34} flip alt expression={expression} color={COLORS.profHair} thickness={12} />
        </g>

        <g transform={`translate(0, ${breathe})`}>
          <Arm def={arms.left} />
          <Arm def={arms.right} />
        </g>
      </g>
    </svg>
  );
};
