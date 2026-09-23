// Hikari: energetic, curious 8th-grader. Orange bob, single ahoge, sailor uniform.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {COLORS, OUTLINE_WIDTH} from '../theme';
import type {Expression, Pose} from '../script';
import {Blush, Brow, Eye, Hand, HandShape, isBlinking, Mouth, mouthOpenAmount, P, Tube, useSvgId} from './parts';

export interface CharacterProps {
  expression?: Expression;
  pose?: Pose;
  talking?: boolean;
  /** Offset for idle animation phase so two characters don't move in sync */
  seed?: number;
  look?: {x: number; y: number};
  style?: React.CSSProperties;
  width?: number;
}

const O = COLORS.outline;
const SW = OUTLINE_WIDTH;

type ArmDef = {pts: P[]; hand: HandShape};
const ARMS: Record<Pose, {left: ArmDef; right: ArmDef}> = {
  idle: {
    left: {pts: [[185, 505], [158, 690], [178, 870]], hand: 'fist'},
    right: {pts: [[415, 505], [442, 690], [422, 870]], hand: 'fist'},
  },
  point: {
    left: {pts: [[185, 505], [158, 690], [178, 870]], hand: 'fist'},
    right: {pts: [[415, 505], [512, 425], [556, 292]], hand: 'point'},
  },
  cheer: {
    left: {pts: [[185, 505], [100, 400], [128, 262]], hand: 'fist'},
    right: {pts: [[415, 505], [500, 400], [472, 262]], hand: 'fist'},
  },
  think: {
    left: {pts: [[185, 505], [158, 690], [178, 870]], hand: 'fist'},
    right: {pts: [[415, 505], [468, 668], [352, 428]], hand: 'fist'},
  },
  present: {
    left: {pts: [[185, 505], [158, 690], [178, 870]], hand: 'fist'},
    right: {pts: [[415, 505], [505, 650], [592, 585]], hand: 'open'},
  },
};

const Arm: React.FC<{def: ArmDef}> = ({def}) => {
  const n = def.pts.length;
  const [a, b] = [def.pts[n - 2], def.pts[n - 1]];
  const dir = Math.atan2(b[1] - a[1], b[0] - a[0]);
  return (
    <g>
      <Tube
        points={def.pts}
        width={56}
        fill={COLORS.uniformWhite}
        shadow={COLORS.uniformShadow}
        cuff={{color: COLORS.uniformNavy, shadow: COLORS.uniformNavyShadow, from: 0.72}}
      />
      <Hand at={[b[0] + Math.cos(dir) * 14, b[1] + Math.sin(dir) * 14]} dir={dir} shape={def.hand} />
    </g>
  );
};

