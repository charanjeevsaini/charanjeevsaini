// Scene 10: recap, "full marks", next-episode teaser and end screen.
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Hikari} from '../characters/Hikari';
import {Professor} from '../characters/Professor';
import {Pip} from '../characters/Pip';
import {Classroom} from '../components/Backgrounds';
import {useCharacterState} from '../components/LessonLayout';
import {RichText} from '../components/RichText';
import {Sfx} from '../components/Sound';
import {GlowText, ImpactFlash, RadialBurst, Sparkles, SpeedLines} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const O = COLORS.outline;
const RAINBOW = ['#ff3b3b', '#ff9a1f', '#ffe14d', '#3ddc6b', '#2ea8ff', '#4b4bff', '#9b3dff'];

const PrismTeaser: React.FC<{t: number}> = ({t}) => {
  const beam = Math.min(1, t / 20);
  const fan = Math.min(1, Math.max(0, (t - 16) / 20));
  return (
    <svg width={760} height={420}>
      <line x1={0} y1={250} x2={330 * beam} y2={250 - 40 * beam} stroke="#fff" strokeWidth={14} strokeLinecap="round" style={{filter: 'drop-shadow(0 0 12px #fff)'}} />
      {RAINBOW.map((c, i) => (
        <line key={c} x1={400} y1={220} x2={400 + 340 * fan} y2={220 + (i - 1) * 32 * fan + 20 * fan} stroke={c} strokeWidth={14} strokeLinecap="round" opacity={fan} />
      ))}
      <path d="M 370 60 L 490 300 L 250 300 Z" fill="rgba(200,240,255,0.55)" stroke="#fff" strokeWidth={8} strokeLinejoin="round" />
      <text x={370} y={230} textAnchor="middle" fontFamily={FONTS.display} fontSize={110} fill={COLORS.highlight} stroke={O} strokeWidth={5} paintOrder="stroke">
        ?
      </text>
    </svg>
  );
};

