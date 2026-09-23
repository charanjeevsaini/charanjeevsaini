// Anime-style dialogue box pinned to the bottom of the screen.
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {CHARACTER_NAMES} from '../script';
import {COLORS, FONTS, SPEAKER_COLORS} from '../theme';
import type {TimedLine} from '../timeline';
import {RichText} from './RichText';

export const SUBTITLE_TOP = 842;

export const Subtitle: React.FC<{lines: TimedLine[]}> = ({lines}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // Keep a line up until the next one starts (so it never flickers off mid-gap),
  // but hide it a little after the last line of a scene ends.
  const idx = lines.findIndex((l, i) => frame >= l.start && (i === lines.length - 1 || frame < lines[i + 1].start));
  if (idx < 0) return null;
  const line = lines[idx];
  const isLast = idx === lines.length - 1;
  const hideAt = line.start + line.duration + (isLast ? 14 : 1e9);
  if (frame > hideAt + 6) return null;

  const enter = spring({frame: frame - line.start, fps, config: {damping: 14, stiffness: 220}});
  const firstOfSpeaker = idx === 0 || lines[idx - 1].speaker !== line.speaker;
  const boxIn = idx === 0 ? enter : 1;
  const exit = interpolate(frame, [hideAt, hideAt + 6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const color = SPEAKER_COLORS[line.speaker];

  return (
    <div
      style={{
        position: 'absolute',
        left: 150,
        right: 150,
        top: SUBTITLE_TOP,
        height: 200,
        transform: `translateY(${(1 - boxIn) * 60}px)`,
        opacity: Math.min(boxIn, exit),
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: COLORS.subtitleBg,
          border: `5px solid ${COLORS.subtitleBorder}`,
          borderRadius: 28,
          boxShadow: `0 0 0 5px ${COLORS.outline}, 10px 12px 0 ${COLORS.outline}`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: -34,
          background: color,
          color: '#fff',
          fontFamily: FONTS.display,
          fontSize: 44,
          letterSpacing: 2,
          padding: '2px 26px',
          borderRadius: 14,
          border: `4px solid ${COLORS.outline}`,
          transform: `scale(${firstOfSpeaker ? 0.6 + 0.4 * enter : 1}) rotate(-3deg)`,
          transformOrigin: 'left center',
          WebkitTextStroke: `2px ${COLORS.outline}`,
          paintOrder: 'stroke fill',
        }}
      >
        {CHARACTER_NAMES[line.speaker]}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 48,
          right: 48,
          top: 34,
          bottom: 20,
          display: 'flex',
          alignItems: 'center',
          fontFamily: FONTS.body,
          fontWeight: 800,
          fontSize: 50,
          lineHeight: 1.22,
          color: '#fff',
          opacity: interpolate(frame - line.start, [0, 5], [0, 1], {extrapolateRight: 'clamp'}),
          transform: `translateY(${interpolate(frame - line.start, [0, 6], [10, 0], {extrapolateRight: 'clamp'})}px)`,
        }}
      >
        <span>
          <RichText text={line.text} />
        </span>
      </div>
    </div>
  );
};
