// Prints the computed timeline (for choosing still frames / checking durations).
import {TIMELINE, TOTAL_FRAMES} from '../src/timeline';

for (const s of TIMELINE) {
  console.log(`${s.id.padEnd(11)} from ${String(s.from).padStart(5)}  len ${String(s.durationInFrames).padStart(4)} (${(s.durationInFrames / 30).toFixed(1)}s)`);
  for (const l of s.lines) console.log(`   ${l.id.padEnd(9)} @${String(s.from + l.start).padStart(5)} (+${l.start}) ${l.duration}f ${l.audioFile ? '' : '[no audio]'}`);
}
console.log(`TOTAL ${TOTAL_FRAMES} frames = ${(TOTAL_FRAMES / 30).toFixed(1)}s`);
