// Turns src/script.ts + generated voice durations into frame timings.
// Nothing here needs editing when dialogue changes.
import {SCENES, SceneId, SceneScript, Line} from './script';
import {TIMING, VIDEO} from './theme';
import {VOICE_MANIFEST} from './generated/voiceManifest';

export interface TimedLine extends Line {
  start: number; // frame within the scene
  duration: number; // frames the line is on screen
  audioFile: string | null; // path inside public/, null if no up-to-date audio
}

export interface TimedScene extends SceneScript {
  from: number; // absolute start frame in the episode
  durationInFrames: number;
  lines: TimedLine[];
}

const plain = (s: string) => s.replace(/\*\*/g, '');

const lineTiming = (line: Line): {frames: number; audioFile: string | null} => {
  const clip = VOICE_MANIFEST[line.id];
  const spoken = plain(line.tts ?? line.text);
  if (clip && clip.tts === spoken) {
    return {
      frames: Math.ceil(clip.seconds * VIDEO.fps),
      audioFile: `audio/voice/${clip.file}`,
    };
  }
  // No (or stale) audio: estimate from reading speed so subtitles stay readable.
  const words = plain(line.text).split(/\s+/).length;
  const frames = Math.max(
    TIMING.minLineFrames,
    Math.ceil((words / TIMING.fallbackWordsPerSecond) * VIDEO.fps),
  );
  return {frames, audioFile: null};
};

const buildScene = (scene: SceneScript, from: number): TimedScene => {
  let cursor = scene.leadIn ?? TIMING.sceneLeadIn;
  const lines: TimedLine[] = scene.lines.map((line, i) => {
    const {frames, audioFile} = lineTiming(line);
    const timed: TimedLine = {...line, start: cursor, duration: frames, audioFile};
    cursor += frames;
    if (i < scene.lines.length - 1) cursor += TIMING.lineGap + (line.pauseAfter ?? 0);
    return timed;
  });
  const durationInFrames = cursor + (scene.tail ?? TIMING.sceneTail);
  return {...scene, from, durationInFrames, lines};
};

export const TIMELINE: TimedScene[] = (() => {
  let from = 0;
  return SCENES.map((s) => {
    const t = buildScene(s, from);
    from += t.durationInFrames;
    return t;
  });
})();

export const TOTAL_FRAMES = TIMELINE.reduce((a, s) => a + s.durationInFrames, 0);

export const getScene = (id: SceneId): TimedScene => {
  const s = TIMELINE.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown scene ${id}`);
  return s;
};

// Helper handed to each scene so animations can be keyed to dialogue lines.
export const cues = (scene: TimedScene) => {
  const byId = (id: string) => {
    const l = scene.lines.find((x) => x.id === id);
    if (!l) throw new Error(`Line ${id} not found in scene ${scene.id}`);
    return l;
  };
  return {
    /** Frame (scene-relative) at which line `id` starts. */
    at: (id: string) => byId(id).start,
    /** Frame at which line `id` finishes. */
    end: (id: string) => byId(id).start + byId(id).duration,
    /** The line being spoken (or most recently spoken) at `frame`. */
    current: (frame: number): TimedLine | null => {
      let cur: TimedLine | null = null;
      for (const l of scene.lines) if (frame >= l.start) cur = l;
      return cur;
    },
    /** Is `speaker` actively talking at `frame`? */
    talking: (frame: number, speaker: string) =>
      scene.lines.some((l) => l.speaker === speaker && frame >= l.start && frame < l.start + l.duration),
    /** Latest expression/pose for a speaker at `frame`, with a fallback. */
    stateOf: <K extends 'expression' | 'pose'>(frame: number, speaker: string, key: K, fallback: NonNullable<Line[K]>) => {
      let v: NonNullable<Line[K]> = fallback;
      for (const l of scene.lines) {
        if (l.speaker === speaker && frame >= l.start - 4 && l[key]) v = l[key] as NonNullable<Line[K]>;
      }
      return v;
    },
    duration: scene.durationInFrames,
  };
};
export type Cues = ReturnType<typeof cues>;
