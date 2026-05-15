# Dev Setup Guide
## Lint · Conventional Commits · Auto Versioning · Changelog · GitHub Releases

Complete setup guide to replicate this workflow in any new project.

---

## What This Sets Up

| Hook / Workflow | When it runs | What it does |
|---|---|---|
| **pre-commit** | Every `git commit` | Blocks if ESLint or TypeScript errors exist |
| **commit-msg** | Every `git commit` | Blocks if commit message has no conventional prefix |
| **pr-title-check.yml** | Every PR opened/edited on GitHub | Blocks PR if title has no conventional prefix |
| **release.yml** | Every PR merged to `master`/`main` | Bumps version, writes CHANGELOG, creates GitHub Release |

---

## Part 1 — Install Dependencies

Inside your project folder (where `package.json` lives):

```bash
npm install --save-dev \
  husky \
  lint-staged \
  @commitlint/cli \
  @commitlint/config-conventional \
  eslint \
  typescript-eslint \
  @eslint/js \
  globals \
  eslint-plugin-react-hooks \
  eslint-plugin-react-refresh
```

---

## Part 2 — ESLint Config

Create `eslint.config.js` in the project root:

```js
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "no-console": "error",
      "no-debugger": "error",
    },
  }
);
```

> **Note:** If not using React, remove the react-hooks and react-refresh plugins and imports.

> **Tip:** Variables prefixed with `_` (e.g. `_unused`, `_product_id`) are intentionally ignored by the unused-vars rule. Use this for destructured values you need to discard.

---

## Part 3 — Commitlint Config

Create `commitlint.config.js` in the project root:

```js
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",     // minor — new feature
        "fix",      // patch — bug fix
        "hotfix",   // patch — urgent fix
        "chore",    // patch — maintenance
        "docs",     // patch — documentation
        "refactor", // patch — code restructure
        "style",    // patch — formatting
        "perf",     // patch — performance
        "test",     // patch — tests
        "build",    // patch — build system
        "ci",       // patch — CI/CD
        "revert",   // patch — revert commit
        "skip",     // no release
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
  },
};
```

---

## Part 4 — package.json Scripts

Add/update these fields in `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "prepare": "husky"
  },
  "lint-staged": {
    "**/*.{ts,tsx}": [
      "eslint --max-warnings 0"
    ]
  }
}
```

> **Note:** `--max-warnings 0` means ESLint warnings also block commits, not just errors.

---

## Part 5 — Initialize Husky

Run once to set up husky (creates `.husky/` and sets `core.hooksPath`):

```bash
npm run prepare
```

Verify it worked:
```bash
git config --local core.hookspath
# Should output: .husky/_
```

---

## Part 6 — Git Hooks

### `.husky/pre-commit`

```sh
#!/usr/bin/env sh

echo "Running lint checks..."
npx lint-staged
LINT_EXIT=$?

if [ $LINT_EXIT -ne 0 ]; then
  echo ""
  echo "Commit blocked: fix ESLint errors above before committing."
  exit 1
fi

echo "Running type check..."
npx tsc --noEmit
TSC_EXIT=$?

if [ $TSC_EXIT -ne 0 ]; then
  echo ""
  echo "Commit blocked: fix TypeScript errors above before committing."
  exit 1
fi

echo "All checks passed."
```

### `.husky/commit-msg`

```sh
#!/usr/bin/env sh

npx --no -- commitlint --edit "$1"
EXIT=$?

if [ $EXIT -ne 0 ]; then
  echo ""
  echo "Commit blocked: message must follow Conventional Commits format."
  echo ""
  echo "  Format : <type>: <description>"
  echo "  Example: feat: add DocuSign integration"
  echo "  Example: fix: broken custom field on proposal"
  echo "  Example: chore: update dependencies"
  echo ""
  echo "  Types that trigger a release:"
  echo "    feat!: or major:  → major bump  (breaking change)"
  echo "    feat:             → minor bump  (new feature)"
  echo "    fix: / chore: / docs: / refactor: / etc. → patch bump"
  echo "    skip:             → no release"
  echo ""
  exit 1
fi
```

---

## Part 7 — GitHub Actions: PR Title Check

This workflow runs on every PR and **fails the check** if the title has no conventional prefix. Set it as a required check (Part 11) to block merging entirely.

Create `.github/workflows/pr-title-check.yml`:

```yaml
name: PR Title Check

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]
    branches: [main, master]

jobs:
  validate-title:
    name: Validate PR Title
    runs-on: ubuntu-latest

    steps:
      - name: Check PR title follows Conventional Commits
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
        run: |
          echo "PR Title: $PR_TITLE"

          VALID_PATTERN='^(feat!|BREAKING CHANGE|BREAKING|major|feat|feature|minor|fix|hotfix|patch|chore|docs|refactor|style|perf|test|build|ci|skip)(\([^)]+\))?!?:[[:space:]].+'

          if echo "$PR_TITLE" | grep -qE "$VALID_PATTERN"; then
            echo "PR title is valid."
            if echo "$PR_TITLE" | grep -iqE '^(feat!|BREAKING CHANGE|BREAKING|major)(\([^)]+\))?!?:'; then
              echo "→ MAJOR release will be triggered on merge."
            elif echo "$PR_TITLE" | grep -iqE '^(feat|feature|minor)(\([^)]+\))?!?:'; then
              echo "→ MINOR release will be triggered on merge."
            elif echo "$PR_TITLE" | grep -iqE '^(fix|hotfix|patch|chore|docs|refactor|style|perf|test|build|ci)(\([^)]+\))?!?:'; then
              echo "→ PATCH release will be triggered on merge."
            else
              echo "→ No release will be triggered on merge."
            fi
            exit 0
          else
            echo "PR title does not follow Conventional Commits format."
            echo ""
            echo "Your title: \"$PR_TITLE\""
            echo ""
            echo "Required format:  <type>: <description>"
            echo "Examples:"
            echo "  feat: add PDF export"
            echo "  fix: correct tax calculation"
            echo "  feat!: redesign estimate API (breaking change)"
            echo "  chore: update dependencies"
            exit 1
          fi
```

---

## Part 8 — GitHub Actions: Release Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  pull_request:
    types: [closed]
    branches: [main, master]

permissions:
  contents: write

jobs:
  release:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      # Determine bump type from PR title:
      #   MAJOR  →  feat!: / BREAKING: / major:
      #   MINOR  →  feat: / feature: / minor:
      #   PATCH  →  fix: / hotfix: / chore: / docs: / refactor: / style: / perf: / test: / build: / ci:
      #   SKIP   →  skip: / [skip] / (no recognized prefix)
      - name: Determine version bump from PR title
        id: bump
        run: |
          PR_TITLE="${{ github.event.pull_request.title }}"
          echo "PR title: $PR_TITLE"

          if echo "$PR_TITLE" | grep -iqE '^(feat!|BREAKING CHANGE|BREAKING|major):'; then
            echo "type=major" >> $GITHUB_OUTPUT
          elif echo "$PR_TITLE" | grep -iqE '^(feat|feature|minor):'; then
            echo "type=minor" >> $GITHUB_OUTPUT
          elif echo "$PR_TITLE" | grep -iqE '^(fix|hotfix|patch|chore|docs|refactor|style|perf|test|build|ci):'; then
            echo "type=patch" >> $GITHUB_OUTPUT
          elif echo "$PR_TITLE" | grep -iqE '^\[skip\]|^skip:'; then
            echo "type=skip" >> $GITHUB_OUTPUT
          else
            echo "type=skip" >> $GITHUB_OUTPUT
            echo "::warning::No conventional prefix in PR title. Add feat:, fix:, feat!: etc. to trigger a release."
          fi

      - name: No release — skipping
        if: steps.bump.outputs.type == 'skip'
        run: echo "::notice::No release for this PR."

      - uses: actions/setup-node@v4
        if: steps.bump.outputs.type != 'skip'
        with:
          node-version: '20'

      - name: Bump version in package.json
        if: steps.bump.outputs.type != 'skip'
        id: version
        run: |
          npm version ${{ steps.bump.outputs.type }} --no-git-tag-version
          NEW_VERSION=$(node -p "require('./package.json').version")
          echo "new_version=$NEW_VERSION" >> $GITHUB_OUTPUT

      - name: Generate CHANGELOG entry
        if: steps.bump.outputs.type != 'skip'
        run: |
          VERSION="v${{ steps.version.outputs.new_version }}"
          DATE=$(date +%Y-%m-%d)
          BUMP_TYPE="${{ steps.bump.outputs.type }}"
          PR_TITLE="${{ github.event.pull_request.title }}"
          PR_NUMBER="${{ github.event.pull_request.number }}"
          PREV_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

          if [ -z "$PREV_TAG" ]; then
            COMMITS=$(git log --pretty=format:"- %s" HEAD)
          else
            COMMITS=$(git log --pretty=format:"- %s" "${PREV_TAG}..HEAD")
          fi

          NEW_ENTRY="## ${VERSION} (${DATE}) [${BUMP_TYPE}]\n\n**PR #${PR_NUMBER}:** ${PR_TITLE}\n\n### Changes\n${COMMITS}"

          if [ -f CHANGELOG.md ]; then
            HEADER=$(head -1 CHANGELOG.md)
            BODY=$(tail -n +2 CHANGELOG.md)
            printf '%s\n\n%b\n%s' "$HEADER" "$NEW_ENTRY" "$BODY" > CHANGELOG.md
          else
            printf '# Changelog\n\n%b\n' "$NEW_ENTRY" > CHANGELOG.md
          fi

          # Write release notes to file — avoids env var interpolation issues
          # with special characters in commit messages
          printf '%b\n' "$NEW_ENTRY" > /tmp/release_notes.md

      - name: Commit, tag, and push
        if: steps.bump.outputs.type != 'skip'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json package-lock.json CHANGELOG.md
          git add bun.lock bun.lockb 2>/dev/null || true
          git commit -m "chore(release): v${{ steps.version.outputs.new_version }} [skip ci]"
          git tag "v${{ steps.version.outputs.new_version }}"
          # Push commit and tag separately — --follow-tags only pushes annotated tags,
          # not lightweight tags created with 'git tag'
          git push origin HEAD:${{ github.event.pull_request.base.ref }}
          git push origin "v${{ steps.version.outputs.new_version }}"

      - name: Create GitHub Release
        if: steps.bump.outputs.type != 'skip'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create "v${{ steps.version.outputs.new_version }}" \
            --title "v${{ steps.version.outputs.new_version }}" \
            --notes-file /tmp/release_notes.md
