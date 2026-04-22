#!/usr/bin/env bash

set -euo pipefail

SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FILES=("manifest.json" "styles.css" "main.js")

if [[ $# -ne 1 ]]; then
	printf 'Usage: %s <destination-folder>\n' "$0" >&2
	exit 1
fi

DESTINATION_INPUT="$1"
if [[ "$DESTINATION_INPUT" = /* ]]; then
	DESTINATION_DIR="$DESTINATION_INPUT"
else
	DESTINATION_DIR="$PWD/$DESTINATION_INPUT"
fi

mkdir -p "$DESTINATION_DIR"

checksum_state() {
	local state=""
	for file in "${FILES[@]}"; do
		local src="$SOURCE_DIR/$file"
		if [[ ! -f "$src" ]]; then
			printf 'Required file missing: %s\n' "$src" >&2
			return 1
		fi
		local checksum
		checksum="$(shasum "$src" | awk '{print $1}')"
		state+="${file}:${checksum};"
	done
	printf '%s' "$state"
}

sync_files() {
	for file in "${FILES[@]}"; do
		cp "$SOURCE_DIR/$file" "$DESTINATION_DIR/$file"
	done
	printf '[%s] Synced manifest.json, styles.css, main.js -> %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$DESTINATION_DIR"
}

printf 'Watching %s for changes...\n' "$SOURCE_DIR"
printf 'Destination: %s\n' "$DESTINATION_DIR"

previous_state="$(checksum_state)"
sync_files

while true; do
	sleep 1
	current_state="$(checksum_state)" || continue
	if [[ "$current_state" != "$previous_state" ]]; then
		sync_files
		previous_state="$current_state"
	fi
done
