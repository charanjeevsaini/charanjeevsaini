// ─────────────────────────────────────────────────────────────────────────────
// ALL dialogue and on-screen text lives here.
//
// • Edit `text` to change a subtitle. Wrap key terms in **double stars** to
//   highlight them. `tts` (optional) is what the voice actor says, if it should
//   differ from the subtitle (e.g. numbers written the Indian way).
// • After changing dialogue, run `npm run tts` to regenerate voices. Scene
//   lengths are recomputed automatically from the audio durations. If a line's
//   audio is missing or out of date, a reading-speed estimate is used instead
//   and that line plays silently with subtitles only.
// ─────────────────────────────────────────────────────────────────────────────

export type Speaker = 'hikari' | 'professor';

export type Expression =
  | 'neutral'
  | 'surprised'
  | 'happy'
  | 'thinking'
  | 'determined'
  | 'chibi';

export type Pose = 'idle' | 'point' | 'cheer' | 'think' | 'present';

export interface Line {
  id: string;
  speaker: Speaker;
  text: string;
  tts?: string;
  expression?: Expression;
  pose?: Pose;
  // Extra frames of silence after this line (on top of TIMING.lineGap)
  pauseAfter?: number;
}

export type TransitionKind = 'flash' | 'iris' | 'wipe' | 'none';

export interface SceneScript {
  id: SceneId;
  label: string;
  // Frames before the first line starts / after the last line ends
  leadIn?: number;
  tail?: number;
  transitionIn: TransitionKind;
  lines: Line[];
}

export type SceneId =
  | 'coldOpen'
  | 'title'
  | 'question'
  | 'speed'
  | 'whyBend'
  | 'normalRule'
  | 'pencil'
  | 'powerUp'
  | 'examples'
  | 'outro';

export const CHARACTER_NAMES: Record<Speaker, string> = {
  hikari: 'Hikari',
  professor: 'Prof. Kōsei',
};

