// Single source of truth for colours, fonts and timing constants.
import {loadFont as loadBangers} from '@remotion/google-fonts/Bangers';
import {loadFont as loadNunito} from '@remotion/google-fonts/Nunito';

const bangers = loadBangers('normal', {weights: ['400'], subsets: ['latin']});
const nunito = loadNunito('normal', {weights: ['700', '800', '900'], subsets: ['latin']});

export const FONTS = {
  // Big shouty anime titles / effects text
  display: bangers.fontFamily,
  // Readable rounded body text for subtitles and labels
  body: nunito.fontFamily,
};

export const VIDEO = {
  width: 1920,
  height: 1080,
  fps: 30,
};

export const COLORS = {
  // Line art
  outline: '#1f1633',
  outlineSoft: '#3b2d5c',

  // Skin (cel shading = base + one hard shadow tone)
  skin: '#ffe0cc',
  skinShadow: '#f3b79c',
  blush: '#ff8fa3',

  // Hikari
  hikariHair: '#ff7a3d',
  hikariHairShadow: '#c9502a',
  hikariHairShine: '#ffc08a',
  hikariEye: '#2f9bff',
  hikariEyeDark: '#1646a8',
  uniformWhite: '#fbfbff',
  uniformShadow: '#c9cdf0',
  uniformNavy: '#27367a',
  uniformNavyShadow: '#18235a',
  ribbon: '#ff3d6e',
  ribbonShadow: '#c4204d',

  // Professor Kōsei
  profHair: '#eef1ff',
  profHairShadow: '#aeb6dc',
  profEye: '#7a4cff',
  labCoat: '#ffffff',
  labCoatShadow: '#bfd3f2',
  profShirt: '#19b3a6',
  profShirtShadow: '#0e7f76',
  profTie: '#ffcc2e',
  profTieShadow: '#d99a00',
  glassFrame: '#3a2a1a',

  // Pip the mascot
  pip: '#8ff0ff',
  pipShadow: '#41bfe0',
  pipGlow: '#e8ffff',

  // Scenes / UI
  skyTop: '#7fd3ff',
  skyBottom: '#d6f4ff',
  wall: '#fff3d9',
  wallShadow: '#f4dcae',
  floor: '#c98b5b',
  floorShadow: '#a3663d',
  board: '#1f5a4a',
  boardEdge: '#8a5a33',
  desk: '#e0a46b',
  deskShadow: '#b4773f',
  water: '#6fd0ff',
  waterDeep: '#3aa2e6',
  glass: 'rgba(220,245,255,0.35)',
  pencil: '#ffc933',
  pencilShadow: '#d99a00',
  pencilWood: '#ffe2b0',

  // Diagrams
  ray: '#ffe14d',
  rayGlow: '#fff6b0',
  normal: '#ffffff',
  air: '#dff4ff',
  airText: '#1f1633',
  waterMedium: '#3fa8f0',

  // Accents
  highlight: '#ffe14d',
  accentPink: '#ff3d8b',
  accentCyan: '#2ee6ff',
  accentPurple: '#7b3dff',
  burstA: '#ffdd33',
  burstB: '#ff8a1f',
  night: '#0f0a2e',
  white: '#ffffff',
  black: '#000000',

  // Subtitle box
  subtitleBg: 'rgba(18, 10, 40, 0.88)',
  subtitleBorder: '#ffffff',
};

// Per-speaker colour used for subtitle name tags.
export const SPEAKER_COLORS: Record<string, string> = {
  hikari: '#ff5a8a',
  professor: '#19b3a6',
  pip: '#2ea8e6',
};

export const OUTLINE_WIDTH = 5;

// Timing constants (in frames at 30 fps).
export const TIMING = {
  // Silence left between two dialogue lines
  lineGap: 5,
  // Default lead-in before the first line of a scene
  sceneLeadIn: 15,
  // Default hold after the last line of a scene
  sceneTail: 18,
  // Length of in/out transitions drawn on top of each scene
  transition: 12,
  // Reading speed used when a line has no generated voice audio
  // (words per second; kept slow so subtitles stay readable).
  fallbackWordsPerSecond: 2.4,
  minLineFrames: 45,
};
