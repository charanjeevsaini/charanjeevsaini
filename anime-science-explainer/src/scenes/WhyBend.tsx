// Scene 5 (explanation step 2): WHY slowing down makes light bend — the toy-car analogy.
import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BOARD, LessonLayout} from '../components/LessonLayout';
import {Sfx} from '../components/Sound';
import {ExclamationPop, Sparkles} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const O = COLORS.outline;
const P = {x: 430, y: 400}; // where the car's path meets the carpet edge
const DEG = Math.PI / 180;
const PHI1 = 40 * DEG; // angle from the normal on the fast floor
const PHI2 = Math.asin(0.75 * Math.sin(PHI1)); // slower on carpet → turns towards the normal
const CAR_SCALE = 1.3;
const WHEEL_AXLE = 40 * CAR_SCALE;
const HALF_TRACK = 48 * CAR_SCALE;

// heading changes while the front axle straddles the edge (lower wheel hits first)
const S_B = -(WHEEL_AXLE + HALF_TRACK * Math.tan(PHI1));
const S_A = -(WHEEL_AXLE - HALF_TRACK * Math.tan(PHI1));
const heading = (s: number) => {
  const t = Math.min(1, Math.max(0, (s - S_B) / (S_A - S_B)));
  const e = t * t * (3 - 2 * t);
  return PHI1 + (PHI2 - PHI1) * e;
};
const posAt = (s: number) => {
  // integrate the direction of travel from the edge point P
  const step = s >= 0 ? 4 : -4;
  let x = P.x;
  let y = P.y;
  for (let u = 0; Math.abs(u) < Math.abs(s); u += step) {
    const h = heading(u + step / 2);
    const ds = Math.abs(s - u) < Math.abs(step) ? s - u : step;
    x += Math.sin(h) * ds;
    y += Math.cos(h) * ds;
  }
  return {x, y};
};

const ToyCar: React.FC<{x: number; y: number; phi: number; slowGlow: number}> = ({x, y, phi, slowGlow}) => (
  <g transform={`translate(${x} ${y}) rotate(${-phi / DEG}) scale(${CAR_SCALE})`}>
    {/* wheels: local -x front wheel is the "slow" one */}
    {[
      [-48, 40, true],
      [48, 40, false],
      [-48, -40, false],
      [48, -40, false],
    ].map(([wx, wy, slow], i) => (
      <g key={i}>
        {slow && slowGlow > 0 && <circle cx={wx as number} cy={wy as number} r={34} fill={COLORS.accentPink} opacity={0.5 * slowGlow} />}
        <rect x={(wx as number) - 10} y={(wy as number) - 18} width={20} height={36} rx={6} fill="#2b2b3a" stroke={O} strokeWidth={3} />
      </g>
    ))}
    <rect x={-40} y={-66} width={80} height={132} rx={26} fill={COLORS.accentCyan} stroke={O} strokeWidth={5} />
    <rect x={-40} y={-66} width={20} height={132} rx={10} fill="#1aa9c4" />
    <rect x={-26} y={4} width={52} height={32} rx={10} fill="#d9f6ff" stroke={O} strokeWidth={4} />
    <rect x={-6} y={-60} width={12} height={120} fill="#fff" opacity={0.8} />
    <circle cx={-24} cy={58} r={6} fill={COLORS.highlight} stroke={O} strokeWidth={2} />
    <circle cx={24} cy={58} r={6} fill={COLORS.highlight} stroke={O} strokeWidth={2} />
  </g>
);

const Tag: React.FC<{x: number; y: number; text: string; color: string; s: number}> = ({x, y, text, color, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-135} y={-35} width={270} height={66} rx={18} fill={color} stroke="#fff" strokeWidth={4} />
    <text x={0} y={12} textAnchor="middle" fontFamily={FONTS.body} fontWeight={900} fontSize={37} fill="#fff">
      {text}
    </text>
  </g>
);

