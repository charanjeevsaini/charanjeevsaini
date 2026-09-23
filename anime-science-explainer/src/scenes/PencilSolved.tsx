// Scene 7: why the pencil looks broken — ray from the underwater tip to the eye.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BOARD, LessonLayout} from '../components/LessonLayout';
import {Pencil} from '../components/Props';
import {Sfx} from '../components/Sound';
import {Sparkles} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const O = COLORS.outline;
const DEG = Math.PI / 180;
const N_WATER = 1.33;
const SURFACE = 330;
const E = {x: 250, y: 90}; // eraser end (above water)
const T = {x: 470, y: 610}; // real tip (under water)
const C = {x: E.x + ((T.x - E.x) * (SURFACE - E.y)) / (T.y - E.y), y: SURFACE}; // where pencil meets the surface
// Ray from the tip: 30° from the normal in water, refracts AWAY from the normal into air
const TH_W = 30 * DEG;
const TH_A = Math.asin(N_WATER * Math.sin(TH_W));
const S = {x: T.x + Math.tan(TH_W) * (T.y - SURFACE), y: SURFACE};
const EYE = {x: S.x + Math.sin(TH_A) * 320, y: S.y - Math.cos(TH_A) * 320};
// Eyes trace the ray straight back: the tip seems to be directly above T, but higher
const A = {x: T.x, y: SURFACE + (S.x - T.x) / Math.tan(TH_A)};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const lerp = (p: {x: number; y: number}, q: {x: number; y: number}, t: number) => ({x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t});

const Label: React.FC<{x: number; y: number; text: string; bg: string; s: number}> = ({x, y, text, bg, s}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      transform: `translate(-50%, -50%) scale(${s})`,
      background: bg,
      color: '#fff',
      fontFamily: FONTS.body,
      fontWeight: 900,
      fontSize: 30,
      padding: '5px 16px',
      borderRadius: 14,
      border: '4px solid #fff',
      whiteSpace: 'nowrap',
      opacity: Math.min(1, s * 1.5),
    }}
  >
    {text}
  </div>
);

