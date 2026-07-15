# Syncing agent skills into the docs site

The Novu agent skills live in their own source-of-truth repository,
[`novuhq/skills`](https://github.com/novuhq/skills), and are published to AI agents
via `npx skills add novuhq/skills`. The Mintlify docs site (built from this
monorepo's [`docs/`](../docs) folder) also serves them at `/skill.md` and
`/.well-known/skills/*`.

To serve custom skills, Mintlify reads `docs/.mintlify/skills/<name>/SKILL.md`.
Because Mintlify **does not initialise git submodules** at build time, and only
resolves symlinks **within the same repo**, the skills must exist as real,
committed files. We therefore vendor them with an automated sync instead of a
submodule or symlink.

## How it works

- [`scripts/sync-skills.sh`](./sync-skills.sh) shallow-clones `novuhq/skills`,
  validates each `SKILL.md` has the YAML frontmatter Mintlify requires
  (`name` + `description`), and mirrors the valid skills into
  `docs/.mintlify/skills/` (removing any skill that no longer exists upstream).
- [`.github/workflows/sync-skills.yml`](../.github/workflows/sync-skills.yml)
  runs the script and opens/updates a PR whenever the vendored copy drifts.

> Do not edit `docs/.mintlify/skills/` by hand — it is regenerated on every sync.

### Run locally

```bash
scripts/sync-skills.sh
# Override the source ref or destination if needed:
SKILLS_REF=main DEST_DIR=docs/.mintlify/skills scripts/sync-skills.sh
# Fail the run if any skill is missing required frontmatter:
STRICT=true scripts/sync-skills.sh
```

## Triggers

The workflow runs on:

- `schedule` — a daily safety-net sync.
- `workflow_dispatch` — manual runs, with optional `ref` (source branch/tag/sha)
  and `base` (PR base branch) inputs.
- `repository_dispatch` (event type `skills-updated`) — for near-instant sync
  fired by `novuhq/skills` on push to `main`.

### Optional: instant sync from `novuhq/skills`

By default the daily schedule keeps things in sync. For instant updates, add the
following workflow to the **`novuhq/skills`** repository so a push to `main`
notifies this repo to sync. This requires a repo/PAT secret in `novuhq/skills`
(here `NOVU_REPO_DISPATCH_TOKEN`) with `contents: write` (or workflow) access to
`novuhq/novu`:

```yaml
# .github/workflows/notify-docs-sync.yml (in novuhq/skills)
name: Notify docs to sync skills
on:
  push:
    branches: [main]
    paths: ["skills/**"]
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Dispatch sync to novuhq/novu
        env:
          GH_TOKEN: ${{ secrets.NOVU_REPO_DISPATCH_TOKEN }}
        run: |
          gh api repos/novuhq/novu/dispatches \
            -f event_type=skills-updated \
            -F client_payload[ref]="${GITHUB_SHA}"
```

## PR authorship token

The sync workflow opens its PR with `secrets.SKILLS_SYNC_TOKEN` when present,
falling back to `GITHUB_TOKEN`. Provide a bot PAT as `SKILLS_SYNC_TOKEN` if you
want the PR to trigger downstream CI checks (PRs created with the default
`GITHUB_TOKEN` do not trigger other workflows).

## Known issue: skills missing frontmatter

Mintlify requires custom skill files to begin with YAML frontmatter containing
`name` and `description`. Any skill that fails this check is **skipped** by the
sync (and listed in the job summary) so one malformed skill never blocks the
rest. As of this writing, `connect-agent/SKILL.md` in `novuhq/skills` has no
frontmatter and is skipped — fix it upstream in `novuhq/skills` to include it.
