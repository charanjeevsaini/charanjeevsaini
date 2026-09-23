// Scene 8: the key rule revealed like a special attack.
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Hikari} from '../characters/Hikari';
import {Pip} from '../characters/Pip';
import {Sfx} from '../components/Sound';
import {GlowText, ImpactFlash, RadialBurst, ScreenShake, Sparkles, SpeedLines} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const O = COLORS.outline;
const DEG = Math.PI / 180;

/** Tiny ray diagram: ray travels downward from `topFast` medium into the other one. */
const MiniRay: React.FC<{topFast: boolean; draw: number}> = ({topFast, draw}) => {
  const a1 = (topFast ? 50 : 35) * DEG;
  const a2 = (topFast ? 35 : 50) * DEG;
  const o = {x: 110, y: 100};
  const L = 95;
  const A = {x: o.x - Math.sin(a1) * L, y: o.y - Math.cos(a1) * L};
  const B = {x: o.x + Math.sin(a2) * L, y: o.y + Math.cos(a2) * L};
  const t1 = Math.min(1, draw * 2);
  const t2 = Math.max(0, draw * 2 - 1);
  return (
    <svg width={220} height={200}>
      <rect x={0} y={0} width={220} height={100} fill={topFast ? '#cdeeff' : COLORS.waterMedium} />
      <rect x={0} y={100} width={220} height={100} fill={topFast ? COLORS.waterMedium : '#cdeeff'} />
      <line x1={110} y1={8} x2={110} y2={192} stroke={O} strokeWidth={4} strokeDasharray="10 8" />
      <line x1={A.x} y1={A.y} x2={A.x + (o.x - A.x) * t1} y2={A.y + (o.y - A.y) * t1} stroke="#ff8a1f" strokeWidth={9} strokeLinecap="round" />
      {t2 > 0 && <line x1={o.x} y1={o.y} x2={o.x + (B.x - o.x) * t2} y2={o.y + (B.y - o.y) * t2} stroke="#ff8a1f" strokeWidth={9} strokeLinecap="round" />}
      <rect x={2} y={2} width={216} height={196} fill="none" stroke={O} strokeWidth={5} />
    </svg>
  );
};

const RuleCard: React.FC<{left: string; right: string; color: string; enter: number; topFast: boolean; draw: number; y: number}> = ({left, right, color, enter, topFast, draw, y}) => (
  <div
    style={{
      position: 'absolute',
      left: 800,
      top: y,
      width: 1040,
      height: 240,
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      padding: '0 28px',
      background: 'rgba(15,10,46,0.9)',
      border: `6px solid ${color}`,
      borderRadius: 26,
      boxShadow: `0 0 30px ${color}, 12px 12px 0 ${O}`,
      transform: `translateX(${(1 - enter) * 1200}px) skewX(${(1 - enter) * -20}deg)`,
    }}
  >
    <MiniRay topFast={topFast} draw={draw} />
    <div>
      <GlowText size={92} color={color} glow={color}>
        {left}
      </GlowText>
      <div style={{fontFamily: FONTS.body, fontWeight: 900, fontSize: 50, color: '#fff', marginTop: 6}}>{right}</div>
    </div>
  </div>
);

export const PowerUp: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const activate = c.end('pow_1') - 14;
  const [r1, r2] = [c.at('pow_2'), c.at('pow_3')];
  const slide = (at: number) => spring({frame: frame - at, fps, config: {damping: 14, stiffness: 170}});
  const banner = spring({frame: frame - activate, fps, config: {damping: 8, stiffness: 200}});
  const draw = (at: number) => interpolate(frame, [at + 8, at + 38], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hk = spring({frame, fps, config: {damping: 14}});
  const aura = 0.7 + 0.3 * Math.sin(frame / 3);
  const state = c.current(frame);

  return (
    <ScreenShake
      shakes={[
        {at: activate, duration: 16, intensity: 28},
        {at: r1, duration: 10, intensity: 14},
        {at: r2, duration: 10, intensity: 14},
      ]}
    >
      <RadialBurst rays={30} speed={1.4} />
      <SpeedLines inner={460} color="#fff" opacity={0.55} seed="pow" cx={420} cy={560} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <defs>
          <radialGradient id="aura">
            <stop offset="0" stopColor="#fff" stopOpacity={0.95} />
            <stop offset="0.5" stopColor={COLORS.accentCyan} stopOpacity={0.6} />
            <stop offset="1" stopColor={COLORS.accentCyan} stopOpacity={0} />
          </radialGradient>
        </defs>
        <ellipse cx={400} cy={560} rx={420 * aura} ry={520 * aura} fill="url(#aura)" />
      </svg>
      <Hikari
        expression={state?.expression ?? 'determined'}
        pose={state?.pose ?? 'cheer'}
        talking={c.talking(frame, 'hikari')}
        width={760}
        seed={1}
        style={{position: 'absolute', left: 20, top: 150 + (1 - hk) * 500}}
      />
      <Pip mood="power" size={200} seed={5} style={{position: 'absolute', left: 560, top: 110}} />
      <div style={{position: 'absolute', left: 820, top: 80, transform: `scale(${banner}) rotate(${-4 + (1 - banner) * 20}deg)`, transformOrigin: 'left center'}}>
        {frame >= activate && (
          <GlowText size={132} color="#ffffff" glow={COLORS.accentPink}>
            {ONSCREEN.powerUp.banner}
          </GlowText>
        )}
      </div>
      {frame >= r1 - 2 && (
        <RuleCard left={ONSCREEN.powerUp.rule1Left} right={ONSCREEN.powerUp.rule1Right} color={COLORS.accentCyan} enter={slide(r1)} topFast draw={draw(r1)} y={290} />
      )}
      {frame >= r2 - 2 && (
        <RuleCard left={ONSCREEN.powerUp.rule2Left} right={ONSCREEN.powerUp.rule2Right} color={COLORS.accentPink} enter={slide(r2)} topFast={false} draw={draw(r2)} y={560} />
      )}
      <Sparkles x={0} y={0} w={760} h={820} count={18} size={36} seed="pow" color="#fff" />
      <ImpactFlash at={activate} duration={10} invert />
      <ImpactFlash at={r1} duration={5} />
      <ImpactFlash at={r2} duration={5} />
      <AbsoluteFill style={{background: '#fff', opacity: interpolate(frame, [0, 6], [0.9, 0], {extrapolateRight: 'clamp'})}} />
      <Sfx name="powerup" at={0} />
      <Sfx name="impact" at={activate} />
      <Sfx name="impact" at={r1} volume={0.5} />
      <Sfx name="impact" at={r2} volume={0.5} />
    </ScreenShake>
  );
};
