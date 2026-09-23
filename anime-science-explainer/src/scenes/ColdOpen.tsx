// Scene 1: a pencil dropped in water looks "snapped". Hikari freaks out.
import React from 'react';
import {AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig, Easing} from 'remotion';
import {Hikari} from '../characters/Hikari';
import {Classroom} from '../components/Backgrounds';
import {CutIn} from '../components/CutIn';
import {WaterGlass} from '../components/Props';
import {Sfx} from '../components/Sound';
import {ExclamationPop, ImpactFlash, ScreenShake, SpeedLines, SweatDrop} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const GLASS = {x: 1060, y: 390, scale: 1.25};
const GLASS_CENTER = {x: GLASS.x + 120 * GLASS.scale, y: GLASS.y + 150 * GLASS.scale};

export const ColdOpen: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const shock = c.at('cold_2');
  const dropAt = c.at('cold_1') + Math.round((c.end('cold_1') - c.at('cold_1')) * 0.7);

  const drop = spring({frame: frame - dropAt, fps, config: {damping: 11, stiffness: 140}});
  const bent = interpolate(frame, [dropAt + 12, dropAt + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wave = interpolate(frame, [dropAt + 8, dropAt + 50], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const zoom = spring({frame: frame - shock, fps, config: {damping: 16, stiffness: 160}});
  const camScale = 1 + 0.6 * zoom + interpolate(frame, [0, shock], [0, 0.04], {extrapolateRight: 'clamp'});
  const camX = interpolate(zoom, [0, 1], [0, 960 - GLASS_CENTER.x]);
  const camY = interpolate(zoom, [0, 1], [0, 540 - GLASS_CENTER.y + 10]);

  const expression = c.stateOf(frame, 'hikari', 'expression', 'happy');
  const talking = c.talking(frame, 'hikari');
  const snap = spring({frame: frame - shock - 4, fps, config: {damping: 8, stiffness: 200}});

  return (
    <ScreenShake shakes={[{at: shock, duration: 18, intensity: 26}]}>
      <AbsoluteFill style={{transform: `translate(${camX}px, ${camY}px) scale(${camScale})`, transformOrigin: `${GLASS_CENTER.x}px ${GLASS_CENTER.y}px`}}>
        <Classroom pan={0.1} />
        <Hikari
          expression={expression}
          pose="idle"
          talking={talking}
          width={640}
          seed={1}
          look={frame > dropAt - 20 ? {x: 12, y: 6} : undefined}
          style={{position: 'absolute', left: 230, top: 150}}
        />
        {/* desk */}
        <svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
          <rect x={-100} y={770} width={2200} height={40} fill={COLORS.desk} stroke={COLORS.outline} strokeWidth={6} />
          <rect x={-100} y={810} width={2200} height={300} fill={COLORS.deskShadow} stroke={COLORS.outline} strokeWidth={6} />
          <WaterGlass x={GLASS.x} y={GLASS.y} scale={GLASS.scale} drop={drop} bent={bent} wave={wave} id="cold-glass" />
          {/* splash droplets */}
          {frame >= dropAt + 6 &&
            frame < dropAt + 32 &&
            Array.from({length: 8}, (_, i) => {
              const t = frame - dropAt - 6;
              const vx = (random(`sx${i}`) - 0.5) * 16;
              const vy = -10 - random(`sy${i}`) * 8;
              const x = GLASS.x + 150 + vx * t;
              const y = GLASS.y + 160 + vy * t + 0.9 * t * t;
              return <ellipse key={i} cx={x} cy={y} rx={7} ry={10} fill={COLORS.water} stroke={COLORS.outline} strokeWidth={3} />;
            })}
        </svg>
      </AbsoluteFill>

      {frame >= shock && <SpeedLines cx={960} cy={540} inner={380} count={80} color="#ffffff" opacity={0.9 * zoom} seed="cold" />}
      {frame >= shock && (
        <div
          style={{
            position: 'absolute',
            left: 1220,
            top: 120,
            transform: `scale(${snap}) rotate(-10deg)`,
            fontFamily: FONTS.display,
            fontSize: 190,
            color: COLORS.highlight,
            WebkitTextStroke: `10px ${COLORS.outline}`,
            paintOrder: 'stroke fill',
            textShadow: `10px 10px 0 ${COLORS.accentPink}`,
          }}
        >
          {ONSCREEN.coldOpenSfx}
        </div>
      )}
      {/* Hikari reaction cut-in once the camera has zoomed on the glass */}
      <CutIn show={frame >= shock + 6} since={shock + 6} side="left" top={250} color={COLORS.accentPink}>
        <Hikari expression="surprised" talking={talking} width={560} seed={4} style={{position: 'absolute', left: -45, top: -70}} />
      </CutIn>
      <ExclamationPop x={470} y={230} at={shock + 10} text="!!" size={170} />
      <SweatDrop x={400} y={300} at={shock + 16} size={60} />
      <ImpactFlash at={shock} duration={9} invert />
      <Sfx name="splash" at={dropAt + 6} />
      <Sfx name="impact" at={shock} />
      <Sfx name="pop" at={shock + 10} />
      {/* opening vignette */}
      <AbsoluteFill
        style={{
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(15,10,46,0.55) 100%)',
          opacity: interpolate(frame, [0, 20], [1, 0.4], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)}),
        }}
      />
    </ScreenShake>
  );
};
