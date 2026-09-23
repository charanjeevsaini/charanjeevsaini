// Prints every dialogue line from src/script.ts as JSON (consumed by generate_tts.py).
import {SCENES} from '../src/script';

const lines = SCENES.flatMap((s) =>
  s.lines.map((l) => ({
    id: l.id,
    speaker: l.speaker,
    text: l.text,
    tts: (l.tts ?? l.text).replace(/\*\*/g, ''),
  })),
);
process.stdout.write(JSON.stringify(lines, null, 2));