export const Hikari: React.FC<CharacterProps> = ({
  expression = 'neutral',
  pose = 'idle',
  talking = false,
  seed = 1,
  look,
  style,
  width = 600,
}) => {
  const frame = useCurrentFrame();
  const id = useSvgId('hk');
  const breathe = Math.sin((frame + seed * 13) / 22) * 4;
  const headTilt = Math.sin((frame + seed * 7) / 40) * 1.5 + (talking ? Math.sin(frame / 6) * 1.2 : 0);
  const ahoge = Math.sin((frame + seed * 5) / 9) * 9;
  const lockSway = Math.sin((frame + seed * 3) / 18) * 2;
  const blink = isBlinking(frame, seed) && expression !== 'chibi';
  const open = mouthOpenAmount(frame, talking);
  const arms = ARMS[pose];
  const eyeLook = look ?? (expression === 'thinking' ? {x: 8, y: -9} : {x: 0, y: 0});

  const face = 'M 172 235 C 170 320, 225 385, 300 402 C 375 385, 430 320, 428 235 C 428 150, 372 105, 300 105 C 228 105, 172 150, 172 235 Z';
  const bangZig = 'L 192 262 L 216 192 L 244 250 L 266 180 L 294 240 L 320 178 L 344 244 L 368 188 L 398 256 L 412 206 L 434 262';

  return (
    <svg viewBox="0 0 600 1000" width={width} height={(width * 1000) / 600} style={{overflow: 'visible', ...style}}>
      <defs>
        <clipPath id={`${id}-face`}>
          <path d={face} />
        </clipPath>
      </defs>
      <g transform={`translate(0, ${breathe * 0.5})`}>
        {/* Back hair */}
        <g transform={`rotate(${headTilt * 0.6} 300 380)`}>
          <path
            d="M 150 260 C 140 110, 225 62, 300 62 C 375 62, 460 110, 450 260 L 458 370 C 452 398, 420 402, 410 382 L 190 382 C 180 402, 148 398, 142 370 Z"
            fill={COLORS.hikariHair}
            stroke={O}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path d="M 190 380 L 410 380 L 404 290 L 196 290 Z" fill={COLORS.hikariHairShadow} />
        </g>

        {/* Neck */}
        <rect x={272} y={360} width={56} height={110} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
        <path d="M 274 388 Q 300 428 326 388 L 326 468 L 274 468 Z" fill={COLORS.skinShadow} />

        {/* Torso: sailor uniform */}
        <g transform={`translate(0, ${breathe})`}>
          <path
            d="M 150 530 C 158 480, 210 455, 268 445 L 332 445 C 390 455, 442 480, 450 530 L 472 1000 L 128 1000 Z"
            fill={COLORS.uniformWhite}
            stroke={O}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path d="M 395 470 C 430 485, 446 505, 450 530 L 472 1000 L 400 1000 C 412 800, 420 620, 395 470 Z" fill={COLORS.uniformShadow} />
          <path
            d="M 176 470 C 215 452, 248 445, 268 445 L 300 585 L 332 445 C 352 445, 385 452, 424 470 L 452 565 L 300 640 L 148 565 Z"
            fill={COLORS.uniformNavy}
            stroke={O}
            strokeWidth={SW}
            strokeLinejoin="round"
          />
          <path d="M 332 445 C 352 445, 385 452, 424 470 L 452 565 L 400 590 L 410 490 Z" fill={COLORS.uniformNavyShadow} />
          <path d="M 162 553 L 300 622 L 438 553" fill="none" stroke="#fff" strokeWidth={7} />
          <path d="M 268 445 L 300 585 L 332 445 Z" fill={COLORS.skin} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M 270 447 L 330 447 L 320 492 Q 300 506 280 492 Z" fill={COLORS.skinShadow} />
          {/* Ribbon */}
          <g transform="translate(300 592)">
            <path d="M -8 18 L -30 78 L -10 70 L 0 22 Z" fill={COLORS.ribbonShadow} stroke={O} strokeWidth={4} strokeLinejoin="round" />
            <path d="M 8 18 L 30 78 L 10 70 L 0 22 Z" fill={COLORS.ribbon} stroke={O} strokeWidth={4} strokeLinejoin="round" />
            <path d="M 0 0 L -54 -26 L -48 30 Z" fill={COLORS.ribbon} stroke={O} strokeWidth={4} strokeLinejoin="round" />
            <path d="M 0 0 L 54 -26 L 48 30 Z" fill={COLORS.ribbon} stroke={O} strokeWidth={4} strokeLinejoin="round" />
            <path d="M 0 0 L 54 -26 L 50 4 Z" fill={COLORS.ribbonShadow} />
            <circle cx={0} cy={2} r={14} fill={COLORS.ribbon} stroke={O} strokeWidth={4} />
          </g>
        </g>

        {/* Head */}
        <g transform={`rotate(${headTilt} 300 390)`}>
          <ellipse cx={170} cy={292} rx={16} ry={25} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
          <ellipse cx={430} cy={292} rx={16} ry={25} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
          <path d={face} fill={COLORS.skin} stroke={O} strokeWidth={SW} />
          {/* hard shadow cast by the bangs */}
          <g clipPath={`url(#${id}-face)`}>
            <path d={`M 160 200 L 170 262 ${bangZig.replace(/(\d+) (\d+)/g, (_, x, y) => `${x} ${+y + 18}`)} L 440 200 Z`} fill={COLORS.skinShadow} />
            <path d="M 172 300 C 190 360, 240 395, 300 402 L 300 420 L 160 420 Z" fill={COLORS.skinShadow} opacity={0.6} />
          </g>

          <Eye id={`${id}-el`} cx={247} cy={290} w={36} h={42} expression={expression} blink={blink} iris={COLORS.hikariEye} irisDark={COLORS.hikariEyeDark} look={eyeLook} />
          <Eye id={`${id}-er`} cx={353} cy={290} w={36} h={42} flip expression={expression} blink={blink} iris={COLORS.hikariEye} irisDark={COLORS.hikariEyeDark} look={eyeLook} />
          <path d="M 303 322 L 297 333 L 304 334" fill="none" stroke={O} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          <Mouth x={300} y={362} expression={expression} open={open} />
          {(expression === 'happy' || expression === 'chibi' || expression === 'surprised') && (
            <>
              <Blush x={222} y={340} strong={expression === 'chibi'} />
              <Blush x={378} y={340} strong={expression === 'chibi'} />
            </>
          )}

          {/* Side locks */}
          <g transform={`rotate(${lockSway} 180 230)`}>
            <path d="M 172 222 C 158 290, 166 352, 194 412 C 198 372, 206 330, 218 258 Z" fill={COLORS.hikariHair} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          </g>
          <g transform={`rotate(${-lockSway} 420 230)`}>
            <path d="M 428 222 C 442 290, 434 352, 406 412 C 402 372, 394 330, 382 258 Z" fill={COLORS.hikariHair} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
            <path d="M 428 222 C 442 290, 434 352, 406 412 C 410 360, 414 300, 405 250 Z" fill={COLORS.hikariHairShadow} />
          </g>
          {/* Ahoge */}
          <g transform={`rotate(${ahoge} 304 92)`}>
            <path d="M 294 94 C 276 48, 318 14, 356 34 C 324 36, 310 58, 314 94 Z" fill={COLORS.hikariHair} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          </g>
          {/* Bangs */}
          <path d={`M 166 262 C 150 150, 220 88, 300 88 C 380 88, 450 150, 434 262 L 412 206 L 398 256 L 368 188 L 344 244 L 320 178 L 294 240 L 266 180 L 244 250 L 216 192 L 192 262 Z`} fill={COLORS.hikariHair} stroke={O} strokeWidth={SW} strokeLinejoin="round" />
          <path d="M 172 236 L 192 262 L 216 192 L 244 250 L 266 180 L 294 240 L 320 178 L 344 244 L 368 188 L 398 256 L 412 206 L 432 250 L 428 224 L 412 178 L 398 226 L 368 160 L 344 216 L 320 150 L 294 212 L 266 152 L 244 222 L 216 164 L 192 232 Z" fill={COLORS.hikariHairShadow} />
          <polyline points="214,140 230,124 247,138 264,120 281,136 300,117 318,135 336,119 352,137 369,123 386,140" fill="none" stroke={COLORS.hikariHairShine} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" />

          <Brow cx={247} cy={290} w={34} h={42} expression={expression} color={COLORS.hikariHairShadow} />
          <Brow cx={353} cy={290} w={34} h={42} flip alt expression={expression} color={COLORS.hikariHairShadow} />
        </g>

        {/* Arms (in front) */}
        <g transform={`translate(0, ${breathe})`}>
          <Arm def={arms.left} />
          <Arm def={arms.right} />
        </g>
      </g>
    </svg>
  );
};
