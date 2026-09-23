// Scene 4 (explanation step 1): light travels at different speeds in different materials.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BOARD, LessonLayout} from '../components/LessonLayout';
import {RichText} from '../components/RichText';
import {Sfx} from '../components/Sound';
import {ImpactFlash, Sparkles} from '../effects';
import {ONSCREEN} from '../script';
import {COLORS, FONTS} from '../theme';
import {cues, TimedScene} from '../timeline';

const LANE_X = 250;
const LANE_W = 700;
const LANE_COLORS = ['#dff4ff', COLORS.water, '#b8f2e6'];

export const SpeedScene: React.FC<{scene: TimedScene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const c = cues(scene);
  const s3 = c.at('speed_3');
  const laneAppear = [0, 1, 2].map((i) => c.at('speed_1') + 20 + i * 14);
  const raceStart = [c.at('speed_2') + 6, s3 + 4, s3 + Math.round((c.end('speed_3') - s3) * 0.55)];
  const denser = c.at('speed_4') + 10;
  const denserIn = spring({frame: frame - denser, fps, config: {damping: 11}});

  return (
    <LessonLayout
      c={c}
      hikariListen={{expression: frame > raceStart[1] ? 'surprised' : 'neutral', pose: 'idle'}}
      pip={frame > denser ? 'power' : frame > raceStart[0] ? 'surprised' : 'happy'}
      overlay={
        <>
          <ImpactFlash at={denser} duration={6} color="#fff6b0" />
          {frame > denser && frame < denser + 50 && <Sparkles x={BOARD.x + 40} y={BOARD.y + 560} w={900} h={40} count={8} size={24} seed="dense" start={denser} color="#fff6b0" />}
          {raceStart.map((f, i) => (
            <Sfx key={i} name="whoosh" at={f} volume={0.4} />
          ))}
          <Sfx name="pop" at={denser} />
        </>
      }
    >
      <div
        style={{
          position: 'absolute',
          left: 50,
          top: 26,
          fontFamily: FONTS.display,
          fontSize: 72,
          color: COLORS.highlight,
          letterSpacing: 3,
          WebkitTextStroke: `3px ${COLORS.outline}`,
          paintOrder: 'stroke fill',
        }}
      >
        ⚡ {ONSCREEN.speed.heading}
      </div>
      <svg width={BOARD.w} height={BOARD.h} style={{position: 'absolute', left: 0, top: 0}}>
        <defs>
          <radialGradient id="photon">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.4" stopColor={COLORS.ray} />
            <stop offset="1" stopColor={COLORS.ray} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="trail" x1="0" x2="1">
            <stop offset="0" stopColor={COLORS.ray} stopOpacity={0} />
            <stop offset="1" stopColor={COLORS.ray} stopOpacity={0.9} />
          </linearGradient>
        </defs>
        {ONSCREEN.speed.rows.map((row, i) => {
          const y = 190 + i * 150;
          const appear = spring({frame: frame - laneAppear[i], fps, config: {damping: 14}});
          const racing = frame >= raceStart[i];
          const barFill = spring({frame: frame - raceStart[i], fps, config: {damping: 20, stiffness: 60}}) * row.fraction;
          const speed = 16 * row.fraction; // px per frame, proportional to the real speed
          const px = racing ? LANE_X + (((frame - raceStart[i]) * speed) % (LANE_W + 160)) - 80 : LANE_X - 80;
          if (appear < 0.01) return null;
          return (
            <g key={row.label} opacity={appear} transform={`translate(${(1 - appear) * -80} 0)`}>
              <text x={40} y={y + 16} fontFamily={FONTS.body} fontWeight={900} fontSize={46} fill="#fff">
                {row.label}
              </text>
              <rect x={LANE_X} y={y - 34} width={LANE_W} height={68} rx={34} fill={LANE_COLORS[i]} opacity={0.25} stroke="#fff" strokeWidth={4} />
              <rect x={LANE_X} y={y - 34} width={LANE_W * barFill} height={68} rx={34} fill={LANE_COLORS[i]} opacity={0.55} />
              <svg x={LANE_X} y={y - 60} width={LANE_W} height={120} overflow="hidden">
                {racing && (
                  <g transform={`translate(${px - LANE_X} 60)`}>
                    <rect x={-150} y={-9} width={150} height={18} rx={9} fill="url(#trail)" />
                    <circle r={34} fill="url(#photon)" />
                    <circle r={12} fill="#fff" stroke={COLORS.outline} strokeWidth={3} />
                  </g>
                )}
              </svg>
              {racing && (
                <text x={LANE_X + LANE_W} y={y + 82} textAnchor="end" fontFamily={FONTS.body} fontWeight={900} fontSize={38} fill={COLORS.highlight} opacity={Math.min(1, barFill / row.fraction + 0.2)}>
                  {row.value}
                  {i > 0 ? `  (${i === 1 ? '¾' : '⅔'} of air)` : ''}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {frame >= denser - 2 && (
        <div
          style={{
            position: 'absolute',
            left: 30,
            right: 30,
            bottom: 34,
            padding: '14px 24px',
            background: COLORS.accentPurple,
            border: `5px solid #fff`,
            borderRadius: 18,
            fontFamily: FONTS.body,
            fontWeight: 900,
            fontSize: 38,
            color: '#fff',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            transform: `scale(${denserIn})`,
          }}
        >
          <RichText text={ONSCREEN.speed.denserTerm} />
        </div>
      )}
    </LessonLayout>
  );
};