export const WhyBend: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const [a2, e2, a3, e3, a4, e4] = [c.at('why_2'), c.end('why_2'), c.at('why_3'), c.end('why_3'), c.at('why_4'), c.end('why_4')];
  const moveEnd = a4 + Math.round((e4 - a4) * 0.55);
  const s = interpolate(frame, [a2, e2 + 4, a3 + 10, e3, a4, moveEnd], [-560, -110, -110, 6, 6, 330], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  });
  const pos = posAt(s);
  const phi = heading(s);
  const tagsIn = spring({frame: frame - a3 - 20, fps, config: {damping: 10}});
  const tagsOut = interpolate(frame, [a4 + 20, a4 + 30], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rayAt = moveEnd - 10;
  const ray = interpolate(frame, [rayAt, rayAt + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const surfaces = spring({frame: frame - 4, fps, config: {damping: 14}});

  // front wheel world positions (for labels)
  const d = {x: Math.sin(phi), y: Math.cos(phi)};
  const perp = {x: Math.cos(phi), y: -Math.sin(phi)};
  const F = {x: pos.x + d.x * WHEEL_AXLE, y: pos.y + d.y * WHEEL_AXLE};
  const slowW = {x: F.x - perp.x * HALF_TRACK, y: F.y - perp.y * HALF_TRACK};
  const fastW = {x: F.x + perp.x * HALF_TRACK, y: F.y + perp.y * HALF_TRACK};

  // trail of the path so far
  const trail: string[] = [];
  for (let u = -560; u <= s; u += 12) {
    const p = posAt(u);
    trail.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }

  const inc = {x: P.x - Math.sin(PHI1) * 620, y: P.y - Math.cos(PHI1) * 620};
  const ref = {x: P.x + Math.sin(PHI2) * 420, y: P.y + Math.cos(PHI2) * 420};

  return (
    <LessonLayout
      c={c}
      hikariListen={{expression: frame > a3 + 20 ? 'surprised' : 'thinking', pose: 'idle'}}
      pip={frame > c.at('why_5') ? 'power' : 'happy'}
      overlay={
        <>
          {frame >= c.at('why_5') && <Sparkles x={170} y={170} w={260} h={170} count={8} size={30} seed="why5" start={c.at('why_5')} />}
          <ExclamationPop x={330} y={380} at={c.at('why_5') + 4} text="!" size={130} until={c.end('why_5') + 10} />
          <Sfx name="whoosh" at={a2} volume={0.4} />
          <Sfx name="pop" at={a3 + 20} />
          <Sfx name="sparkle" at={rayAt} />
        </>
      }
    >
      <div style={{position: 'absolute', inset: 7, borderRadius: 20, overflow: 'hidden'}}>
        <svg width={BOARD.w - 14} height={BOARD.h - 14} style={{opacity: surfaces}}>
          <defs>
            <pattern id="carpet" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="#c93a55" />
              <circle cx="6" cy="6" r="3" fill="#a82640" />
              <circle cx="18" cy="18" r="3" fill="#e0577a" />
            </pattern>
          </defs>
          <rect x={0} y={0} width={1000} height={P.y} fill="#f0cf9f" />
          {Array.from({length: 7}, (_, i) => (
            <line key={i} x1={0} y1={30 + i * 60} x2={1000} y2={30 + i * 60} stroke="#d4ab73" strokeWidth={4} />
          ))}
          <rect x={0} y={P.y} width={1000} height={400} fill="url(#carpet)" />
          <line x1={0} y1={P.y} x2={1000} y2={P.y} stroke={O} strokeWidth={6} />
          <polyline points={trail.join(' ')} fill="none" stroke="#fff" strokeWidth={6} strokeDasharray="4 14" strokeLinecap="round" opacity={0.9} />
          {/* the light ray follows the same bent path */}
          {ray > 0 && (
            <g style={{filter: `drop-shadow(0 0 12px ${COLORS.rayGlow})`}}>
              <path
                d={`M ${inc.x} ${inc.y} L ${P.x} ${P.y} L ${ref.x} ${ref.y}`}
                fill="none"
                stroke={COLORS.ray}
                strokeWidth={16}
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - ray}
              />
            </g>
          )}
          <ToyCar x={pos.x} y={pos.y} phi={phi} slowGlow={frame > a3 + 10 ? tagsIn : 0} />
          {tagsIn > 0.01 && tagsOut > 0 && (
            <g opacity={tagsOut}>
              <line x1={slowW.x} y1={slowW.y} x2={slowW.x - 150} y2={slowW.y + 70} stroke="#fff" strokeWidth={4} />
              <Tag x={slowW.x - 225} y={slowW.y + 100} text={ONSCREEN.whyBend.slowWheel} color={COLORS.accentPink} s={tagsIn} />
              <line x1={fastW.x} y1={fastW.y} x2={fastW.x + 170} y2={fastW.y - 40} stroke="#fff" strokeWidth={4} />
              <Tag x={fastW.x + 290} y={fastW.y - 50} text={ONSCREEN.whyBend.fastWheel} color={COLORS.accentPurple} s={tagsIn} />
            </g>
          )}
          {ray > 0.6 && (
            <text x={ref.x + 30} y={ref.y - 110} fontFamily={FONTS.display} fontSize={54} fill={COLORS.highlight} stroke={O} strokeWidth={3} paintOrder="stroke" opacity={(ray - 0.6) / 0.4}>
              Light bends too!
            </text>
          )}
        </svg>
        <div style={{position: 'absolute', left: 24, top: 18, ...labelStyle('#8a5a33')}}>{ONSCREEN.whyBend.floor}</div>
        <div style={{position: 'absolute', left: 24, bottom: 20, ...labelStyle('#7a1832')}}>{ONSCREEN.whyBend.carpet}</div>
      </div>
    </LessonLayout>
  );
};

const labelStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  fontFamily: FONTS.body,
  fontWeight: 900,
  fontSize: 38,
  padding: '6px 20px',
  borderRadius: 14,
  border: '4px solid #fff',
});