export const SCENES: SceneScript[] = [
  {
    id: 'coldOpen',
    label: 'Cold open',
    leadIn: 20,
    tail: 20,
    transitionIn: 'iris',
    lines: [
      {
        id: 'cold_1',
        speaker: 'hikari',
        text: 'Snack break! Let me just drop my pencil in this glass...',
        expression: 'happy',
        pauseAfter: 20,
      },
      {
        id: 'cold_2',
        speaker: 'hikari',
        text: "WHAT?! My pencil just SNAPPED inside the water!",
        tts: 'Wait. What?! My pencil just snapped inside the water!',
        expression: 'surprised',
      },
    ],
  },
  {
    id: 'title',
    label: 'Title card',
    leadIn: 18,
    tail: 22,
    transitionIn: 'flash',
    lines: [
      {
        id: 'title_1',
        speaker: 'hikari',
        text: 'Episode 3: The Bending Light!',
        tts: 'Episode three! The Bending Light!',
        expression: 'determined',
      },
    ],
  },
  {
    id: 'question',
    label: 'The question',
    leadIn: 12,
    tail: 10,
    transitionIn: 'wipe',
    lines: [
      {
        id: 'q_1',
        speaker: 'hikari',
        text: "But outside the water it's perfectly fine! Why?!",
        expression: 'chibi',
        pose: 'cheer',
      },
      {
        id: 'q_2',
        speaker: 'professor',
        text: "Ah-ha! That's the magic of **refraction**!",
        expression: 'happy',
        pose: 'point',
      },
      {
        id: 'q_3',
        speaker: 'professor',
        text: '**Refraction** is the bending of light when it passes from one transparent material into another.',
        expression: 'neutral',
        pose: 'present',
      },
      {
        id: 'q_4',
        speaker: 'hikari',
        text: 'Bending light? But I learnt that light travels in straight lines!',
        expression: 'thinking',
        pose: 'think',
      },
    ],
  },
  {
    id: 'speed',
    label: 'Step 1: Light changes speed',
    leadIn: 12,
    tail: 12,
    transitionIn: 'wipe',
    lines: [
      {
        id: 'speed_1',
        speaker: 'professor',
        text: 'True! But light has **different speeds** in different materials.',
        expression: 'happy',
        pose: 'present',
      },
      {
        id: 'speed_2',
        speaker: 'professor',
        text: 'In air: about 3 lakh kilometres per second!',
        tts: 'In air, about three lakh kilometres per second!',
        expression: 'determined',
        pose: 'point',
      },
      {
        id: 'speed_3',
        speaker: 'professor',
        text: 'Water slows it to about three-quarters of that. Glass, about two-thirds.',
        expression: 'neutral',
        pose: 'present',
      },
      {
        id: 'speed_4',
        speaker: 'professor',
        text: 'A material where light is slower is called **optically denser**.',
        expression: 'happy',
        pose: 'point',
      },
    ],
  },
  {
    id: 'whyBend',
    label: 'Step 2: Why slowing down makes it bend',
    leadIn: 12,
    tail: 12,
    transitionIn: 'wipe',
    lines: [
      {
        id: 'why_1',
        speaker: 'hikari',
        text: 'But why does slowing down make it BEND?',
        tts: 'But why does slowing down make it bend?',
        expression: 'thinking',
        pose: 'think',
        pauseAfter: 10,
      },
      {
        id: 'why_2',
        speaker: 'professor',
        text: 'Picture a toy car rolling at a slant onto a carpet.',
        expression: 'happy',
        pose: 'present',
      },
      {
        id: 'why_3',
        speaker: 'professor',
        text: 'One wheel hits the carpet first and slows down. The other is still fast.',
        expression: 'neutral',
        pose: 'point',
      },
      {
        id: 'why_4',
        speaker: 'professor',
        text: 'So the car turns! A beam of light bends the same way.',
        expression: 'determined',
        pose: 'point',
      },
      {
        id: 'why_5',
        speaker: 'hikari',
        text: 'Whoa! One side slows first, so it swerves!',
        expression: 'surprised',
        pose: 'cheer',
      },
    ],
  },
  {
    id: 'normalRule',
    label: 'Step 3: The normal and the direction of bending',
    leadIn: 12,
    tail: 60,
    transitionIn: 'wipe',
    lines: [
      {
        id: 'norm_1',
        speaker: 'professor',
        text: 'This dotted line at 90° to the surface is the **normal**.',
        tts: 'This dotted line, at ninety degrees to the surface, is the normal.',
        expression: 'neutral',
        pose: 'present',
      },
      {
        id: 'norm_2',
        speaker: 'professor',
        text: 'Air into water: light slows down and bends **towards the normal**.',
        expression: 'happy',
        pose: 'point',
      },
      {
        id: 'norm_3',
        speaker: 'professor',
        text: 'Water into air: it speeds up and bends **away from the normal**.',
        expression: 'determined',
        pose: 'point',
      },
    ],
  },
  {
    id: 'pencil',
    label: 'Solving the broken pencil',
    leadIn: 12,
    tail: 12,
    transitionIn: 'wipe',
    lines: [
      {
        id: 'pen_1',
        speaker: 'professor',
        text: 'Now, your pencil! Light from the underwater part bends as it leaves the water.',
        expression: 'happy',
        pose: 'point',
      },
      {
        id: 'pen_2',
        speaker: 'professor',
        text: 'Your eyes trace light back in a straight line, so that part looks lifted up!',
        expression: 'neutral',
        pose: 'present',
      },
      {
        id: 'pen_3',
        speaker: 'hikari',
        text: "So the pencil only LOOKS broken. It's an illusion!",
        tts: "So the pencil only looks broken. It's an illusion!",
        expression: 'happy',
        pose: 'cheer',
      },
    ],
  },
  {
    id: 'powerUp',
    label: 'Power-up: the key rule',
    leadIn: 18,
    tail: 30,
    transitionIn: 'flash',
    lines: [
      {
        id: 'pow_1',
        speaker: 'hikari',
        text: 'I get it now! Refraction Rule... ACTIVATE!',
        tts: 'I get it now! Refraction Rule. Activate!',
        expression: 'determined',
        pose: 'cheer',
        pauseAfter: 10,
      },
      {
        id: 'pow_2',
        speaker: 'hikari',
        text: 'Fast to slow: bend **TOWARDS** the normal!',
        tts: 'Fast to slow: bend towards the normal!',
        expression: 'determined',
        pose: 'point',
      },
      {
        id: 'pow_3',
        speaker: 'hikari',
        text: 'Slow to fast: bend **AWAY** from the normal!',
        tts: 'Slow to fast: bend away from the normal!',
        expression: 'determined',
        pose: 'point',
      },
    ],
  },
  {
    id: 'examples',
    label: 'Real-life examples',
    leadIn: 12,
    tail: 12,
    transitionIn: 'wipe',
    lines: [
      {
        id: 'ex_1',
        speaker: 'professor',
        text: 'Look! A pool looks **shallower** than it really is.',
        expression: 'happy',
        pose: 'present',
      },
      {
        id: 'ex_2',
        speaker: 'hikari',
        text: 'Spectacles and magnifying glasses use lenses that bend light!',
        expression: 'happy',
        pose: 'point',
      },
      {
        id: 'ex_3',
        speaker: 'professor',
        text: 'And stars **twinkle** as their light bends through moving air.',
        expression: 'neutral',
        pose: 'present',
      },
    ],
  },
  {
    id: 'outro',
    label: 'Recap and next episode',
    leadIn: 12,
    tail: 54,
    transitionIn: 'iris',
    lines: [
      {
        id: 'out_1',
        speaker: 'hikari',
        text: 'Recap! **Refraction** is light bending when it changes speed between materials!',
        expression: 'happy',
        pose: 'cheer',
      },
      {
        id: 'out_2',
        speaker: 'professor',
        text: 'Perfect! Full marks, Hikari!',
        expression: 'happy',
        pose: 'point',
      },
      {
        id: 'out_3',
        speaker: 'hikari',
        text: 'Next time: the secret of the rainbow! See you!',
        expression: 'determined',
        pose: 'cheer',
      },
    ],
  },
];

