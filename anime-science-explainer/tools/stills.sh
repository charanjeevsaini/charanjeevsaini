#!/usr/bin/env bash
# Usage: tools/stills.sh <sceneId> <relFrame> [relFrame...]
# Renders stills (frame numbers relative to the scene start) into stills/.
set -e
cd "$(dirname "$0")/.."
scene=$1; shift
from=$(npx tsx -e "import {getScene} from './src/timeline'; console.log(getScene('$scene').from)")
for f in "$@"; do
  npx remotion still Episode "stills/${scene}-${f}.png" --frame=$((from + f)) --log=error
done
