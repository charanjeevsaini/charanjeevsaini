// Wraps every scene with: voice audio, subtitles, transitions and transition SFX.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import type {TransitionKind} from '../script';
import {TIMING} from '../theme';
import type {TimedScene} from '../timeline';
import {SceneTransition} from '../effects';
import {Subtitle} from './Subtitle';
import {Sfx} from './Sound';

export const SceneShell: React.FC<{
  scene: TimedScene;
  outKind: TransitionKind;
  showSubtitles?: boolean;
  children: React.ReactNode;
}> = ({scene, outKind, showSubtitles = true, children}) => (
  <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
    {children}
    {showSubtitles && <Subtitle lines={scene.lines} />}
    <SceneTransition inKind={scene.transitionIn} outKind={outKind} duration={TIMING.transition} length={scene.durationInFrames} />
    {scene.lines.map((l) =>
      l.audioFile ? (
        <Sequence key={l.id} from={l.start} durationInFrames={l.duration + 15} layout="none">
          <Audio src={staticFile(l.audioFile)} volume={1} />
        </Sequence>
      ) : null,
    )}
    {scene.transitionIn !== 'none' && <Sfx name={scene.transitionIn === 'flash' ? 'impact' : 'whoosh'} at={0} volume={0.5} />}
  </AbsoluteFill>
);
