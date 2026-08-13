#!/bin/bash
# new-version.sh — Create a new version snapshot from the baseline specs.
#
# Usage:
#   ./new-version.sh improvement-1         # copies baseline specs into a new version dir
#   ./new-version.sh improvement-1 --render # also renders all specs to .pptx + preview
#
# Workflow:
#   1. Run: ./new-version.sh improvement-1
#   2. Edit the specs in versions/improvement-1/<case>/*.slide.json
#   3. Render: ./new-version.sh improvement-1 --render
#   4. Rebuild gallery: node build-gallery.js
#   5. Open gallery/index.html to compare

set -euo pipefail
cd "$(dirname "$0")"

VERSION="${1:?Usage: $0 <version-name> [--render]}"
RENDER="${2:-}"
BASE="versions/baseline"
TARGET="versions/$VERSION"
SCRIPTS="$(pwd)/../ai-plugin-marketplace/rush/plugins/insight-branded-pptx/skills/insight-branded-pptx-slide/scripts"
ENGINE="$SCRIPTS/slide-lib.bundle.js"

if [[ "$RENDER" == "--render" ]]; then
  if [[ ! -d "$TARGET" ]]; then
    echo "Error: $TARGET does not exist. Run without --render first to create it."
    exit 1
  fi
  echo "Rendering all specs in $TARGET..."
  for case_dir in "$TARGET"/*/; do
    case_name=$(basename "$case_dir")
    spec=$(find "$case_dir" -name "*.slide.json" | head -1)
    if [[ -z "$spec" ]]; then
      echo "  ⚠ $case_name: no .slide.json found, skipping"
      continue
    fi
    echo "  Rendering $case_name..."
    node "$ENGINE" "$spec" 2>&1 | sed 's/^/    /'

    # Move output from the engine's versioned dir into the case dir
    for engine_dir in "$TARGET"/slide_*_v*/; do
      if [[ -d "$engine_dir" ]]; then
        pptx=$(find "$engine_dir" -name "*.pptx" 2>/dev/null | head -1)
        if [[ -n "$pptx" ]]; then
          cp "$pptx" "$case_dir/"
        fi
        if [[ -d "$engine_dir/preview" ]]; then
          mkdir -p "$case_dir/preview"
          cp "$engine_dir/preview/"*.png "$case_dir/preview/" 2>/dev/null
        fi
        # Copy back the engine-stamped spec
        engine_spec=$(find "$engine_dir" -name "*.slide.json" 2>/dev/null | head -1)
        if [[ -n "$engine_spec" ]]; then
          cp "$engine_spec" "$case_dir/"
        fi
        rm -rf "$engine_dir"
      fi
    done
  done
  echo ""
  echo "Rebuilding gallery..."
  node build-gallery.js
  echo "Done. Open gallery/index.html to compare."
  exit 0
fi

if [[ -d "$TARGET" ]]; then
  echo "Version '$VERSION' already exists at $TARGET"
  echo "To render: $0 $VERSION --render"
  exit 1
fi

echo "Creating version: $VERSION"
mkdir -p "$TARGET"

for case_dir in "$BASE"/*/; do
  case_name=$(basename "$case_dir")
  echo "  Copying $case_name..."
  mkdir -p "$TARGET/$case_name"
  # Copy only the spec — not the pptx or preview (those get regenerated)
  cp "$case_dir"/*.slide.json "$TARGET/$case_name/" 2>/dev/null || true
done

echo ""
echo "Created $TARGET with specs from baseline."
echo ""
echo "Next steps:"
echo "  1. Edit specs in $TARGET/<case>/*.slide.json"
echo "  2. Render:  $0 $VERSION --render"
echo "  3. Compare: open gallery/index.html"
