// Scene 6 (explanation step 3): the normal, and which way light bends.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BOARD, LessonLayout} from '../components/LessonLayout';
import {Sfx} from '../components/Sound';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const O = COLORS.outline;
const DEG = Math.PI / 180;
const SURFACE_Y = 380;
const N_WATER = 1.33;
const ANGLE_AIR = 50 * DEG;
const ANGLE_WATER = Math.asin(Math.sin(ANGLE_AIR) / N_WATER); // ≈ 35°, Snell's law
const L = 280;

type Pt = {x: number; y: number};
const add = (a: Pt, ang: number, len: number, up: boolean, left: boolean): Pt => ({
  x: a.x + (left ? -1 : 1) * Math.sin(ang) * len,
  y: a.y + (up ? -1 : 1) * Math.cos(ang) * len,
});

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const Arrowhead: React.FC<{from: Pt; to: Pt; t: number}> = ({from, to, t}) => {
  if (t < 0.55) return null;
  const x = from.x + (to.x - from.x) * 0.55;
  const y = from.y + (to.y - from.y) * 0.55;
  const a = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  return <path d="M -16 -14 L 14 0 L -16 14 Z" transform={`translate(${x} ${y}) rotate(${a})`} fill={COLORS.ray} stroke={O} strokeWidth={3} />;
};

/** A ray drawn progressively from a → o → b, with a photon that slows in water. */
const BentRay: React.FC<{a: Pt; o: Pt; b: Pt; start: number; straight: Pt; aInWater: boolean}> = ({a, o, b, start, straight, aInWater}) => {
  const frame = useCurrentFrame();
  const t1 = clamp01((frame - start) / 24);
  const t2 = clamp01((frame - start - 24) / 24);
  const t3 = clamp01((frame - start - 50) / 16);
  const p1 = {x: a.x + (o.x - a.x) * t1, y: a.y + (o.y - a.y) * t1};
  const p2 = {x: o.x + (b.x - o.x) * t2, y: o.y + (b.y - o.y) * t2};
  const glow = {filter: `drop-shadow(0 0 10px ${COLORS.rayGlow})`};
  // photon loop: faster in air (1), slower in water (0.75)
  const photonT = frame - start - 50;
  let photon: Pt | null = null;
  if (photonT > 0) {
    const vAir = 9;
    const vWater = vAir / N_WATER;
    const v1 = aInWater ? vWater : vAir;
    const v2 = aInWater ? vAir : vWater;
    const d1 = L / v1;
    const d2 = L / v2;
    const cyc = photonT % (d1 + d2 + 10);
    if (cyc < d1) photon = {x: a.x + ((o.x - a.x) * cyc) / d1, y: a.y + ((o.y - a.y) * cyc) / d1};
    else if (cyc < d1 + d2) photon = {x: o.x + ((b.x - o.x) * (cyc - d1)) / d2, y: o.y + ((b.y - o.y) * (cyc - d1)) / d2};
  }
  return (
    <g>
      {t3 > 0 && (
        <line x1={o.x} y1={o.y} x2={o.x + (straight.x - o.x) * t3} y2={o.y + (straight.y - o.y) * t3} stroke="#fff" strokeWidth={4} strokeDasharray="6 10" opacity={0.6} />
      )}
      <g style={glow}>
        {t1 > 0 && <line x1={a.x} y1={a.y} x2={p1.x} y2={p1.y} stroke={COLORS.ray} strokeWidth={12} strokeLinecap="round" />}
        {t2 > 0 && <line x1={o.x} y1={o.y} x2={p2.x} y2={p2.y} stroke={COLORS.ray} strokeWidth={12} strokeLinecap="round" />}
      </g>
      <Arrowhead from={a} to={o} t={t1} />
      <Arrowhead from={o} to={b} t={t2} />
      {photon && <circle cx={photon.x} cy={photon.y} r={13} fill="#fff" stroke={COLORS.ray} strokeWidth={6} />}
    </g>
  );
};

const Arc: React.FC<{o: Pt; r: number; from: number; to: number; color: string; show: number}> = ({o, r, from, to, color, show}) => {
  if (show <= 0) return null;
  const p = (a: number) => `${o.x + Math.cos(a) * r} ${o.y + Math.sin(a) * r}`;
  const sweep = to > from ? 1 : 0;
  return <path d={`M ${p(from)} A ${r} ${r} 0 0 ${sweep} ${p(to)}`} fill="none" stroke={color} strokeWidth={6} opacity={show} strokeLinecap="round" />;
};

const Pill: React.FC<{text: string; bg: string; s: number; style: React.CSSProperties}> = ({text, bg, s, style}) => (
  <div
    style={{
      position: 'absolute',
      background: bg,
      color: '#fff',
      fontFamily: FONTS.body,
      fontWeight: 900,
      fontSize: 28,
      padding: '5px 16px',
      borderRadius: 14,
      border: '4px solid #fff',
      whiteSpace: 'nowrap',
      transform: `translateX(-50%) scale(${s})`,
      opacity: Math.min(1, s * 1.5),
      ...style,
    }}
  >
    {text}
  </div>
);

