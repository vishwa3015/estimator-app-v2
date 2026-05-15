# Dev Setup Guide
## Lint · Conventional Commits · Auto Versioning · Changelog · GitHub Releases

Complete step-by-step guide to replicate this CI/CD workflow in any new project.

---

## What This Sets Up

| Hook / Workflow | When it runs | What it does |
|---|---|---|
| **pre-commit** | Every `git commit` | Blocks if ESLint or TypeScript errors exist |
| **commit-msg** | Every `git commit` | Blocks if commit message has no conventional prefix |
| **pr-title-check.yml** | Every PR opened/edited on GitHub | Fails check if title has no conventional prefix |
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

> **Note:** If not using React, remove `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.

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

> **Tip:** Variables prefixed with `_` (e.g. `_unused`, `_id`) are intentionally ignored by the unused-vars rule. Use this for destructured values you need to discard.

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

Run once to set up husky (creates `.husky/` directory and sets `core.hooksPath`):

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
  echo "  Format : <type>[optional scope]: <description>"
  echo "  Example: feat: add DocuSign integration"
  echo "  Example: fix: broken custom field on proposal"
  echo "  Example: fix(auth): token expiry not handled"
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
          echo ""

          VALID_PATTERN='^(feat!|BREAKING CHANGE|BREAKING|major|feat|feature|minor|fix|hotfix|patch|chore|docs|refactor|style|perf|test|build|ci|skip)(\([^)]+\))?!?:[[:space:]].+|^\[skip\]'

          if echo "$PR_TITLE" | grep -qE "$VALID_PATTERN"; then
            echo "PR title is valid."
            echo ""

            if echo "$PR_TITLE" | grep -iqE '^(feat!|BREAKING CHANGE|BREAKING|major)(\([^)]+\))?!?:'; then
              echo "Type: MAJOR release will be triggered on merge."
            elif echo "$PR_TITLE" | grep -iqE '^(feat|feature|minor)(\([^)]+\))?!?:'; then
              echo "Type: MINOR release will be triggered on merge."
            elif echo "$PR_TITLE" | grep -iqE '^(fix|hotfix|patch|chore|docs|refactor|style|perf|test|build|ci)(\([^)]+\))?!?:'; then
              echo "Type: PATCH release will be triggered on merge."
            elif echo "$PR_TITLE" | grep -iqE '^\[skip\]|^skip(\([^)]+\))?:'; then
              echo "Type: No release will be triggered on merge (skip)."
            fi
            exit 0
          else
            echo "PR title does not follow Conventional Commits format."
            echo ""
            echo "Your title: \"$PR_TITLE\""
            echo ""
            echo "Required format:  <type>[optional scope]: <description>"
            echo ""
            echo "Examples:"
            echo "  feat: add PDF export for estimates"
            echo "  feat(auth): support Google SSO"
            echo "  fix: correct tax calculation on line items"
            echo "  fix(ui): button misaligned on mobile"
            echo "  feat!: redesign estimate API (BREAKING CHANGE)"
            echo "  chore: update dependencies"
            echo "  chore(deps): bump react to v19"
            echo "  docs: update README"
            echo "  skip: internal branch sync"
            echo ""
            echo "Allowed types:"
            echo "  MAJOR release → feat!, BREAKING, major"
            echo "  MINOR release → feat, feature, minor"
            echo "  PATCH release → fix, hotfix, patch, chore, docs,"
            echo "                  refactor, style, perf, test, build, ci"
            echo "  No release    → skip, [skip]"
            echo ""
            echo "Rename your PR title and this check will re-run automatically."
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
          token: ${{ secrets.RELEASE_TOKEN || secrets.GITHUB_TOKEN }}

      # -----------------------------------------------------------------
      # Determine bump type from PR title using Conventional Commits:
      #
      #   MAJOR  →  feat!: …  |  BREAKING: …  |  major: …
      #   MINOR  →  feat: …  |  feature: …  |  minor: …
      #   PATCH  →  fix: …  |  hotfix: …  |  patch: …  |  chore: …
      #             docs: …  |  refactor: …  |  style: …  |  perf: …
      #             test: …  |  build: …  |  ci: …
      #   SKIP   →  skip: …  |  [skip]  |  (no recognized prefix)
      #
      # All types support optional scopes: fix(scope): … feat(scope): …
      # -----------------------------------------------------------------
      - name: Determine version bump from PR title
        id: bump
        run: |
          PR_TITLE="${{ github.event.pull_request.title }}"
          echo "PR title: $PR_TITLE"

          if echo "$PR_TITLE" | grep -iqE '^(feat!|BREAKING CHANGE|BREAKING|major)(\([^)]+\))?!?:'; then
            echo "type=major" >> $GITHUB_OUTPUT
            echo "Bump: MAJOR"
          elif echo "$PR_TITLE" | grep -iqE '^(feat|feature|minor)(\([^)]+\))?!?:'; then
            echo "type=minor" >> $GITHUB_OUTPUT
            echo "Bump: MINOR"
          elif echo "$PR_TITLE" | grep -iqE '^(fix|hotfix|patch|chore|docs|refactor|style|perf|test|build|ci)(\([^)]+\))?!?:'; then
            echo "type=patch" >> $GITHUB_OUTPUT
            echo "Bump: PATCH"
          elif echo "$PR_TITLE" | grep -iqE '^\[skip\]|^skip(\([^)]+\))?:'; then
            echo "type=skip" >> $GITHUB_OUTPUT
            echo "Bump: SKIP (explicit)"
          else
            echo "type=skip" >> $GITHUB_OUTPUT
            echo "Bump: SKIP (no conventional prefix found)"
            echo "::warning::PR title has no Conventional Commits prefix. Add feat:, fix:, feat!: etc. to trigger a release."
          fi

      - name: No release — skipping
        if: steps.bump.outputs.type == 'skip'
        run: |
          echo "::notice::No release for this PR. Use a prefix like feat:, fix:, feat!: in the PR title to trigger a version bump."

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
          echo "Bumped to v${NEW_VERSION}"

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
          git push origin HEAD:${{ github.event.pull_request.base.ref }}
          git push origin "v${{ steps.version.outputs.new_version }}"

      - name: Create GitHub Release
        if: steps.bump.outputs.type != 'skip'
        env:
          GH_TOKEN: ${{ secrets.RELEASE_TOKEN || secrets.GITHUB_TOKEN }}
        run: |
          gh release create "v${{ steps.version.outputs.new_version }}" \
            --title "v${{ steps.version.outputs.new_version }}" \
            --notes-file /tmp/release_notes.md
```

