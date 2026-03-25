# Enterprise Submodule Setup

Use this skill when making changes to the enterprise submodule (`.source/`) or enterprise packages (`enterprise/packages/*`), or when the enterprise submodule needs to be initialized/updated.

## Overview

Novu uses a git submodule at `.source` pointing to `git@github.com:novuhq/packages-enterprise.git`. The enterprise packages in `enterprise/packages/` have their `src` directories symlinked to `.source/<package>/src`.

## Initial Setup

1. **Configure git for submodule recursion:**
   ```bash
   git config --global submodule.recurse true
   ```

2. **Initialize the submodule:**
   ```bash
   git submodule update --init --recursive
   ```
   If SSH is unavailable (e.g., in cloud environments), configure HTTPS fallback:
   ```bash
   git config --global url."https://github.com/".insteadOf "git@github.com:"
   gh auth setup-git
   ```

3. **Add enterprise env vars** to `apps/api/src/.env` and `apps/worker/src/.env`:
   ```
   NOVU_ENTERPRISE=true
   ```

4. **Install and build with enterprise:**
   ```bash
   pnpm install:with-ee
   pnpm build
   ```
   `install:with-ee` runs `pnpm install` then `pnpm symlink:submodules` which symlinks `src` dirs from `.source/` into `enterprise/packages/`.

## Pulling Changes

1. `git pull` in the main repository (with `submodule.recurse=true`, submodule changes are fetched but NOT merged).
2. For development in the submodule: `cd .source && git checkout <branch> && git pull`

## Making Changes in the Submodule

1. Pull latest from both repos.
2. Create branches in both the main repo and submodule using the same Conventional Commits name (e.g., `feat/scope-description-fixes-NOV-123`). **Start from a branch in the submodule, not a detached HEAD.**
3. Implement changes.
4. Commit in the **submodule first**, then the main repo.
5. Push the submodule branch from inside `.source/`: `git push`
6. Create the enterprise PR from the workspace root (do NOT `cd` into the submodule):
   ```bash
   gh pr create --repo novuhq/packages-enterprise --head <branch-name> --base next --title "..." --body "..."
   ```
   If this fails due to permissions, give the user this link instead:
   ```
   https://github.com/novuhq/packages-enterprise/compare/next...<branch-name>
   ```
7. Push the main repo branch and create its PR with `gh pr create`. Mention the enterprise PR link in the body.
8. **Merge the submodule PR first**, then the main repo PR (to avoid broken builds for teammates).

## Troubleshooting

- `fatal: could not get a repository handle for submodule '.source'`:
  - Delete `.git/modules/` contents
  - Run `git submodule update --init --recursive`

- Untracked working tree files error on checkout:
  - `git submodule deinit -f enterprise`
  - Checkout to branch and pull
  - `git submodule update --init --recursive`

- Nuclear option:
  ```bash
  pnpm run clean
  rm -rf node_modules
  pnpm i
  pnpm run symlink:submodules
  pnpm nx run-many --target=build --all --skip-nx-cache
  ```

## Key Points

- The `.source` directory contains the actual enterprise source code (private repo).
- `enterprise/packages/*/src` are symlinks to `.source/*/src`.
- Enterprise packages: `@novu/ee-auth`, `@novu/ee-api`, `@novu/ee-dal`, `@novu/ee-billing`, `@novu/ee-translation`, `@novu/ee-shared-services`.
- The `check-ee.mjs` script in each enterprise package only builds if the `src` folder exists (graceful degradation for OSS contributors).
