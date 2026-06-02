---
name: linear-release-setup
description: Generate CI/CD configuration for Linear Release. Use when setting up
  release tracking, configuring CI pipelines for Linear, or integrating deployments
  with Linear releases. Supports GitHub Actions, GitLab CI, CircleCI, and other platforms.
---

# Linear Release Setup

The [linear-release README](https://github.com/linear/linear-release/blob/main/README.md) is the source of truth for commands, flags, installation, environment variables, path filtering, and troubleshooting. Fetch it before generating any config — this skill focuses on the interactive setup workflow and the pipeline modeling decisions the README cannot make for the user.

## Interactive Workflow

### Step 1: Preflight

Before generating config, confirm:

1. **Pipeline exists in Linear** — the user must have created a release pipeline in Linear first (Settings → Releases). Each pipeline has its own access key.
2. **Detect CI platform** — look for `.github/workflows/*.yml` (GitHub Actions), `.gitlab-ci.yml` (GitLab CI), `.circleci/config.yml` (CircleCI), or other CI config.
3. **Detect default branch** — check `git symbolic-ref refs/remotes/origin/HEAD` or the CI config. Don't assume `main`.

### Step 2: Map pipelines, then ask

Start by listing every build the user ships independently — each becomes its own Linear pipeline. Pipeline-vs-stage confusion is the single most common setup mistake, so whenever a split isn't obvious, apply the test in "Stages vs Pipelines" below.

Ask, in order:

1. **CI platform** — if not auto-detected.

2. **What do you ship, and to whom?** Prompt explicitly about common split candidates: production vs. beta or TestFlight, nightly or dogfood builds, staging, per-platform builds (iOS, Android, web), per-service in a monorepo. For each candidate, apply the test: _can these hold different commits at the same time?_ Yes → separate pipelines. No (same immutable build moving through gates) → one pipeline with stages.

3. **For each pipeline: continuous or scheduled?**
   - **Continuous** — every deploy completes a release. Typical for nightlies, dogfood, and web apps that ship on merge.
   - **Scheduled** — releases collect changes over time and move through stages before shipping. Typical for versioned mobile and on-prem.

   **The test:** does the team need to track a release before it ships — naming it, seeing what's queued in it, or moving it through phases (code freeze, QA, etc.)?
   - Yes → **scheduled** (the release exists as an in-progress thing before it ships).
   - No → **continuous** (the release is created at the moment of shipping).

4. **For each scheduled pipeline, ask explicitly:**
   - **Branch model** — just `main`, or `main` + release branches (`release/*`)?
   - **Version source** — calendar (`2026.05`), semver (`1.2.0`), or commit SHA? Derived from branch name, CI variable, file, or git tag?
   - **Stages** — what phases does a release move through before completion (e.g. "code freeze", "in qa")? Stages are gates on one build, not separate pipelines.
   - **Automation** — all manual via `workflow_dispatch`, or automated (e.g. cutting a release branch auto-promotes it)?

5. **Monorepo paths** — if multiple pipelines share one repo, note which paths belong to each and wire up path filters in Linear pipeline settings or via `--include-paths`.

### Step 3: Generate the CI configuration

Fetch the [README](https://github.com/linear/linear-release/blob/main/README.md) first for the current commands, flags, install snippet, and command-targeting rules. For GitHub Actions, prefer the official action (`linear/linear-release-action@v0`); for other platforms, use the CLI binary per the README's Installation section.

#### Runtime requirements (Docker-based CI)

The image running the linear-release job must provide:

- **glibc.** The prebuilt binary is dynamically linked against glibc and will not run on Alpine/musl images. Pick a Debian/Ubuntu base (`debian:bookworm-slim`, `ubuntu:24.04`, `buildpack-deps:bookworm`). Avoid `alpine`, any `*-alpine` tag, and `curlimages/curl` — on musl, the binary fails with an opaque "not found" error because the glibc dynamic loader is absent.
- **`git`.** Slim images do not include it. Install it explicitly: `apt-get update && apt-get install -y git`.
- **`curl`** (or `wget`). Needed to download the CLI binary.

#### GitLab CI: check existing variables

If `.gitlab-ci.yml` already exists, inspect any default `variables:` block. The linear-release job needs a full clone, so override at the job level when project defaults would prevent that:

- `GIT_STRATEGY: clone` — required if the project default is `none` or `empty` (both skip cloning entirely).
- `GIT_DEPTH: 0` — set this on the linear-release job regardless. New GitLab projects default to a shallow clone of depth 20, and projects often lower it further.

Pick the matching example template, adapt it (branch patterns, stage names, paths, version format), and add it to an existing workflow or create a new one. Multiple pipelines mean multiple workflows or jobs, each calling the CLI with its own access key — one secret per pipeline (e.g. `LINEAR_ACCESS_KEY_IOS`, `LINEAR_ACCESS_KEY_WEB`).

| Platform       | Pipeline Type | Example                                                                                                               |
| -------------- | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions | Continuous    | [`github-actions-continuous/`](https://github.com/linear/linear-release/blob/main/examples/github-actions-continuous) |
| GitHub Actions | Scheduled     | [`github-actions-scheduled/`](https://github.com/linear/linear-release/blob/main/examples/github-actions-scheduled)   |
| GitLab CI      | Continuous    | [`gitlab-ci-continuous/`](https://github.com/linear/linear-release/blob/main/examples/gitlab-ci-continuous)           |
| GitLab CI      | Scheduled     | [`gitlab-ci-scheduled/`](https://github.com/linear/linear-release/blob/main/examples/gitlab-ci-scheduled)             |
| CircleCI       | Continuous    | [`circleci-continuous/`](https://github.com/linear/linear-release/blob/main/examples/circleci-continuous)             |
| CircleCI       | Scheduled     | [`circleci-scheduled/`](https://github.com/linear/linear-release/blob/main/examples/circleci-scheduled)               |

Each scheduled example includes a **monorepo** note in the header explaining how to split workflows for path filtering per platform.

### Step 4: Remind about secrets

Tell the user to add the `LINEAR_ACCESS_KEY` secret to their CI environment:

- **GitHub Actions**: Repository Settings → Secrets and variables → Actions → New repository secret
- **GitLab CI**: Settings → CI/CD → Variables
- **CircleCI**: Project Settings → Environment Variables

The access key is created in Linear from the pipeline's settings page. Each pipeline has its own access key.

## Key Concepts

A Linear **release pipeline** is one independent stream of releases, with its own version history, current release, and access key. This is not a CI pipeline; it is the unit Linear uses to track releases, and your CI config calls the CLI to update it. Different products, environments, or distribution channels that ship independently are different pipelines.

Pipelines come in two types — **continuous** and **scheduled**. See the README's [Pipeline Types](https://github.com/linear/linear-release#pipeline-types) section for the canonical description of each.

### Stages vs Pipelines

A **pipeline** is one stream of releases. A **stage** is one phase inside a release on that pipeline. Confusing the two is the single most common setup mistake — work through the test below before writing any config.

**The test:** can two things be in-flight at the same time, holding different commits?

- **Yes** → separate pipelines. TestFlight running on `HEAD` while production ships 1.2 from a release branch. Web staging auto-deploying from `main` while prod lags behind. A hotfix landing in one stream but not the other.
- **No, it's the same build moving through gates** → one pipeline with stages. A release is cut at 1.2, goes through code freeze, QA, and RC soak, then ships. The build never changes; only the phase does.

Stages are process gates: "code freeze", "in qa", "in review", "rc soak". They only exist on scheduled pipelines.

**Ambiguous cases — apply the test:**

- **Beta / TestFlight.** TestFlight soak before GA on the _same build_ → stage on the production pipeline. A separate nightly or dogfood channel shipping _distinct builds_ → its own pipeline.
- **Staging.** Staging that auto-deploys from `main` (or runs hotfixes prod doesn't have) → separate pipeline. Staging that holds the exact same build as prod, just earlier in the promotion path → stage.
- **Per-service monorepo.** Each service that ships independently → its own pipeline, scoped by path filters. Unambiguous; services are never stages.

Stages can also be **frozen** in Linear. A frozen stage makes `sync` (without `--release-version`) skip that release and land commits on the next one — a safety net for code freezes. This is a process tool, not a way to squeeze two pipelines into one.

## Reference

Everything about commands, flags, environment variables, command targeting, path filtering, JSON output, and troubleshooting lives in the [linear-release README](https://github.com/linear/linear-release#readme). For GitHub Action inputs and how they map to CLI flags, see the [action README](https://github.com/linear/linear-release-action#inputs). Always fetch these rather than relying on memory — they move ahead of this skill.

### Checklist

- [ ] Full clone / `fetch-depth: 0` (GitLab: `GIT_DEPTH: 0`, and `GIT_STRATEGY` not `none`)
- [ ] `LINEAR_ACCESS_KEY` set as a secret (one per pipeline)
- [ ] Correct binary platform (`linux-x64`, `darwin-arm64`, or `darwin-x64`)
- [ ] Docker-based CI: glibc base image (no Alpine/musl) with `git` and `curl` available
- [ ] Triggers on the correct branches (`main` for continuous; `main` + `release/*` for scheduled)
- [ ] Monorepo: path filters set (in Linear config or via `--include-paths`), and separate workflows if using release branches
