#!/usr/bin/env bash
# PreToolUse hook (Bash): rewrite noisy commands (installs, builds, test runs,
# anything with a progress bar) so their output is piped through
# condense-output.sh before it reaches Claude's context.
#
# Leaves a command alone when:
#   - it doesn't look like an install / build / test command
#   - it already trims its own output (| tail, | head, | grep, > file, ...)
#   - it contains the opt-out marker "# no-quiet" or QUIET_HOOK=0
set -euo pipefail

input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
[ -z "$cmd" ] && exit 0

# Opt-outs and commands that already filter/redirect their own output.
if grep -qE '#[[:space:]]*no-quiet|QUIET_HOOK=0|condense-output\.sh' <<<"$cmd"; then exit 0; fi
if grep -qE '\|[[:space:]]*(tail|head|grep|rg|less|wc|jq|awk|sed)\b|>[[:space:]]*[^&[:space:]]' <<<"$cmd"; then exit 0; fi

# A command starts at the beginning, or after ; & | ( or `env VAR=x`.
start='(^|[;&|(][[:space:]]*|^[[:space:]]*)([A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
noisy=(
  '(npm|pnpm|yarn|bun)[[:space:]]+(i|install|ci|add|update|upgrade|build|test|t|run[[:space:]]+(build|test|lint|e2e)[^[:space:]]*)\b'
  '(npx|pnpx|bunx)[[:space:]]+(jest|vitest|playwright|mocha|tsc|next[[:space:]]+build|vite[[:space:]]+build|webpack|eslint)\b'
  '(yarn)([[:space:]]*$|[[:space:]]*[;&|])'
  '(pip3?|python3?[[:space:]]+-m[[:space:]]+pip|uv[[:space:]]+pip|uv|poetry|pipenv|conda|mamba)[[:space:]]+(install|sync|add|update|lock)\b'
  '(pytest|python3?[[:space:]]+-m[[:space:]]+(pytest|unittest)|tox|nox)\b'
  '(jest|vitest|mocha|tsc|webpack|rollup|esbuild)\b'
  '(cargo)[[:space:]]+(build|test|install|check|clippy|update|fetch)\b'
  '(go)[[:space:]]+(build|test|install|get|mod[[:space:]]+(download|tidy))\b'
  '(make|cmake|ninja|bazel|gradle|\./gradlew|mvn|\./mvnw|dotnet[[:space:]]+(build|test|restore)|swift[[:space:]]+(build|test))\b'
  '(apt|apt-get|brew|apk|dnf|yum|gem|bundle|composer)[[:space:]]+(install|update|upgrade|add)\b'
  '(docker|podman)[[:space:]]+(build|pull|compose[[:space:]]+(build|pull|up))\b'
  '(git)[[:space:]]+clone\b'
  '(wget|curl)[[:space:]].*(-O|--output|-o)\b'
)
match=0
for p in "${noisy[@]}"; do
  if grep -qE "${start}${p}" <<<"$cmd"; then match=1; break; fi
done
[ "$match" -eq 0 ] && exit 0

filter="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/hooks/condense-output.sh"
[ -x "$filter" ] || exit 0

# Run the original in a subshell, merge stderr, condense, keep its exit code.
new_cmd=$(printf '( set -o pipefail; ( %s\n) 2>&1 | %q )' "$cmd" "$filter")

jq -n --arg c "$new_cmd" --argjson in "$(jq '.tool_input' <<<"$input")" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    updatedInput: ($in + {command: $c})
  }
}'
