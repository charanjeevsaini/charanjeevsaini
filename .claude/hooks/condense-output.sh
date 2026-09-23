#!/usr/bin/env bash
# Reads a command's combined output on stdin. Short output passes through
# untouched. Long output is reduced to errors/failures/warnings (with a little
# context) plus the final summary. The full log is kept on disk.
MAX_LINES=${CONDENSE_MAX_LINES:-40}   # at or below this, print everything
TAIL_LINES=${CONDENSE_TAIL_LINES:-15} # final summary lines always kept
MAX_HITS=${CONDENSE_MAX_HITS:-60}     # cap on error/warning lines kept

log=$(mktemp "${TMPDIR:-/tmp}/claude-cmd-XXXXXX.log")
# Strip ANSI colors and collapse carriage-return progress bars to their final state.
sed -u -e 's/\x1b\[[0-9;?]*[A-Za-z]//g' -e 's/.*\r\(.\)/\1/' -e 's/\r$//' > "$log"

total=$(wc -l < "$log")
if [ "$total" -le "$MAX_LINES" ]; then
  cat "$log"; rm -f "$log"; exit 0
fi

pattern='error|err!|fail|failed|failure|fatal|panic|exception|traceback|warn(ing)?[:\] ]|✗|✘|×|cannot|could not|not found|denied|refused|timed? ?out|segmentation|abort|assert|expected|undefined reference|exit (code|status) [1-9]|npm ERR|E[0-9]{3,}|^-{3,}|^={3,}|^\s+at '
# Progress bars and per-item fetch chatter: never worth keeping in the condensed view.
noise='━|█|▓|▒|░|#{5,}|[0-9]+%\||eta [0-9]|^\s*(Collecting|Downloading|Fetching|Resolving|Requirement already satisfied|Using cached|Obtaining|Preparing|Building wheel|Created wheel|Stored in|Unpacking|Selecting|Get:[0-9]|Hit:[0-9]|Compiling|Checking|Updating|Downloaded|Progress|Receiving objects|Resolving deltas|remote:)'
# Line numbers of the last $TAIL_LINES non-noise lines = the final summary.
summary_lines=$(grep -nEv "$noise" "$log" | cut -d: -f1 | tail -n "$TAIL_LINES")
summary_start=$(printf '%s\n' "$summary_lines" | head -n1); summary_start=${summary_start:-$((total + 1))}

hits=$(grep -inE "$pattern" "$log" | grep -vE "^[0-9]+:.*($noise)" | cut -d: -f1 | awk -v s="$summary_start" '$1 < s')
nhits=$(printf '%s' "$hits" | grep -c . || true)

echo "[condensed by .claude/hooks: $total lines -> errors/warnings + final summary; full log: $log]"
if [ "$nhits" -gt 0 ]; then
  echo "--- errors / warnings ($nhits matching lines) ---"
  # each hit plus 1 line of context after it, de-duplicated, capped
  printf '%s\n' $hits | awk -v s="$summary_start" '{for(i=$1;i<=$1+1&&i<s;i++) print i}' \
    | sort -nu | head -n $((MAX_HITS * 2)) \
    | awk 'NR==FNR{want[$1]=1; next} want[FNR]' - "$log" | head -n "$MAX_HITS"
  [ "$nhits" -gt "$MAX_HITS" ] && echo "... (more in full log)"
fi
echo "--- final summary ---"
printf '%s\n' "$summary_lines" | awk 'NR==FNR{want[$1]=1; next} want[FNR]' - "$log"
