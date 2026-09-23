// Scene 9: montage of real-life refraction examples.
import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Pip} from '../characters/Pip';
import {Sfx} from '../components/Sound';
import {sparklePath} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const O = COLORS.outline;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

// ── Illustrations (540 × 360) ──────────────────────────────────────────────
const PoolArt: React.FC<{t: number}> = ({t}) => {
  const surf = 110;
  const real = 320;
  // ray from floor point R to surface point S, refracting away from the normal (n = 1.33)
  const R = {x: 330, y: real};
  const S = {x: 400, y: surf};
  const thW = Math.atan((S.x - R.x) / (R.y - S.y));
  const thA = Math.asin(1.33 * Math.sin(thW));
  const E = {x: S.x + Math.tan(thA) * surf, y: 0};
  // traced straight back, the floor seems to be at this depth
  const looks = surf + (S.x - R.x) / Math.tan(thA);
  const Ap = {x: R.x, y: looks};
  const show = clamp01(t / 30);
  return (
    <svg width={540} height={360}>
      <rect width={540} height={360} fill="#bfe9ff" />
      <rect x={0} y={surf} width={540} height={250} fill={COLORS.water} />
      {Array.from({length: 9}, (_, i) => (
        <rect key={i} x={20 + i * 58} y={real} width={54} height={40} fill="#e8f7ff" stroke="#7cc3e8" strokeWidth={3} />
      ))}
      <path d={`M 0 ${surf} q 30 ${-8 + Math.sin(t / 6) * 4} 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0 t 60 0`} fill="none" stroke="#fff" strokeWidth={5} />
      {/* apparent bottom */}
      <g opacity={show}>
        <line x1={146} y1={looks} x2={540} y2={looks} stroke={COLORS.highlight} strokeWidth={5} strokeDasharray="14 10" />
        <line x1={70} y1={surf + 6} x2={70} y2={real - 6} stroke={COLORS.accentPink} strokeWidth={6} />
        <path d={`M 58 ${real - 20} L 70 ${real - 4} L 82 ${real - 20}`} fill="none" stroke={COLORS.accentPink} strokeWidth={6} />
        <line x1={130} y1={surf + 6} x2={130} y2={looks - 6} stroke={COLORS.highlight} strokeWidth={6} />
        <path d={`M 118 ${looks - 20} L 130 ${looks - 4} L 142 ${looks - 20}`} fill="none" stroke={COLORS.highlight} strokeWidth={6} />
        <text x={40} y={surf + 110} fontFamily={FONTS.body} fontWeight={900} fontSize={24} fill="#fff" stroke={O} strokeWidth={4} paintOrder="stroke" transform={`rotate(-90 40 ${surf + 110})`}>
          real
        </text>
        <text x={146} y={looks - 12} fontFamily={FONTS.body} fontWeight={900} fontSize={26} fill="#fff" stroke={O} strokeWidth={4} paintOrder="stroke">
          looks this deep!
        </text>
      </g>
      {/* ray from the floor to an eye above */}
      <g opacity={clamp01((t - 10) / 20)}>
        <polyline points={`${R.x},${R.y} ${S.x},${S.y} ${E.x},${E.y}`} fill="none" stroke={COLORS.ray} strokeWidth={7} strokeLinejoin="round" />
        <line x1={S.x} y1={S.y} x2={Ap.x} y2={Ap.y} stroke={COLORS.highlight} strokeWidth={4} strokeDasharray="8 8" />
      </g>
    </svg>
  );
};

const LensArt: React.FC<{t: number}> = ({t}) => {
  const fx = 450;
  const fy = 190;
  const lx = 250;
  const draw = clamp01(t / 36);
  return (
    <svg width={540} height={360}>
      <rect width={540} height={360} fill="#fff7e0" />
      {/* spectacles icon */}
      <g transform="translate(30 30) scale(0.9)" stroke={O} strokeWidth={6} fill="rgba(160,220,255,0.5)">
        <circle cx={40} cy={30} r={26} />
        <circle cx={112} cy={30} r={26} />
        <path d="M 66 28 Q 76 18 86 28" fill="none" />
      </g>
      {[120, 190, 260].map((y, i) => {
        const x1 = 20 + (lx - 20) * clamp01(draw * 2);
        const p2 = clamp01(draw * 2 - 1);
        return (
          <g key={i}>
            <line x1={20} y1={y} x2={x1} y2={y} stroke="#ff8a1f" strokeWidth={6} />
            {p2 > 0 && <line x1={lx} y1={y} x2={lx + (fx - lx) * p2} y2={y + (fy - y) * p2} stroke="#ff8a1f" strokeWidth={6} />}
          </g>
        );
      })}
      <path d={`M ${lx} 80 Q ${lx + 44} 190 ${lx} 300 Q ${lx - 44} 190 ${lx} 80 Z`} fill="rgba(160,220,255,0.75)" stroke={O} strokeWidth={6} />
      <path d={`M ${lx - 8} 110 Q ${lx + 10} 150 ${lx - 4} 200`} fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" />
      {draw >= 1 && (
        <g>
          <circle cx={fx} cy={fy} r={16 + Math.sin(t / 3) * 4} fill={COLORS.highlight} stroke={O} strokeWidth={4} />
          <path d={sparklePath(fx, fy, 38 + Math.sin(t / 3) * 6)} fill="#fff" opacity={0.7} />
        </g>
      )}
      {/* magnifier */}
      <g transform={`translate(430 300) rotate(${Math.sin(t / 10) * 6})`}>
        <line x1={0} y1={0} x2={50} y2={40} stroke="#8a5a33" strokeWidth={16} strokeLinecap="round" />
        <circle cx={-24} cy={-24} r={34} fill="rgba(160,220,255,0.6)" stroke={O} strokeWidth={6} />
        <text x={-38} y={-13} fontFamily={FONTS.display} fontSize={30} fill={O}>
          Aa
        </text>
      </g>
    </svg>
  );
};

