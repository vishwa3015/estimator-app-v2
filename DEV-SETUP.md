# Dev Setup Guide
## Lint · Conventional Commits · Auto Versioning · Changelog · GitHub Releases

This document covers the complete setup to replicate this workflow in any new project.

---

## What This Sets Up

| Hook / Workflow | When it runs | What it does |
|---|---|---|
| **pre-commit** | Every `git commit` | Blocks if ESLint errors or TypeScript errors exist |
| **commit-msg** | Every `git commit` | Blocks if commit message has no conventional prefix |
| **GitHub Action** | Every PR merged to `master` | Bumps version, writes CHANGELOG, creates GitHub Release |

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

> **Note:** Adjust `ignores` and plugins to match your project. If not using React, remove the react-hooks and react-refresh plugins.

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

---

## Part 5 — Initialize Husky

Run once to set up husky (creates `.husky/` and sets `core.hooksPath`):

```bash
npm run prepare
```

---

## Part 6 — Git Hooks

### pre-commit hook
Create `.husky/pre-commit`:

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

### commit-msg hook
Create `.husky/commit-msg`:

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

## Part 7 — GitHub Actions Workflow

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
      #   SKIP   →  skip: / [skip] / (no prefix)
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
        id: changelog
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

          DELIM="CHANGELOG_$(openssl rand -hex 8)"
          {
            echo "entry<<${DELIM}"
            printf '%b\n' "$NEW_ENTRY"
            echo "${DELIM}"
          } >> $GITHUB_OUTPUT

      - name: Commit, tag, and push
        if: steps.bump.outputs.type != 'skip'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add package.json package-lock.json CHANGELOG.md
          git add bun.lock bun.lockb 2>/dev/null || true
          git commit -m "chore(release): v${{ steps.version.outputs.new_version }} [skip ci]"
          git tag "v${{ steps.version.outputs.new_version }}"
          git push origin HEAD:${{ github.event.pull_request.base.ref }} --follow-tags

      - name: Create GitHub Release
        if: steps.bump.outputs.type != 'skip'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create "v${{ steps.version.outputs.new_version }}" \
            --title "v${{ steps.version.outputs.new_version }}" \
            --notes "${{ steps.changelog.outputs.entry }}"
```

---

## Part 8 — Final File Structure

After setup your project root should have:

```
your-project/
├── .github/
│   └── workflows/
│       └── release.yml
├── .husky/
│   ├── commit-msg
│   └── pre-commit
├── commitlint.config.js
├── eslint.config.js
├── package.json          ← has "prepare": "husky" and lint-staged config
└── CHANGELOG.md          ← auto-generated on first PR merge
```

---

## Part 9 — Commit Message Reference

```
feat!: rebuild core engine         → v1.0.0 → v2.0.0  (major)
feat: add new integration          → v1.0.0 → v1.1.0  (minor)
fix: broken field on form          → v1.0.0 → v1.0.1  (patch)
chore: update dependencies         → v1.0.0 → v1.0.1  (patch)
docs: update README                → v1.0.0 → v1.0.1  (patch)
skip: internal refactor            → no release
```

---

## Part 10 — New Project Checklist

- [ ] `npm install` all dependencies from Part 1
- [ ] Create `eslint.config.js` (Part 2)
- [ ] Create `commitlint.config.js` (Part 3)
- [ ] Update `package.json` scripts and lint-staged (Part 4)
- [ ] Run `npm run prepare` to initialize husky (Part 5)
- [ ] Create `.husky/pre-commit` (Part 6)
- [ ] Create `.husky/commit-msg` (Part 6)
- [ ] Create `.github/workflows/release.yml` (Part 7)
- [ ] Push to GitHub
- [ ] Make sure the repo has **Actions enabled** (GitHub repo → Settings → Actions → Allow all)
- [ ] Set starting version in `package.json` → `"version": "1.0.0"`
- [ ] Test: try committing without a prefix → should be blocked
- [ ] Test: try committing with a lint error → should be blocked
- [ ] Test: merge a PR with `feat:` title → version should bump minor

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Hooks not running | Run `npm run prepare` again to reinstall husky |
| `core.hookspath` not set | Run `git config core.hookspath .husky/_` manually |
| Action not triggering | Check repo Settings → Actions → make sure Actions are enabled |
| Version not bumping | Confirm PR was merged (not just closed), and PR title has a valid prefix |
| CHANGELOG delimiter error | Make sure the workflow uses `openssl rand -hex 8` for the delimiter (Part 7) |
| `_` prefix variables flagged | Add `varsIgnorePattern: "^_"` to the eslint no-unused-vars rule (Part 2) |