export const NormalRule: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const [a1, a2, a3, e3] = [c.at('norm_1'), c.at('norm_2'), c.at('norm_3'), c.end('norm_3')];
  const pop = (at: number) => spring({frame: frame - at, fps, config: {damping: 11, stiffness: 170}});

  const O1 = {x: 270, y: SURFACE_Y};
  const O2 = {x: 730, y: SURFACE_Y};
  // left: air → water (bends towards the normal)
  const A1 = add(O1, ANGLE_AIR, L, true, true);
  const B1 = add(O1, ANGLE_WATER, L, false, false);
  const S1 = add(O1, ANGLE_AIR, 230, false, false);
  // right: water → air (bends away from the normal)
  const A2 = add(O2, ANGLE_WATER, L, false, true);
  const B2 = add(O2, ANGLE_AIR, L, true, false);
  const S2 = add(O2, ANGLE_WATER, 230, true, false);

  const normalDraw = clamp01((frame - a1 - 8) / 24);
  const ray1 = a2 + 4;
  const ray2 = a3 + 4;
  const towards = pop(c.end('norm_2') - 34);
  const away = pop(e3 - 34);
  const straight = pop(e3 + 6);
  const captionsFade = interpolate(frame, [e3 + 2, e3 + 8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <LessonLayout
      c={c}
      hikariListen={{expression: frame > ray1 + 40 ? 'happy' : 'thinking', pose: 'idle'}}
      pip={frame > e3 ? 'power' : 'happy'}
      overlay={
        <>
          <Sfx name="whoosh" at={ray1} volume={0.4} />
          <Sfx name="whoosh" at={ray2} volume={0.4} />
          <Sfx name="pop" at={a1 + 30} />
        </>
      }
    >
      <div style={{position: 'absolute', inset: 7, borderRadius: 20, overflow: 'hidden'}}>
        <svg width={BOARD.w - 14} height={BOARD.h - 14}>
          <rect x={0} y={0} width={1000} height={SURFACE_Y} fill="#1d4466" />
          <rect x={0} y={SURFACE_Y} width={1000} height={400} fill={COLORS.waterMedium} opacity={0.75} />
          {Array.from({length: 6}, (_, i) => (
            <path
              key={i}
              d={`M ${-50 + ((i * 190 + frame * 1.2) % 1100)} ${SURFACE_Y + 60 + (i % 3) * 90} q 25 -12 50 0 t 50 0`}
              fill="none"
              stroke="#bfe8ff"
              strokeWidth={4}
              opacity={0.45}
            />
          ))}
          <line x1={0} y1={SURFACE_Y} x2={1000} y2={SURFACE_Y} stroke="#fff" strokeWidth={6} />
          {[O1, O2].map((o, i) => (
            <g key={i}>
              <line x1={o.x} y1={110} x2={o.x} y2={110 + 540 * normalDraw} stroke="#fff" strokeWidth={5} strokeDasharray="16 12" />
              {normalDraw >= 1 && <path d={`M ${o.x} ${o.y - 30} L ${o.x + 30} ${o.y - 30} L ${o.x + 30} ${o.y}`} fill="none" stroke={COLORS.highlight} strokeWidth={4} />}
            </g>
          ))}
          <g opacity={captionsFade * 0.6 + 0.4}>
            <BentRay a={A1} o={O1} b={B1} start={ray1} straight={S1} aInWater={false} />
            <Arc o={O1} r={78} from={-90 * DEG} to={-90 * DEG - ANGLE_AIR} color={COLORS.accentCyan} show={clamp01((frame - ray1 - 20) / 10)} />
            <Arc o={O1} r={78} from={90 * DEG} to={90 * DEG - ANGLE_WATER} color={COLORS.accentPink} show={clamp01((frame - ray1 - 46) / 10)} />
          </g>
          <g opacity={captionsFade * 0.6 + 0.4}>
            <BentRay a={A2} o={O2} b={B2} start={ray2} straight={S2} aInWater />
            <Arc o={O2} r={78} from={90 * DEG} to={90 * DEG + ANGLE_WATER} color={COLORS.accentPink} show={clamp01((frame - ray2 - 20) / 10)} />
            <Arc o={O2} r={78} from={-90 * DEG} to={-90 * DEG + ANGLE_AIR} color={COLORS.accentCyan} show={clamp01((frame - ray2 - 46) / 10)} />
          </g>
          {/* along the normal: goes straight, no bending */}
          {straight > 0.01 && (
            <g opacity={straight}>
              <line x1={500} y1={150} x2={500} y2={620} stroke={COLORS.highlight} strokeWidth={12} strokeLinecap="round" style={{filter: `drop-shadow(0 0 10px ${COLORS.rayGlow})`}} />
              <path d="M -16 -14 L 14 0 L -16 14 Z" transform="translate(500 270) rotate(90)" fill={COLORS.ray} stroke={O} strokeWidth={3} />
              <path d="M -16 -14 L 14 0 L -16 14 Z" transform="translate(500 520) rotate(90)" fill={COLORS.ray} stroke={O} strokeWidth={3} />
            </g>
          )}
        </svg>
        <Pill text={ONSCREEN.normalRule.air} bg="#2a6fb0" s={1} style={{left: '50%', top: 16}} />
        <div style={{opacity: 1 - straight}}>
          <Pill text={ONSCREEN.normalRule.water} bg="#1a5d9a" s={1} style={{left: '50%', top: SURFACE_Y + 16}} />
        </div>
        <Pill text={ONSCREEN.normalRule.normal} bg={COLORS.accentPurple} s={pop(a1 + 30)} style={{left: 135, top: 110}} />
        <div style={{opacity: captionsFade}}>
          <Pill text={ONSCREEN.normalRule.towards} bg="#1f9d55" s={towards} style={{left: 250, top: 660}} />
          <Pill text={ONSCREEN.normalRule.away} bg={COLORS.accentPink} s={away} style={{left: 750, top: 660}} />
        </div>
        <Pill text={ONSCREEN.normalRule.straight} bg="#b26b00" s={straight} style={{left: '50%', top: 660}} />
      </div>
    </LessonLayout>
  );
};
