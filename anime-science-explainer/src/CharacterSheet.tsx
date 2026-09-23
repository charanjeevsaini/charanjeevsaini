// Dev-only composition: every character in every expression and pose.
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Hikari} from './characters/Hikari';
import {Professor} from './characters/Professor';
import {Pip} from './characters/Pip';
import type {Expression, Pose} from './script';
import {FONTS} from './theme';

const EXPRESSIONS: Expression[] = ['neutral', 'surprised', 'happy', 'thinking', 'determined', 'chibi'];
const POSES: Pose[] = ['idle', 'point', 'cheer', 'think', 'present'];

export const CharacterSheet: React.FC<{who: 'hikari' | 'professor'; mode: 'expressions' | 'poses'}> = ({who, mode}) => {
  const C = who === 'hikari' ? Hikari : Professor;
  const items = mode === 'expressions' ? EXPRESSIONS : POSES;
  return (
    <AbsoluteFill style={{background: '#dfe9ff', flexDirection: 'row', flexWrap: 'wrap', padding: 20}}>
      {items.map((it, i) => (
        <div key={it} style={{width: 300, height: 520, position: 'relative', overflow: 'hidden', border: '2px solid #99a'}}>
          <C
            width={300}
            expression={mode === 'expressions' ? (it as Expression) : 'happy'}
            pose={mode === 'poses' ? (it as Pose) : 'idle'}
            talking={i % 2 === 1}
            seed={i}
          />
          <div style={{position: 'absolute', bottom: 4, left: 8, fontFamily: FONTS.body, fontWeight: 900, fontSize: 28}}>{it}</div>
        </div>
      ))}
      {who === 'hikari' && (
        <div style={{display: 'flex', gap: 20}}>
          <Pip mood="happy" size={200} />
          <Pip mood="surprised" size={200} />
          <Pip mood="power" size={200} />
        </div>
      )}
    </AbsoluteFill>
  );
};
