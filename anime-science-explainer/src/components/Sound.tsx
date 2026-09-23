// Audio helpers. Optional files (music, SFX) are skipped when absent so the
// video always renders. Drop files into public/audio/ to enable them.
import React from 'react';
import {Audio, getStaticFiles, Sequence, staticFile} from 'remotion';

export type SfxName = 'whoosh' | 'sparkle' | 'impact' | 'pop' | 'powerup' | 'splash';

const hasStatic = (path: string) => {
  try {
    return getStaticFiles().some((f) => f.name === path);
  } catch {
    return false;
  }
};

export const OptionalAudio: React.FC<{path: string; volume?: number | ((f: number) => number); loop?: boolean}> = ({path, volume = 1, loop}) => {
  if (!hasStatic(path)) return null;
  return <Audio src={staticFile(path)} volume={volume} loop={loop} />;
};

/** Play a sound effect from public/audio/sfx/<name>.mp3 at scene frame `at`. */
export const Sfx: React.FC<{name: SfxName; at: number; volume?: number}> = ({name, at, volume = 0.7}) => {
  const path = `audio/sfx/${name}.mp3`;
  if (!hasStatic(path)) return null;
  return (
    <Sequence from={Math.max(0, Math.round(at))} durationInFrames={150} layout="none">
      <Audio src={staticFile(path)} volume={volume} />
    </Sequence>
  );
};
