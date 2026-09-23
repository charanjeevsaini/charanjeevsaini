// Scene 2: anime episode title card.
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Hikari} from '../characters/Hikari';
import {Pip} from '../characters/Pip';
import {Sfx} from '../components/Sound';
import {GlowText, ImpactFlash, RadialBurst, ScreenShake, Sparkles, SpeedLines} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

export const TitleCard: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const slam = 6;
  const titleAt = c.at('title_1');
  const ep = spring({frame: frame - slam, fps, config: {damping: 12, stiffness: 260}});
  const title = spring({frame: frame - titleAt, fps, config: {damping: 9, stiffness: 160}});
  const sub = spring({frame: frame - titleAt - 14, fps, config: {damping: 14}});
  const hk = spring({frame: frame - 2, fps, config: {damping: 14, stiffness: 120}});
  // decorative bending light ray drawn progressively
  const ray = interpolate(frame, [0, 40], [0, 1], {extrapolateRight: 'clamp'});
  const pipX = interpolate(frame, [0, scene.durationInFrames], [-200, 2000]);

  return (
    <ScreenShake shakes={[{at: slam, duration: 10, intensity: 18}]}>
      <RadialBurst a="#4f7bff" b="#2a1a7a" rays={32} speed={0.8} />
      <SpeedLines inner={420} color="#b9d4ff" opacity={0.5} seed="title" />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <rect x={0} y={720} width={1920} height={360} fill={COLORS.waterMedium} opacity={0.45} />
        <line x1={0} y1={720} x2={1920} y2={720} stroke="#fff" strokeWidth={6} opacity={0.7} />
        <path
          d="M 0 80 L 860 720 L 1180 1080"
          fill="none"
          stroke={COLORS.ray}
          strokeWidth={26}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - ray}
          style={{filter: `drop-shadow(0 0 18px ${COLORS.rayGlow})`}}
        />
      </svg>
      <Hikari
        expression="determined"
        pose="cheer"
        talking={c.talking(frame, 'hikari')}
        width={720}
        style={{position: 'absolute', left: 1280, top: 120 + (1 - hk) * 600}}
      />
      <AbsoluteFill style={{padding: '110px 0 0 140px'}}>
        <div
          style={{
            fontFamily: FONTS.display,
            fontSize: 64,
            color: COLORS.highlight,
            letterSpacing: 6,
            WebkitTextStroke: `4px ${COLORS.outline}`,
            paintOrder: 'stroke fill',
            opacity: ep,
            transform: `translateX(${(1 - ep) * -300}px)`,
          }}
        >
          ★ {ONSCREEN.seriesName}
        </div>
        <div
          style={{
            marginTop: 10,
            display: 'inline-block',
            alignSelf: 'flex-start',
            background: COLORS.accentPink,
            padding: '6px 36px',
            border: `6px solid ${COLORS.outline}`,
            transform: `scale(${interpolate(ep, [0, 1], [3, 1])}) rotate(-4deg)`,
            opacity: Math.min(1, ep * 2),
            transformOrigin: 'left center',
          }}
        >
          <span style={{fontFamily: FONTS.display, fontSize: 110, color: '#fff', WebkitTextStroke: `4px ${COLORS.outline}`, paintOrder: 'stroke fill', letterSpacing: 6}}>
            {ONSCREEN.episodeNumber}
          </span>
        </div>
        <div style={{marginTop: 40, transform: `scale(${title}) rotate(${(1 - title) * -8}deg)`, transformOrigin: 'left center'}}>
          <GlowText size={170} glow={COLORS.accentCyan}>
            {ONSCREEN.episodeTitle}
          </GlowText>
        </div>
        <div
          style={{
            marginTop: 26,
            fontFamily: FONTS.body,
            fontWeight: 900,
            fontSize: 48,
            color: '#fff',
            background: 'rgba(15,10,46,0.75)',
            alignSelf: 'flex-start',
            padding: '8px 28px',
            borderRadius: 16,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 40}px)`,
          }}
        >
          {ONSCREEN.episodeSubtitle}
        </div>
      </AbsoluteFill>
      <Pip mood="power" size={170} style={{position: 'absolute', left: pipX, top: 760 + Math.sin(frame / 6) * 30}} />
      <Sparkles count={20} size={34} seed="title" color="#fff6b0" />
      <ImpactFlash at={titleAt} duration={6} />
      <Sfx name="impact" at={slam} />
      <Sfx name="sparkle" at={titleAt} />
    </ScreenShake>
  );
};
