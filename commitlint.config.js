export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Types that map to version bumps (must match release.yml)
    // major: feat! / BREAKING CHANGE
    // minor: feat
    // patch: fix, hotfix, chore, docs, refactor, style, perf, test, build, ci
    "type-enum": [
      2,
      "always",
      [
        "feat",     // minor — new feature
        "fix",      // patch — bug fix
        "hotfix",   // patch — urgent bug fix
        "chore",    // patch — maintenance, no user-facing change
        "docs",     // patch — documentation only
        "refactor", // patch — code restructure, no behaviour change
        "style",    // patch — formatting, whitespace
        "perf",     // patch — performance improvement
        "test",     // patch — adding/fixing tests
        "build",    // patch — build system changes
        "ci",       // patch — CI/CD changes
        "revert",   // patch — reverting a previous commit
        "skip",     // no release
      ],
    ],
    "type-case": [2, "always", "lower-case"],
    "subject-empty": [2, "never"],
    "subject-case": [0], // don't enforce case on the description
    "header-max-length": [2, "always", 100],
  },
};
