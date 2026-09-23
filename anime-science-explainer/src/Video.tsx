// Composes all scenes in sequence. Scene order and lengths come from script.ts.
import React from 'react';
import {AbsoluteFill, interpolate, Sequence} from 'remotion';
import type {SceneId} from './script';
import {TIMELINE, TOTAL_FRAMES, TimedScene} from './timeline';
import {SceneShell} from './components/SceneShell';
import {OptionalAudio} from './components/Sound';
import {ColdOpen} from './scenes/ColdOpen';
import {TitleCard} from './scenes/TitleCard';
import {Question} from './scenes/Question';
import {SpeedScene} from './scenes/SpeedScene';
import {WhyBend} from './scenes/WhyBend';
import {NormalRule} from './scenes/NormalRule';
import {PencilSolved} from './scenes/PencilSolved';
import {PowerUp} from './scenes/PowerUp';
import {Examples} from './scenes/Examples';
import {Outro} from './scenes/Outro';

const SCENE_COMPONENTS: Record<SceneId, React.FC<{scene: TimedScene}>> = {
  coldOpen: ColdOpen,
  title: TitleCard,
  question: Question,
  speed: SpeedScene,
  whyBend: WhyBend,
  normalRule: NormalRule,
  pencil: PencilSolved,
  powerUp: PowerUp,
  examples: Examples,
  outro: Outro,
};

const NO_SUBTITLES: SceneId[] = ['title'];

export const Episode: React.FC = () => (
  <AbsoluteFill style={{background: '#000'}}>
    {TIMELINE.map((scene, i) => {
      const Scene = SCENE_COMPONENTS[scene.id];
      const next = TIMELINE[i + 1];
      return (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.durationInFrames} name={scene.label}>
          <SceneShell scene={scene} outKind={next ? next.transitionIn : 'iris'} showSubtitles={!NO_SUBTITLES.includes(scene.id)}>
            <Scene scene={scene} />
          </SceneShell>
        </Sequence>
      );
    })}
    {/* Background music (optional): public/audio/bgm.mp3 */}
    <OptionalAudio
      path="audio/bgm.mp3"
      loop
      volume={(f) => interpolate(f, [0, 30, TOTAL_FRAMES - 60, TOTAL_FRAMES], [0, 0.12, 0.12, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
    />
  </AbsoluteFill>
);