export const Outro: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const [a1, a2, a3, e3] = [c.at('out_1'), c.at('out_2'), c.at('out_3'), c.end('out_3')];
  const pop = (at: number, damping = 11) => spring({frame: frame - at, fps, config: {damping, stiffness: 170}});
  const recap = pop(a1 + 4);
  const stamp = spring({frame: frame - a2 - 6, fps, config: {damping: 9, stiffness: 260}});
  const next = pop(a3 - 4, 14);
  const endAt = e3 + 8;
  const end = pop(endAt, 13);

  const h = useCharacterState(c, 'hikari', {expression: frame > a2 ? 'chibi' : 'happy', pose: frame > a2 ? 'cheer' : 'idle'});
  const p = useCharacterState(c, 'professor', {expression: 'happy', pose: 'idle'});

  return (
    <AbsoluteFill>
      <Classroom pan={0.1} />
      <Hikari {...h} width={640} seed={1} style={{position: 'absolute', left: 170, top: 250}} />
      <Professor {...p} width={600} seed={2} look={{x: -8, y: 0}} style={{position: 'absolute', left: 1240, top: 240}} />
      <Pip mood={frame > a2 ? 'power' : 'happy'} size={150} seed={4} style={{position: 'absolute', left: 870, top: 560}} />

      {/* recap card */}
      <div
        style={{
          position: 'absolute',
          left: 330,
          top: 40,
          width: 1260,
          padding: '26px 40px 30px',
          background: '#fffdf2',
          border: `6px solid ${O}`,
          borderRadius: 26,
          boxShadow: `12px 12px 0 ${O}`,
          transform: `scale(${recap}) rotate(${(1 - recap) * -6}deg)`,
          opacity: Math.min(1, recap * 1.5),
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: -34,
            background: COLORS.accentPink,
            color: '#fff',
            fontFamily: FONTS.display,
            fontSize: 48,
            padding: '0 24px',
            border: `5px solid ${O}`,
            borderRadius: 14,
            transform: 'rotate(-4deg)',
            letterSpacing: 3,
          }}
        >
          RECAP!
        </div>
        <div style={{fontFamily: FONTS.body, fontWeight: 900, fontSize: 52, lineHeight: 1.2, color: O, textAlign: 'center'}}>
          <RichText text={ONSCREEN.recapCard} highlight={COLORS.accentPurple} />
        </div>
        {frame >= a2 && (
          <div
            style={{
              position: 'absolute',
              right: -30,
              bottom: -70,
              transform: `scale(${interpolate(stamp, [0, 1], [3, 1])}) rotate(-14deg)`,
              opacity: Math.min(1, stamp * 2),
              border: `8px solid #e0223f`,
              borderRadius: 18,
              padding: '4px 22px',
              background: 'rgba(255,255,255,0.9)',
              fontFamily: FONTS.display,
              fontSize: 72,
              color: '#e0223f',
              letterSpacing: 3,
            }}
          >
            100% FULL MARKS!
          </div>
        )}
      </div>
      {frame >= a2 && frame < a3 && <Sparkles x={760} y={430} w={420} h={300} count={12} size={34} seed="marks" start={a2} color="#fff6b0" />}
      <ImpactFlash at={a2 + 6} duration={6} />

      {/* next episode teaser */}
      {frame >= a3 - 6 && (
        <AbsoluteFill style={{transform: `translateX(${(1 - next) * 1920}px)`}}>
          <RadialBurst a="#3b2d7a" b="#1a1147" rays={24} speed={0.5} />
          <SpeedLines inner={500} color="#8f7dff" opacity={0.4} seed="next" />
          <div style={{position: 'absolute', left: 120, top: 90}}>
            <div
              style={{
                display: 'inline-block',
                background: COLORS.highlight,
                fontFamily: FONTS.display,
                fontSize: 64,
                color: O,
                padding: '4px 30px',
                border: `6px solid ${O}`,
                transform: 'rotate(-3deg)',
                letterSpacing: 4,
              }}
            >
              {ONSCREEN.nextEpisode.label}
            </div>
            <div style={{marginTop: 40, width: 900}}>
              <GlowText size={104} glow={COLORS.accentPink}>
                {ONSCREEN.nextEpisode.title}
              </GlowText>
            </div>
          </div>
          <div style={{position: 'absolute', left: 1080, top: 180}}>
            <PrismTeaser t={frame - a3} />
          </div>
          <Hikari expression="determined" pose="point" talking={c.talking(frame, 'hikari')} width={420} seed={7} style={{position: 'absolute', left: 1540, top: 430}} />
        </AbsoluteFill>
      )}

      {/* end screen */}
      {frame >= endAt - 2 && (
        <AbsoluteFill style={{opacity: Math.min(1, end * 1.4)}}>
          <AbsoluteFill style={{background: `linear-gradient(160deg, ${COLORS.accentPurple}, ${COLORS.night})`}} />
          <Sparkles count={26} size={30} seed="end" color="#fff6b0" />
          <div style={{position: 'absolute', top: 120, width: '100%', textAlign: 'center', transform: `scale(${end})`}}>
            <GlowText size={150} glow={COLORS.accentCyan}>
              {ONSCREEN.endScreen.thanks}
            </GlowText>
            <div style={{fontFamily: FONTS.display, fontSize: 80, color: COLORS.highlight, marginTop: 20, letterSpacing: 4}}>{ONSCREEN.endScreen.tagline}</div>
          </div>
          <Hikari expression="happy" pose="cheer" width={440} seed={8} style={{position: 'absolute', left: 430, top: 560}} />
          <Pip mood="happy" size={170} seed={9} style={{position: 'absolute', left: 875, top: 620}} />
          <Professor expression="happy" pose="point" width={420} seed={9} style={{position: 'absolute', left: 1060, top: 560}} />
          <div style={{position: 'absolute', top: 420, width: '100%', textAlign: 'center', fontFamily: FONTS.body, fontWeight: 800, fontSize: 30, color: '#d8ccff'}}>
            {ONSCREEN.endScreen.credits}
          </div>
        </AbsoluteFill>
      )}
      <Sfx name="pop" at={a1 + 4} />
      <Sfx name="impact" at={a2 + 6} />
      <Sfx name="whoosh" at={a3 - 4} />
      <Sfx name="sparkle" at={endAt} />
    </AbsoluteFill>
  );
};