```

---

## Part 9 — Final File Structure

```
your-project/
├── .github/
│   └── workflows/
│       ├── pr-title-check.yml   ← validates PR title on GitHub
│       └── release.yml          ← bumps version + changelog + release on merge
├── .husky/
│   ├── commit-msg               ← blocks bad commit messages locally
│   └── pre-commit               ← blocks lint/TS errors locally
├── commitlint.config.js
├── eslint.config.js
├── package.json                 ← has "prepare": "husky" and lint-staged config
└── CHANGELOG.md                 ← auto-generated on first PR merge
```

---

## Part 10 — Commit Message & PR Title Reference

```
feat!: rebuild core engine         → v1.0.0 → v2.0.0  (major)
feat: add new integration          → v1.0.0 → v1.1.0  (minor)
fix: broken field on form          → v1.0.0 → v1.0.1  (patch)
chore: update dependencies         → v1.0.0 → v1.0.1  (patch)
docs: update README                → v1.0.0 → v1.0.1  (patch)
skip: internal refactor            → no release
```

The same prefixes apply to both **local commit messages** (enforced by commitlint) and **PR titles** (enforced by pr-title-check workflow + release workflow).

---

## Part 11 — Make PR Title Check Required (Recommended)

To prevent merging PRs with invalid titles on GitHub:

1. Go to your repo → **Settings → Branches**
2. Click **Add branch protection rule** (or edit existing)
3. Set branch name pattern: `master` (or `main`)
4. Enable **"Require status checks to pass before merging"**
5. Search for and add: **`Validate PR Title`**
6. Save

Now GitHub will block the **Merge** button until the PR title passes the check.

---

## Part 12 — New Project Checklist

- [ ] `npm install` all dependencies (Part 1)
- [ ] Create `eslint.config.js` (Part 2)
- [ ] Create `commitlint.config.js` (Part 3)
- [ ] Update `package.json` scripts and lint-staged (Part 4)
- [ ] Run `npm run prepare` to initialize husky (Part 5)
- [ ] Create `.husky/pre-commit` (Part 6)
- [ ] Create `.husky/commit-msg` (Part 6)
- [ ] Create `.github/workflows/pr-title-check.yml` (Part 7)
- [ ] Create `.github/workflows/release.yml` (Part 8)
- [ ] Push to GitHub
- [ ] Enable Actions: repo → Settings → Actions → Allow all
- [ ] Set branch protection + required check `Validate PR Title` (Part 11)
- [ ] Set starting version in `package.json` → `"version": "1.0.0"`
- [ ] **Test 1:** Commit with a `console.log` → should be blocked by lint
- [ ] **Test 2:** Commit with message `"updated stuff"` → should be blocked by commitlint
- [ ] **Test 3:** Open PR with invalid title → `Validate PR Title` check should fail
- [ ] **Test 4:** Merge PR with `feat:` title → version bumps minor, CHANGELOG updated, GitHub Release created
- [ ] **Test 5:** Merge PR with `chore:` or `chore(scope):` title → patch bump triggered

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Hooks not running at all | Husky not installed | Run `npm run prepare` |
| `core.hookspath` not set | Husky init skipped | Run `git config core.hookspath .husky/_` |
| Lint passes but shouldn't | `--max-warnings 0` missing | Add it to lint-staged config in `package.json` |
| Actions not triggering | Actions disabled | Repo → Settings → Actions → Allow all |
| Version not bumping | PR closed but not merged, or no valid prefix | Confirm PR was **merged** and title starts with `feat:`, `fix:`, etc. |
| GitHub Release fails: tag exists locally but not pushed | `--follow-tags` only pushes annotated tags, not lightweight | Push tag explicitly: `git push origin "v1.2.3"` (already fixed in Part 8) |
| GitHub Release fails: delimiter not found | Commit message contains special characters breaking heredoc | Write release notes to a file with `printf '%b\n' > /tmp/release_notes.md` (already fixed in Part 8) |
| PR merged without version bump | PR title missing prefix | Always start PR title with `feat:`, `fix:`, `feat!:`, etc. |
| `_` prefixed variables still flagged | ESLint `varsIgnorePattern` not set | Add `varsIgnorePattern: "^_"` to no-unused-vars rule (Part 2) |
