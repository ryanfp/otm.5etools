#!/usr/bin/env bash
set -euo pipefail

# Wraps the existing `npm run version-bump` with:
#   - Commit listing since last tag
#   - Auto-generated CHANGELOG.md entry
#   - Git push with tags
#   - GitHub Release creation (required — the site changelog page reads from these)
#
# Usage: ./release.sh
#
# Requires: git, npm, node, gh (GitHub CLI)
#

CHANGELOG_FILE="CHANGELOG.md"

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

get_current_version() {
    node -p "require('./package.json').version"
}

get_last_tag() {
    git describe --tags --abbrev=0 2>/dev/null || echo ""
}

get_commits_since() {
    local since="$1"
    if [ -z "$since" ]; then
        git log --oneline --no-decorate
    else
        git log --oneline --no-decorate "${since}..HEAD"
    fi
}

# Generates categorized markdown for changelog file
categorize_commits() {
    local since="$1"
    local commits
    if [ -z "$since" ]; then
        commits=$(git log --format="%s" 2>/dev/null)
    else
        commits=$(git log --format="%s" "${since}..HEAD" 2>/dev/null)
    fi

    local feats="" fixes="" styles="" content="" chores="" other=""

    while IFS= read -r msg; do
        [ -z "$msg" ] && continue
        case "$msg" in
            feat*)    feats="${feats}\n- ${msg}";;
            fix*)     fixes="${fixes}\n- ${msg}";;
            style*)   styles="${styles}\n- ${msg}";;
            content*) content="${content}\n- ${msg}";;
            chore*|docs*|refactor*) chores="${chores}\n- ${msg}";;
            *)        other="${other}\n- ${msg}";;
        esac
    done <<< "$commits"

    local output=""
    [ -n "$feats" ]   && output="${output}\n### Features\n${feats}\n"
    [ -n "$fixes" ]   && output="${output}\n### Fixes\n${fixes}\n"
    [ -n "$styles" ]  && output="${output}\n### Style\n${styles}\n"
    [ -n "$content" ] && output="${output}\n### Content\n${content}\n"
    [ -n "$chores" ]  && output="${output}\n### Maintenance\n${chores}\n"
    [ -n "$other" ]   && output="${output}\n### Other\n${other}\n"

    echo -e "$output"
}

# Generates release body for GitHub
generate_release_body() {
    local since="$1"
    local commits
    if [ -z "$since" ]; then
        commits=$(git log --format="%s" 2>/dev/null)
    else
        commits=$(git log --format="%s" "${since}..HEAD" 2>/dev/null)
    fi

    local output=""

    while IFS= read -r msg; do
        [ -z "$msg" ] && continue

        # Strip conventional commit prefix: "type(scope): desc" or "type: desc" → "desc"
        local clean
        clean=$(echo "$msg" | sed -E 's/^[a-z]+(\([^)]*\))?!?:[[:space:]]*//')

        # Capitalize first letter
        clean="$(echo "${clean:0:1}" | tr '[:lower:]' '[:upper:]')${clean:1}"

        # Add upstream-style prefix based on commit type
        case "$msg" in
            feat*)               output="${output}- Added ${clean}\n";;
            fix*)                output="${output}- Fixed ${clean}\n";;
            style*)              output="${output}- (Style) ${clean}\n";;
            content*)            output="${output}- (Content) ${clean}\n";;
            chore*upstream*)     output="${output}- (Upstream) ${clean}\n";;
            chore*|docs*|refactor*) output="${output}- ${clean}\n";;
            *)                   output="${output}- ${clean}\n";;
        esac
    done <<< "$commits"

    echo -e "$output"
}

# ─────────────────────────────────────────────
# Checks
# ─────────────────────────────────────────────

if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Run this from your repo root."
    exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Error: You have uncommitted changes. Commit or stash them first."
    exit 1
fi

if ! command -v gh &>/dev/null; then
    echo "Error: GitHub CLI (gh) is required — the site changelog page reads from GitHub Releases."
    echo "Install: https://cli.github.com/"
    exit 1
fi

CURRENT_VERSION=$(get_current_version)
LAST_TAG=$(get_last_tag)

echo "========================================"
echo "  5etools Fork Release"
echo "========================================"
echo ""
echo "  Current version:  ${CURRENT_VERSION}"
if [ -n "$LAST_TAG" ]; then
    echo "  Last tag:         ${LAST_TAG}"