---

## Part 9 — GitHub Repository Setup (Step by Step)

Complete this **after** pushing all the files above to GitHub.

### Step 9.1 — Enable GitHub Actions

1. Go to your repo → **Settings → Actions → General**
2. Under **"Actions permissions"** → select **"Allow all actions and reusable workflows"**
3. Under **"Workflow permissions"** → select **"Read and write permissions"**
4. Click **Save**

---

### Step 9.2 — Create a Personal Access Token (PAT)

The release workflow needs a PAT to push version bump commits to the protected master branch.

1. Go to **github.com → your profile (top-right avatar) → Settings**
2. Scroll down → **Developer settings → Personal access tokens → Tokens (classic)**
3. Click **Generate new token (classic)**
4. Fill in:
   - **Note:** `RELEASE_TOKEN`
   - **Expiration:** No expiration (or 1 year)
   - **Scopes:** Check ✅ **`repo`** (top-level — auto-checks all sub-items) and ✅ **`workflow`**
5. Click **Generate token**
6. **Copy the token immediately** — you cannot see it again

---

### Step 9.3 — Add PAT as Repository Secret

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `RELEASE_TOKEN`
4. Value: paste the token from Step 9.2
5. Click **Add secret**

---

### Step 9.4 — Create Branch Ruleset (blocks invalid PR titles + allows release bot)

> **Important:** Use Rulesets (not classic Branch Protection Rules). Classic rules have no bot bypass support — the release workflow will fail trying to push to master.

1. Go to your repo → **Settings → Rules → Rulesets**
2. Click **New ruleset → New branch ruleset**
3. Fill in:
   - **Ruleset Name:** `master protection`
   - **Enforcement status:** Active

4. **Bypass list** → click **Add bypass** → select **`Repository admin`** → set to **Always allow**
   > This allows the release bot (using your PAT) to push version bump commits directly to master.

5. **Target branches** → click **Add target → Include by pattern** → type `master` → click **Add**

6. Scroll to **Branch rules** → enable:
   - ✅ **Require status checks to pass**
     - Click **Add checks** → search for **`Validate PR Title`** → add it
     - > **Note:** `Validate PR Title` only appears after the `pr-title-check.yml` workflow has run at least once on a PR. If it doesn't appear yet, create and merge one PR first, then come back and add it.

7. Click **Save** (bottom of page)

---

### Step 9.5 — Verify Everything Works

After saving the ruleset:

- Open a new PR with an **invalid title** (e.g. `"updated stuff"`) → the `Validate PR Title` check should fail and the **Merge button should be greyed out**
- Open a PR with a **valid title** (e.g. `fix: something`) → check should pass and Merge button becomes active
- Merge a PR with `feat:` title → version bumps minor, CHANGELOG updated, GitHub Release created

---

## Part 10 — Final File Structure

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

## Part 11 — Commit Message & PR Title Reference

