# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b80c54b1-aa0c-4807-82e7-252e08651c2f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b80c54b1-aa0c-4807-82e7-252e08651c2f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b80c54b1-aa0c-4807-82e7-252e08651c2f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes it is!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

---

## Contributing & Release Process

### PR Title Convention (required)

Every pull request into `main`/`master` **must** have a title that follows [Conventional Commits](https://www.conventionalcommits.org/). A GitHub Actions check runs automatically on every PR and **blocks merging** if the title is invalid.

**Format:**

```
<type>[optional scope]: <short description>
```

**Examples:**

```
feat: add PDF export for estimates
feat(auth): support Google SSO
fix: correct tax calculation on line items
fix(ui): button misaligned on mobile
feat!: redesign estimate API  ← breaking change, triggers major bump
chore: update dependencies
docs: update README
skip: internal branch sync  ← no release
```

### Allowed types and what they trigger

| Type(s) | Version bump |
|---|---|
| `feat!`, `BREAKING`, `major` | Major (`1.x.x` → `2.0.0`) |
| `feat`, `feature`, `minor` | Minor (`1.0.x` → `1.1.0`) |
| `fix`, `hotfix`, `patch`, `chore`, `docs`, `refactor`, `style`, `perf`, `test`, `build`, `ci` | Patch (`1.0.0` → `1.0.1`) |
| `skip`, `[skip]` | No release |

### What happens on merge

1. The PR title is checked — merge is blocked if invalid.
2. On merge, the **Release** workflow runs automatically:
   - Bumps the version in `package.json` based on the PR title prefix.
   - Appends a new entry to `CHANGELOG.md`.
   - Creates a git tag and a GitHub Release with the changelog as release notes.
3. No manual versioning or tagging is needed.

### Enabling merge blocking (one-time setup)

To enforce the PR title check as a hard merge gate, add it as a required status check:

1. Go to **Settings → Branches** in your GitHub repo.
2. Edit (or create) the branch protection rule for `main`/`master`.
3. Enable **"Require status checks to pass before merging"**.
4. Search for and add **`Validate PR Title`**.
5. Save.
