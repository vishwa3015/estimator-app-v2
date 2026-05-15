#!/usr/bin/env bash
# Local test script — mirrors the GitHub Actions release.yml logic exactly.
# Usage: bash scripts/test-release.sh "<PR title>" [--apply]
#
#   --apply   Actually bumps package.json version and writes CHANGELOG.md
#   (default) Dry-run: prints what would happen, changes nothing

set -e

PR_TITLE="${1:-}"
APPLY="${2:-}"

if [ -z "$PR_TITLE" ]; then
  echo ""
  echo "Usage: bash scripts/test-release.sh \"<PR title>\" [--apply]"
  echo ""
  echo "Examples:"
  echo "  bash scripts/test-release.sh \"feat: add DocuSign integration\""
  echo "  bash scripts/test-release.sh \"fix: broken custom field on proposal\""
  echo "  bash scripts/test-release.sh \"feat!: new AI estimation engine\""
  echo "  bash scripts/test-release.sh \"major: rebuild estimator core\""
  echo "  bash scripts/test-release.sh \"skip: internal refactor\""
  echo ""
  exit 1
fi

# ── Determine bump type (same logic as release.yml) ──────────────────────────
if echo "$PR_TITLE" | grep -iqE '^(feat!|BREAKING CHANGE|BREAKING|major):'; then
  BUMP="major"
elif echo "$PR_TITLE" | grep -iqE '^(feat|feature|minor):'; then
  BUMP="minor"
elif echo "$PR_TITLE" | grep -iqE '^(fix|hotfix|patch|chore|docs|refactor|style|perf|test|build|ci):'; then
  BUMP="patch"
elif echo "$PR_TITLE" | grep -iqE '^\[skip\]|^skip:'; then
  BUMP="skip"
else
  BUMP="skip"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Release dry-run"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " PR Title : $PR_TITLE"
echo " Bump type: $BUMP"

if [ "$BUMP" = "skip" ]; then
  echo ""
  echo " → No release. Add a prefix like feat:, fix:, feat!: to trigger one."
  echo ""
  exit 0
fi

# ── Calculate next version ────────────────────────────────────────────────────
CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
  major) NEW_VERSION="$((MAJOR + 1)).0.0" ;;
  minor) NEW_VERSION="${MAJOR}.$((MINOR + 1)).0" ;;
  patch) NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))" ;;
esac

DATE=$(date +%Y-%m-%d)
PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$PREV_TAG" ]; then
  COMMITS=$(git log --pretty=format:"- %s" HEAD)
else
  COMMITS=$(git log --pretty=format:"- %s" "${PREV_TAG}..HEAD")
fi

NEW_ENTRY="## v${NEW_VERSION} (${DATE}) [${BUMP}]

**PR:** ${PR_TITLE}

### Changes
${COMMITS}"

echo " Current  : v${CURRENT}"
echo " New      : v${NEW_VERSION}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " CHANGELOG preview"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$NEW_ENTRY"
echo ""

if [ "$APPLY" = "--apply" ]; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " Applying changes..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # Bump package.json
  npm version "$BUMP" --no-git-tag-version
  echo " ✓ package.json → v${NEW_VERSION}"

  # Write CHANGELOG
  if [ -f CHANGELOG.md ]; then
    HEADER=$(head -1 CHANGELOG.md)
    BODY=$(tail -n +2 CHANGELOG.md)
    printf '%s\n\n%s\n%s' "$HEADER" "$NEW_ENTRY" "$BODY" > CHANGELOG.md
  else
    printf '# Changelog\n\n%s\n' "$NEW_ENTRY" > CHANGELOG.md
  fi
  echo " ✓ CHANGELOG.md updated"

  echo ""
  echo " Run: git add package.json CHANGELOG.md && git commit -m \"chore(release): v${NEW_VERSION}\""
  echo ""
else
  echo " (Dry-run — pass --apply to actually bump version and write changelog)"
  echo ""
fi
