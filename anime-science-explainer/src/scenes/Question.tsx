// Scene 3: Hikari asks why; Professor Kōsei sparkles in and names the concept.
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Hikari} from '../characters/Hikari';
import {Professor} from '../characters/Professor';
import {Pip} from '../characters/Pip';
import {Classroom} from '../components/Backgrounds';
import {WaterGlass} from '../components/Props';
import {RichText} from '../components/RichText';
import {Sfx} from '../components/Sound';
import {ExclamationPop, ImpactFlash, QuestionMarks, Sparkles, SweatDrop} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

export const DefinitionCard: React.FC<{enter: number; x: number; y: number; w: number}> = ({enter, x, y, w}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      transform: `scale(${enter}) rotate(${(1 - enter) * 6 - 1.5}deg)`,
      opacity: Math.min(1, enter * 1.5),
      background: '#fffdf2',
      border: `6px solid ${COLORS.outline}`,
      borderRadius: 24,
      boxShadow: `12px 12px 0 ${COLORS.outline}`,
      padding: '18px 34px 24px',
    }}
  >
    <div
      style={{
        fontFamily: FONTS.display,
        fontSize: 76,
        color: COLORS.accentPink,
        WebkitTextStroke: `3px ${COLORS.outline}`,
        paintOrder: 'stroke fill',
        letterSpacing: 4,
      }}
    >
      {ONSCREEN.definitionCard.heading}
    </div>
    <div style={{fontFamily: FONTS.body, fontWeight: 800, fontSize: 42, lineHeight: 1.25, color: COLORS.outline}}>
      <RichText text={ONSCREEN.definitionCard.body} highlight={COLORS.accentPurple} />
    </div>
  </div>
);

export const Question: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const profAt = c.at('q_2') - 8;
  const defAt = c.at('q_3') + 6;
  const thinkAt = c.at('q_4');

  const profIn = spring({frame: frame - profAt, fps, config: {damping: 12, stiffness: 150}});
  const card = spring({frame: frame - defAt, fps, config: {damping: 11, stiffness: 150}});
  // pencil: pulled out (straight!) during q_1, dropped back in when the card appears
  const lifted = spring({frame: frame - 2, fps, config: {damping: 14}}) * (1 - spring({frame: frame - defAt, fps, config: {damping: 12}}));
  const drop = 1 - lifted;

  // While the Professor talks, Hikari listens (surprised, then happy).
  const listening = frame >= profAt && frame < thinkAt - 4;
  const hExpr = listening ? (frame < defAt ? 'surprised' : 'happy') : c.stateOf(frame, 'hikari', 'expression', 'chibi');
  const hPose = listening ? 'idle' : c.stateOf(frame, 'hikari', 'pose', 'cheer');
  const pExpr = c.stateOf(frame, 'professor', 'expression', 'happy');
  const pPose = c.stateOf(frame, 'professor', 'pose', 'point');

  return (
    <AbsoluteFill>
      <Classroom pan={0.12} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <rect x={700} y={800} width={520} height={30} fill={COLORS.desk} stroke={COLORS.outline} strokeWidth={6} />
        <rect x={720} y={830} width={480} height={260} fill={COLORS.deskShadow} stroke={COLORS.outline} strokeWidth={6} />
        <WaterGlass x={840} y={480} scale={1} drop={drop} bent={drop} id="q-glass" />
      </svg>
      <Hikari
        expression={hExpr}
        pose={hPose}
        talking={c.talking(frame, 'hikari')}
        width={600}
        seed={1}
        look={frame >= profAt && frame < thinkAt ? {x: 14, y: 0} : undefined}
        style={{position: 'absolute', left: 50, top: 250}}
      />
      <Pip
        mood={frame < profAt ? 'surprised' : 'happy'}
        size={150}
        seed={2}
        style={{position: 'absolute', left: 560, top: 380}}
      />
      <div style={{position: 'absolute', left: 1260 + (1 - profIn) * 800, top: 230}}>
        <Professor expression={pExpr} pose={pPose} talking={c.talking(frame, 'professor')} width={620} seed={2} look={{x: -8, y: 0}} />
      </div>
      {frame < profAt + 80 && <Sparkles x={1250} y={180} w={620} h={600} count={16} size={40} seed="prof-in" start={profAt} color="#fff6b0" />}
      <ImpactFlash at={profAt + 4} duration={8} color="#fff6b0" />

      {frame >= defAt - 2 && <DefinitionCard enter={card} x={470} y={50} w={980} />}

      {/* comedy */}
      <SweatDrop x={470} y={300} at={6} size={64} until={profAt} />
      <ExclamationPop x={520} y={250} at={8} text="?!" size={140} until={profAt} />
      <QuestionMarks x={130} y={250} at={thinkAt + 6} />
      <div
        style={{
          position: 'absolute',
          left: 1100,
          top: 470,
          fontFamily: FONTS.display,
          fontSize: 60,
          color: '#fff',
          WebkitTextStroke: `3px ${COLORS.outline}`,
          paintOrder: 'stroke fill',
          opacity: interpolate(frame, [10, 18, profAt - 10, profAt], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
          transform: 'rotate(8deg)',
        }}
      >
        straight?!
      </div>
      <Sfx name="sparkle" at={profAt} />
      <Sfx name="pop" at={defAt} />
      <Sfx name="pop" at={thinkAt + 6} />
    </AbsoluteFill>
  );
};