// ─── Non-dialogue on-screen text ────────────────────────────────────────────
export const ONSCREEN = {
  seriesName: 'SCIENCE SPARK!',
  episodeNumber: 'EPISODE 3',
  episodeTitle: 'The Bending Light!',
  episodeSubtitle: 'Refraction of Light · Class 8 Science',

  coldOpenSfx: 'SNAP?!',

  definitionCard: {
    heading: 'REFRACTION',
    body: 'The bending of light when it passes from one transparent material into another.',
  },

  speed: {
    heading: 'Speed of light',
    rows: [
      {label: 'Air', value: '≈ 3,00,000 km/s', fraction: 1},
      {label: 'Water', value: '≈ 2,25,000 km/s', fraction: 0.75},
      {label: 'Glass', value: '≈ 2,00,000 km/s', fraction: 0.667},
    ],
    denserTerm: '**Optically denser** = light travels SLOWER in it',
  },

  whyBend: {
    floor: 'Smooth floor (fast)',
    carpet: 'Carpet (slow)',
    slowWheel: 'Slows first!',
    fastWheel: 'Still fast',
  },

  normalRule: {
    air: 'AIR (light is faster)',
    water: 'WATER (light is slower)',
    normal: 'Normal (90°)',
    towards: 'Bends TOWARDS the normal',
    away: 'Bends AWAY from the normal',
    straight: 'Along the normal: no bending (it still slows down!)',
  },

  pencil: {
    real: 'Real position',
    apparent: 'Where it seems to be',
    eye: 'Eye',
  },

  powerUp: {
    banner: 'REFRACTION RULE!',
    rule1Left: 'FAST → SLOW',
    rule1Right: 'bend TOWARDS the normal',
    rule2Left: 'SLOW → FAST',
    rule2Right: 'bend AWAY from the normal',
  },

  examples: [
    {title: 'Pools look shallower', caption: 'Light from the bottom bends as it leaves the water.'},
    {title: 'Spectacles & magnifiers', caption: 'Lenses refract light to focus it.'},
    {title: 'Twinkling stars', caption: 'Starlight bends through shifting layers of air.'},
  ],

  recapCard: '**Refraction** = light bending as it changes speed between materials',
  nextEpisode: {
    label: 'NEXT EPISODE',
    title: 'Episode 4: The Secret of the Rainbow!',
  },
  endScreen: {
    thanks: 'Thanks for watching!',
    tagline: 'Stay curious! ✦',
    credits: 'Original characters & animation · Made with Remotion',
  },
};
