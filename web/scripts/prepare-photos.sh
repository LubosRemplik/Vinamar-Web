#!/usr/bin/env bash
# Turns the owner's originals in Assets/ into web-sized photos in public/images/.
# Originals stay out of git; the processed files are committed.
#
# Usage:  web/scripts/prepare-photos.sh          (run from the repo root)
#
# Requires macOS `sips`. Photos are capped at 2000 px on the longer side and
# saved as JPEG 80 — Next.js <Image> serves WebP from these at request time.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="$REPO_ROOT/Assets"
DEST="$REPO_ROOT/web/public/images"

APARTMENT="$SRC/Apartman s bazenem"
BEACH="$SRC/Plaz"

# source file → destination path, one pair per line
MAP=$(cat <<'EOF'
Apartman s bazenem/IMG_1309.JPG|home/hero.jpg
Apartman s bazenem/IMG_1379.JPG|apartment/living-01.jpg
Apartman s bazenem/IMG_1380.JPG|apartment/living-02.jpg
Apartman s bazenem/IMG_1348.JPG|apartment/bedroom.jpg
Apartman s bazenem/IMG_1372.JPG|apartment/dining.jpg
Apartman s bazenem/IMG_1402.JPG|apartment/kitchen.jpg
Apartman s bazenem/IMG_1400.JPG|apartment/bathroom-01.jpg
Apartman s bazenem/IMG_1342.JPG|apartment/bathroom-02.jpg
Apartman s bazenem/IMG_1349.JPG|apartment/balcony.jpg
Apartman s bazenem/IMG_1401.JPG|apartment/hallway.jpg
Apartman s bazenem/IMG_1367.JPG|pool/pool-day.jpg
Apartman s bazenem/IMG_1310.JPG|pool/pool-evening.jpg
Apartman s bazenem/IMG_1366.JPG|pool/residence.jpg
Apartman s bazenem/IMG_1365.JPG|pool/pool-day-02.jpg
Plaz/IMG_1285.JPG|surroundings/beach-boardwalk.jpg
Plaz/IMG_1291.JPG|surroundings/beach-parasols.jpg
Plaz/IMG_1289.JPG|surroundings/sea.jpg
Plaz/IMG_1292.JPG|surroundings/promenade.jpg
Plaz/IMG_1286.JPG|surroundings/beach-dunes.jpg
Plaz/IMG_1290.JPG|surroundings/beach-bar.jpg
EOF
)

if [ ! -d "$SRC" ]; then
  echo "Assets/ not found — nothing to prepare." >&2
  exit 1
fi

count=0
while IFS='|' read -r from to; do
  [ -n "$from" ] || continue
  src="$SRC/$from"
  dst="$DEST/$to"
  if [ ! -f "$src" ]; then
    echo "missing source: $from" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$dst")"
  sips -Z 2000 -s format jpeg -s formatOptions 80 "$src" --out "$dst" >/dev/null
  count=$((count + 1))
  printf '%-42s %s\n' "$to" "$(du -h "$dst" | cut -f1)"
done <<< "$MAP"

echo "$count photos written to web/public/images/"