export const PencilSolved: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const [a1, a2, a3] = [c.at('pen_1'), c.at('pen_2'), c.at('pen_3')];
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 170}});

  const r1 = clamp01((frame - a1 - 40) / 22);
  const r2 = clamp01((frame - a1 - 64) / 22);
  const back = clamp01((frame - a2 - 8) / 26);
  const apparent = clamp01((frame - a2 - 30) / 14);
  const ghost = 1 - apparent * 0.7;
  const illusion = pop(a3 + 8);
  const glow = {filter: `drop-shadow(0 0 10px ${COLORS.rayGlow})`};
  const p1 = lerp(T, S, r1);
  const p2 = lerp(S, EYE, r2);
  const pb = lerp(S, A, back);
  // apparent pencil lies along A → C, extended upward (clipped at the surface)
  const up = {x: A.x + (C.x - A.x) * 2.2, y: A.y + (C.y - A.y) * 2.2};
  const blink = (frame + 20) % 90 < 4;

  return (
    <LessonLayout
      c={c}
      hikariListen={{expression: frame > a2 + 40 ? 'surprised' : 'thinking', pose: 'idle'}}
      pip={frame > a3 ? 'power' : 'happy'}
      overlay={
        <>
          {frame > a3 && <Sparkles x={BOARD.x + 560} y={BOARD.y + 450} w={420} h={220} count={12} size={34} seed="illusion" start={a3} color="#fff6b0" />}
          <Sfx name="whoosh" at={a1 + 40} volume={0.4} />
          <Sfx name="whoosh" at={a2 + 8} volume={0.4} />
          <Sfx name="sparkle" at={a3 + 8} />
        </>
      }
    >
      <div style={{position: 'absolute', inset: 7, borderRadius: 20, overflow: 'hidden'}}>
        <svg width={BOARD.w - 14} height={BOARD.h - 14}>
          <defs>
            <clipPath id="pen-above">
              <rect x={0} y={0} width={1000} height={SURFACE} />
            </clipPath>
            <clipPath id="pen-below">
              <rect x={0} y={SURFACE} width={1000} height={500} />
            </clipPath>
          </defs>
          {/* glass tank */}
          <rect x={110} y={SURFACE} width={590} height={370} fill={COLORS.waterMedium} opacity={0.7} />
          <path d={`M 110 ${SURFACE} q 37 ${-8 + Math.sin(frame / 8) * 4} 74 0 t 74 0 t 74 0 t 74 0 t 74 0 t 74 0 t 74 0 t 74 0`} fill="none" stroke="#fff" strokeWidth={5} />
          <path d="M 110 150 L 110 700 L 700 700 L 700 150" fill="none" stroke="#dff4ff" strokeWidth={8} strokeLinejoin="round" />
          {/* pencil: above water is always real */}
          <g clipPath="url(#pen-above)">
            <Pencil x1={E.x} y1={E.y} x2={T.x} y2={T.y} width={34} />
          </g>
          {/* real underwater part: solid, then a ghost outline once we see the "apparent" one */}
          <g clipPath="url(#pen-below)">
            <g opacity={ghost}>
              <Pencil x1={E.x} y1={E.y} x2={T.x} y2={T.y} width={34} dashed={apparent > 0.5} />
            </g>
            {apparent > 0 && (
              <g opacity={apparent}>
                <Pencil x1={up.x} y1={up.y} x2={A.x} y2={A.y} width={34} />
              </g>
            )}
          </g>
          {/* normal at the exit point */}
          {r1 >= 1 && <line x1={S.x} y1={SURFACE - 150} x2={S.x} y2={SURFACE + 150} stroke="#fff" strokeWidth={4} strokeDasharray="12 10" />}
          {/* back-extension our brain assumes */}
          {back > 0 && <line x1={S.x} y1={S.y} x2={pb.x} y2={pb.y} stroke={COLORS.highlight} strokeWidth={5} strokeDasharray="14 10" />}
          <g style={glow}>
            {r1 > 0 && <line x1={T.x} y1={T.y} x2={p1.x} y2={p1.y} stroke={COLORS.ray} strokeWidth={10} strokeLinecap="round" />}
            {r2 > 0 && <line x1={S.x} y1={S.y} x2={p2.x} y2={p2.y} stroke={COLORS.ray} strokeWidth={10} strokeLinecap="round" />}
          </g>
          {r1 > 0.6 && <path d="M -15 -13 L 13 0 L -15 13 Z" transform={`translate(${(T.x + S.x) / 2} ${(T.y + S.y) / 2}) rotate(${(Math.atan2(S.y - T.y, S.x - T.x) * 180) / Math.PI})`} fill={COLORS.ray} stroke={O} strokeWidth={3} />}
          {r2 > 0.6 && <path d="M -15 -13 L 13 0 L -15 13 Z" transform={`translate(${(S.x + EYE.x) / 2} ${(S.y + EYE.y) / 2}) rotate(${(Math.atan2(EYE.y - S.y, EYE.x - S.x) * 180) / Math.PI})`} fill={COLORS.ray} stroke={O} strokeWidth={3} />}
          {/* the eye */}
          <g transform={`translate(${EYE.x + 30} ${EYE.y - 22})`}>
            <path d="M -48 0 Q 0 -38 48 0 Q 0 38 -48 0 Z" fill="#fff" stroke={O} strokeWidth={5} />
            {blink ? <line x1={-44} y1={0} x2={44} y2={0} stroke={O} strokeWidth={6} /> : <circle cx={-14} cy={6} r={17} fill={COLORS.hikariEye} stroke={O} strokeWidth={4} />}
            {!blink && <circle cx={-14} cy={6} r={7} fill={O} />}
            <path d="M -50 -4 Q 0 -46 50 -4" fill="none" stroke={O} strokeWidth={8} strokeLinecap="round" />
          </g>
        </svg>
        <Label x={EYE.x + 60} y={EYE.y + 55} text={ONSCREEN.pencil.eye} bg={COLORS.accentPurple} s={pop(a1 + 64)} />
        <Label x={250} y={A.y + 80} text={ONSCREEN.pencil.apparent} bg="#1f9d55" s={pop(a2 + 42)} />
        <Label x={T.x + 150} y={T.y + 40} text={ONSCREEN.pencil.real} bg={COLORS.accentPink} s={pop(a2 + 52)} />
        {illusion > 0.01 && (
          <div
            style={{
              position: 'absolute',
              left: 800,
              top: 610,
              transform: `translate(-50%, -50%) scale(${illusion}) rotate(-12deg)`,
              fontFamily: FONTS.display,
              fontSize: 76,
              color: COLORS.highlight,
              WebkitTextStroke: `5px ${O}`,
              paintOrder: 'stroke fill',
              textShadow: `6px 6px 0 ${COLORS.accentPink}`,
            }}
          >
            ILLUSION!
          </div>
        )}
      </div>
    </LessonLayout>
  );
};