const StarsArt: React.FC<{t: number}> = ({t}) => (
  <svg width={540} height={360}>
    <defs>
      <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0f0a2e" />
        <stop offset="1" stopColor="#3b2d7a" />
      </linearGradient>
    </defs>
    <rect width={540} height={360} fill="url(#night)" />
    {/* shifting layers of air */}
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M -60 ${150 + i * 50} q 60 ${-20 + Math.sin(t / 8 + i) * 10} 120 0 t 120 0 t 120 0 t 120 0 t 120 0`}
        transform={`translate(${((t * (1 + i * 0.5)) % 120) - 60} 0)`}
        fill="none"
        stroke="#9fd8ff"
        strokeWidth={14}
        opacity={0.2}
      />
    ))}
    {Array.from({length: 12}, (_, i) => {
      const x = 30 + random(`st${i}x`) * 480;
      const y = 20 + random(`st${i}y`) * 140;
      const tw = 0.5 + 0.5 * Math.sin(t / (2 + random(`st${i}s`) * 3) + i);
      return <path key={i} d={sparklePath(x, y, 6 + tw * 14)} fill="#fff6b0" opacity={0.5 + tw * 0.5} />;
    })}
    {/* wobbly starlight reaching the ground */}
    <polyline
      points={Array.from({length: 9}, (_, k) => `${420 - k * 14 + Math.sin(t / 3 + k) * 6 * (k > 2 ? 1 : 0)},${60 + k * 30}`).join(' ')}
      fill="none"
      stroke={COLORS.ray}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    <path d="M 0 330 Q 120 280 250 320 Q 380 290 540 320 L 540 360 L 0 360 Z" fill="#26204f" stroke={O} strokeWidth={4} />
    <rect x={80} y={292} width={40} height={40} fill="#3d3370" stroke={O} strokeWidth={3} />
    <rect x={92} y={304} width={14} height={14} fill="#ffe14d" />
  </svg>
);

const ARTS = [PoolArt, LensArt, StarsArt];

export const Examples: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const starts = ['ex_1', 'ex_2', 'ex_3'].map((id) => c.at(id));
  const active = starts.filter((s) => frame >= s - 4).length - 1;

  return (
    <AbsoluteFill style={{background: '#ffe9f3', overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          background: `repeating-linear-gradient(135deg, #ffd6e8 0 40px, #ffe9f3 40px 80px)`,
          backgroundPosition: `${frame * 2}px 0`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 26,
          width: '100%',
          textAlign: 'center',
          fontFamily: FONTS.display,
          fontSize: 76,
          color: COLORS.accentPink,
          WebkitTextStroke: `4px ${O}`,
          paintOrder: 'stroke fill',
          letterSpacing: 4,
        }}
      >
        Refraction in real life!
      </div>
      {ONSCREEN.examples.map((ex, i) => {
        const t = frame - starts[i];
        const enter = spring({frame: t, fps, config: {damping: 13, stiffness: 150}});
        if (t < -2) return null;
        const Art = ARTS[i];
        const isActive = i === active;
        const x = 70 + i * 605;
        return (
          <div
            key={ex.title}
            style={{
              position: 'absolute',
              left: x,
              top: 140,
              width: 570,
              transform: `translateY(${(1 - enter) * 700}px) rotate(${(1 - enter) * 10 + (i - 1) * 1.2}deg) scale(${isActive ? 1.03 : 0.97})`,
              background: '#fff',
              border: `6px solid ${O}`,
              borderRadius: 24,
              boxShadow: isActive ? `0 0 0 8px ${COLORS.highlight}, 14px 14px 0 ${O}` : `10px 10px 0 ${O}`,
              overflow: 'hidden',
              opacity: isActive ? 1 : 0.85,
            }}
          >
            <div style={{borderBottom: `5px solid ${O}`, lineHeight: 0}}>
              <Art t={Math.max(0, t)} />
            </div>
            <div style={{padding: '14px 22px 20px'}}>
              <div style={{fontFamily: FONTS.display, fontSize: 50, color: COLORS.accentPurple, letterSpacing: 2}}>
                {i + 1}. {ex.title}
              </div>
              <div style={{fontFamily: FONTS.body, fontWeight: 800, fontSize: 30, lineHeight: 1.2, color: O, marginTop: 4}}>{ex.caption}</div>
            </div>
          </div>
        );
      })}
      <Pip mood="happy" size={140} seed={6} style={{position: 'absolute', left: interpolate(frame, [0, scene.durationInFrames], [1650, 1720]), top: 10}} />
      {starts.map((s, i) => (
        <Sfx key={i} name="whoosh" at={s} volume={0.4} />
      ))}
    </AbsoluteFill>
  );
};
