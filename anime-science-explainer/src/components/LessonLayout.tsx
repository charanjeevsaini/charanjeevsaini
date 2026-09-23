// Shared layout for explanation scenes: diagram board centre, Hikari left, Professor right.
import React from 'react';
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Hikari} from '../characters/Hikari';
import {Professor} from '../characters/Professor';
import {Pip, PipMood} from '../characters/Pip';
import type {Expression, Pose, Speaker} from '../script';
import type {Cues} from '../timeline';
import {Board, Classroom} from './Backgrounds';

export const BOARD = {x: 330, y: 50, w: 1010, h: 760};

type Listen = {expression: Expression; pose: Pose};

/** Expression/pose for `who`: their own line's state while (last) speaking, else a listening state. */
export const useCharacterState = (c: Cues, who: Speaker, listen: Listen) => {
  const frame = useCurrentFrame();
  const cur = c.current(frame);
  if (cur && cur.speaker === who) {
    return {expression: cur.expression ?? 'neutral', pose: cur.pose ?? 'idle', talking: c.talking(frame, who)};
  }
  return {...listen, talking: false};
};

export const LessonLayout: React.FC<{
  c: Cues;
  hikariListen?: Listen;
  profListen?: Listen;
  hikariOverride?: Partial<Listen>;
  pip?: PipMood | null;
  boardEnterAt?: number;
  children: React.ReactNode; // board contents (absolute, board-local coordinates)
  overlay?: React.ReactNode; // screen-space overlays
}> = ({c, hikariListen = {expression: 'neutral', pose: 'idle'}, profListen = {expression: 'happy', pose: 'idle'}, hikariOverride, pip = 'happy', boardEnterAt = 0, children, overlay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const h = useCharacterState(c, 'hikari', hikariListen);
  const p = useCharacterState(c, 'professor', profListen);
  const enter = spring({frame: frame - boardEnterAt, fps, config: {damping: 13, stiffness: 140}});
  return (
    <AbsoluteFill>
      <Classroom pan={0.08} dim={0.25} showBoard={false} />
      <Board x={BOARD.x} y={BOARD.y} w={BOARD.w} h={BOARD.h} enter={enter}>
        {children}
      </Board>
      <Hikari {...h} {...hikariOverride} width={500} seed={1} look={{x: 10, y: -2}} style={{position: 'absolute', left: -80, top: 330}} />
      <Professor {...p} width={590} seed={2} look={{x: -8, y: 0}} style={{position: 'absolute', left: 1330, top: 250}} />
      {pip && <Pip mood={pip} size={130} seed={3} style={{position: 'absolute', left: 215, top: 250}} />}
      {overlay}
    </AbsoluteFill>
  );
};
