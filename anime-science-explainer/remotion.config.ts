import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(20);
Config.setPixelFormat('yuv420p');
Config.setOverwriteOutput(true);

// Use a locally installed Chromium when REMOTION_CHROME is set (e.g. sandboxed
// environments that can't download Remotion's own headless browser).
if (process.env.REMOTION_CHROME) {
  Config.setBrowserExecutable(process.env.REMOTION_CHROME);
}
