# Contributing

## Commit Message Format

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>
```

| Type | Version bump | When to use |
|---|---|---|
| `feat!:` | Major | Breaking change or major capability |
| `feat:` | Minor | New feature or integration |
| `fix:` / `hotfix:` | Patch | Bug fix |
| `chore:` / `docs:` / `refactor:` / `style:` / `perf:` / `test:` / `ci:` | Patch | Maintenance |
| `skip:` | None | Internal work, no release |

Commits without a valid prefix are **blocked** by the pre-commit hook.

## Examples

```
feat: add Hover measurement integration
fix: correct proposal PDF line item total
feat!: rebuild AI estimation engine
chore: update dependencies
docs: add API setup guide
```

## Release Flow

Version bumps happen automatically when a PR is merged to `master`. The PR title determines the bump type using the same convention above.
# Minor bump test
# Major bump test