```
feat!: rebuild core engine         → v1.0.0 → v2.0.0  (major)
feat: add new integration          → v1.0.0 → v1.1.0  (minor)
fix: broken field on form          → v1.0.0 → v1.0.1  (patch)
chore: update dependencies         → v1.0.0 → v1.0.1  (patch)
chore(deps): bump react to v19     → v1.0.0 → v1.0.1  (patch)
fix(auth): token not refreshing    → v1.0.0 → v1.0.1  (patch)
docs: update README                → v1.0.0 → v1.0.1  (patch)
skip: internal refactor            → no release
```

**Format:** `<type>[optional scope]: <description>`
- Scopes are optional: `fix: something` and `fix(scope): something` both work
- A space after the colon is required: `fix: something` ✅ — `fix:something` ❌

The same prefixes apply to both **local commit messages** (enforced by commitlint) and **PR titles** (enforced by pr-title-check workflow + release workflow).

---

## Part 12 — New Project Checklist

### Local Setup
- [ ] `npm install` all dependencies (Part 1)
- [ ] Create `eslint.config.js` (Part 2)
- [ ] Create `commitlint.config.js` (Part 3)
- [ ] Update `package.json` scripts and lint-staged (Part 4)
- [ ] Run `npm run prepare` to initialize husky (Part 5)
- [ ] Verify: `git config --local core.hookspath` outputs `.husky/_`
- [ ] Create `.husky/pre-commit` (Part 6)
- [ ] Create `.husky/commit-msg` (Part 6)
- [ ] Create `.github/workflows/pr-title-check.yml` (Part 7)
- [ ] Create `.github/workflows/release.yml` (Part 8)
- [ ] Set starting version in `package.json` → `"version": "1.0.0"`
- [ ] Push everything to GitHub

### GitHub Setup
- [ ] Enable Actions: repo → Settings → Actions → Allow all + Read/write permissions (Step 9.1)
- [ ] Create PAT with `repo` + `workflow` scopes (Step 9.2)
- [ ] Add PAT as repo secret named `RELEASE_TOKEN` (Step 9.3)
- [ ] Create Ruleset with Repository admin bypass + Validate PR Title required check (Step 9.4)

### End-to-End Tests
- [ ] **Test 1:** Commit with a `console.log` → should be blocked by lint
- [ ] **Test 2:** Commit with message `"updated stuff"` → should be blocked by commitlint
- [ ] **Test 3:** Commit with `chore:something` (no space) → should be blocked by commitlint
- [ ] **Test 4:** Open PR with invalid title → `Validate PR Title` check fails, Merge button greyed out
- [ ] **Test 5:** Open PR with `fix: something` → check passes, Merge button active
- [ ] **Test 6:** Merge PR with `fix:` title → patch bump, CHANGELOG updated, GitHub Release created
- [ ] **Test 7:** Merge PR with `feat:` title → minor bump
- [ ] **Test 8:** Merge PR with `feat!:` title → major bump
- [ ] **Test 9:** Merge PR with `chore:` or `chore(scope):` title → patch bump

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| Hooks not running at all | Husky not installed | Run `npm run prepare` |
| `core.hookspath` not set | Husky init skipped | Run `git config core.hookspath .husky/_` |
| Lint passes but shouldn't | `--max-warnings 0` missing | Add it to lint-staged config in `package.json` |
| `_` prefixed vars still flagged | ESLint `varsIgnorePattern` not set | Add `varsIgnorePattern: "^_"` to no-unused-vars rule (Part 2) |
| Actions not triggering | Actions disabled | Repo → Settings → Actions → Allow all |
| `Validate PR Title` not in ruleset search | Workflow never ran yet | Merge one PR first, then add the check to the ruleset |
| Merge button still active with invalid title | Ruleset not saved or wrong check name | Verify ruleset is Active and check name is exactly `Validate PR Title` |
| Release fails: `GH006 Protected branch` | Classic branch protection blocking bot push | Switch to Rulesets with Repository admin bypass (Step 9.4) |
| Release fails: `Permission denied to <username>` | PAT missing `repo` scope or not set | Regenerate PAT with `repo` + `workflow` scopes, update `RELEASE_TOKEN` secret |
| Release fails: tag exists | Re-running after partial failure | Delete the tag locally and on GitHub, then re-run |
| Version not bumping | PR title missing valid prefix | PR title must start with `feat:`, `fix:`, `chore:` etc. |
| `chore(scope):` not bumping | Old regex without scope support | Ensure release.yml has `(\([^)]+\))?!?:` in all patterns |
| GitHub Release fails: tag not pushed | `--follow-tags` only pushes annotated tags | Push tag explicitly: `git push origin "v1.2.3"` (already in Part 8) |
| Release notes contain garbled text | Special chars in commit message via env var | Write notes to file with `printf '%b\n' > /tmp/release_notes.md` (already in Part 8) |
