# Science Spark! — Episode 3: *The Bending Light!*

An anime-style explainer on **Refraction of Light** for Class 8 (NCERT/CBSE),
built entirely in code with [Remotion](https://www.remotion.dev/) (React + TypeScript).
All characters, backgrounds and effects are original SVG/React components.

**Output:** `out/episode.mp4` — 1920×1080, 30 fps, H.264, ~2 minutes.

## Quick start

```bash
npm install
npm run studio        # live preview in the browser
npm run render        # → out/episode.mp4
npm run still -- --frame=500 stills/test.png   # one frame
```

In sandboxes that can't download Remotion's own headless Chrome, point it at a
local Chromium: `REMOTION_CHROME=/path/to/chrome npm run render`.

## Project layout

| Path | Purpose |
|---|---|
| `src/script.ts` | **All dialogue & on-screen text.** Speaker, expression, pose per line. |
| `src/theme.ts` | Colours, fonts (Bangers + Nunito, OFL, via `@remotion/google-fonts`), timing constants |
| `src/timeline.ts` | Turns the script + voice durations into frame timings (no edits needed) |
| `src/characters/` | `Hikari`, `Professor` (6 expressions × 5 poses), `Pip` mascot, shared `parts.tsx` |
| `src/effects/` | `SpeedLines`, `Sparkles`, `ImpactFlash`, `ScreenShake`, `RadialBurst`, `SceneTransition` (flash / iris / wipe), `GlowText`, comedy marks (`ExclamationPop`, `SweatDrop`, `AngerMark`, `QuestionMarks`) |
| `src/components/` | Subtitle box, backgrounds, props (glass/pencil), lesson layout, audio helpers |
| `src/scenes/` | One component per scene |
| `src/Video.tsx` | Puts the scenes in sequence |
| `tools/generate_tts.py` | Generates voices (Kokoro-82M, Apache-2.0) and `src/generated/voiceManifest.ts` |
| `tools/scene-frames.ts` | Prints the computed timeline (`npx tsx tools/scene-frames.ts`) |
| `tools/stills.sh` | Renders stills at scene-relative frames: `tools/stills.sh pencil 100 250` |

## Editing

**Change a line of dialogue** – edit `text` in `src/script.ts` (use `**word**` to
highlight a key term; add `tts` if the spoken version should differ). Then:

```bash
pip install kokoro-onnx soundfile   # once
npm run tts                         # regenerates only changed lines
npm run render
```

Scene lengths follow the audio automatically. If you skip `npm run tts`, the
changed line is timed from its word count and shown as a silent subtitle.

**Change voices** – edit `VOICES` in `tools/generate_tts.py` (any Kokoro voice,
e.g. `af_heart`, `bf_emma`, `am_michael`), then `npm run tts -- --force`.

**Change colours / fonts / pacing** – `src/theme.ts` (`COLORS`, `FONTS`,
`TIMING.lineGap`, etc.). Per-scene pauses are `leadIn` / `tail` in `script.ts`.

**Change the topic** – the reusable parts (characters, effects, subtitles,
timeline, layout) are topic-agnostic. Write a new `SCENES` list in `script.ts`,
then replace or adapt the scene components in `src/scenes/` and the mapping in
`src/Video.tsx`. Explanation scenes can reuse `LessonLayout` (board + both
characters reacting) and key their animations to dialogue with
`cues(scene).at('line_id')`.

**Music & sound effects** – see `public/audio/README.md`.

## Science covered (checked against NCERT Class 8)

- Refraction = bending of light when it passes (at an angle) from one transparent material into another.
- Cause: light's speed differs between materials — air ≈ 3,00,000 km/s, water ≈ ¾ of that (≈ 2,25,000 km/s), glass ≈ ⅔ (≈ 2,00,000 km/s). A material where light is slower is *optically denser*.
- Why it bends: one side of the beam enters the slower material first (toy-car-onto-carpet analogy).
- The *normal* is a line at 90° to the surface. Faster → slower: bends towards the normal; slower → faster: bends away. Along the normal: no bending (speed still changes).
- Broken pencil: light from the underwater part bends away from the normal as it leaves the water; our eyes trace it back in a straight line, so that part looks raised.
- Examples: pools look shallower, lenses in spectacles/magnifiers, twinkling stars (atmospheric refraction).
- Diagram angles use Snell's law with n(water) = 1.33 (50° in air ↔ 35° in water).