else
    echo "  Last tag:         (none — first release)"
fi
echo ""

# ─────────────────────────────────────────────
# Show commits since last release
# ─────────────────────────────────────────────

COMMITS=$(get_commits_since "$LAST_TAG")

if [ -z "$COMMITS" ]; then
    echo "No new commits since last tag. Nothing to release."
    exit 0
fi

echo "Commits since last release:"
echo "────────────────────────────"
echo "$COMMITS"
echo "────────────────────────────"
echo ""

# ─────────────────────────────────────────────
# Prompt for bump type
# ─────────────────────────────────────────────

echo "Bump type:"
echo "  1) patch  — bug fixes, small tweaks          (${CURRENT_VERSION} → next patch)"
echo "  2) minor  — new features, upstream merges     (${CURRENT_VERSION} → next minor)"
echo "  3) major  — breaking changes, milestone       (${CURRENT_VERSION} → next major)"
echo "  4) cancel"
echo ""
read -rp "Choice [1-4]: " BUMP_CHOICE

case "$BUMP_CHOICE" in
    1) BUMP_TYPE="patch";;
    2) BUMP_TYPE="minor";;
    3) BUMP_TYPE="major";;
    4) echo "Cancelled."; exit 0;;
    *) echo "Invalid choice."; exit 1;;
esac

# ─────────────────────────────────────────────
# Optional release title
# ─────────────────────────────────────────────

read -rp "Release title (optional, e.g. 'Upstream Sync Edition'): " RELEASE_TITLE

# ─────────────────────────────────────────────
# Generate changelog + bump version
# ─────────────────────────────────────────────

npm run version-bump -- "$BUMP_TYPE"

NEW_VERSION=$(get_current_version)
NEW_TAG="v${NEW_VERSION}"
RELEASE_DATE=$(date +%Y-%m-%d)

# CHANGELOG.md entry
CHANGELOG_ENTRY="## [${NEW_VERSION}] — ${RELEASE_DATE}\n"
CHANGELOG_ENTRY="${CHANGELOG_ENTRY}$(categorize_commits "$LAST_TAG")"

if [ -f "$CHANGELOG_FILE" ]; then
    EXISTING=$(cat "$CHANGELOG_FILE")
    echo -e "${CHANGELOG_ENTRY}\n${EXISTING}" > "$CHANGELOG_FILE"
else
    echo -e "# Changelog\n\n${CHANGELOG_ENTRY}" > "$CHANGELOG_FILE"
fi

echo ""
echo "Generated changelog entry for ${NEW_VERSION}."
echo ""

# Amend the version-bump commit to include the changelog
git add "$CHANGELOG_FILE"
git commit --amend --no-edit

# Re-tag since we amended the commit
git tag -d "$NEW_TAG" 2>/dev/null || true
git tag "$NEW_TAG"

# ─────────────────────────────────────────────
# Push
# ─────────────────────────────────────────────

read -rp "Push to remote? [y/N]: " PUSH_CONFIRM
if [[ "$PUSH_CONFIRM" =~ ^[Yy]$ ]]; then
    BRANCH=$(git branch --show-current)
    git push origin "$BRANCH"
    git push origin "$NEW_TAG"
    echo "Pushed ${BRANCH} and tag ${NEW_TAG}."
else
    echo "Skipped push. To push manually:"
    echo "  git push origin $(git branch --show-current)"
    echo "  git push origin ${NEW_TAG}"
    echo ""
    echo "Note: GitHub Release will NOT be created until you push the tag."
    echo "Run this script again after pushing, or create the release manually."
    echo "========================================"
    exit 0
fi

# ─────────────────────────────────────────────
# GitHub Release
# ─────────────────────────────────────────────

if [ -n "$RELEASE_TITLE" ]; then
    GH_TITLE="${NEW_TAG}, \"${RELEASE_TITLE}\""
else
    GH_TITLE="${NEW_TAG}"
fi

# release body
RELEASE_BODY=$(generate_release_body "$LAST_TAG")

gh release create "$NEW_TAG" \
    --title "$GH_TITLE" \
    --notes "$RELEASE_BODY"

echo ""
echo "GitHub Release created: ${GH_TITLE}"
echo ""
echo "========================================"
echo "  Released ${NEW_TAG}"
echo "========================================"
