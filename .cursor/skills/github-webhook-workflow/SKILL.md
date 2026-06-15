---
name: github-webhook-workflow
description: Author path-gated GitHub Actions workflows that POST a webhook to an external service (e.g. Cursor automation) when specific files change, while passing Novu's workflow-security-lint. Use when creating a workflow that notifies an external endpoint on file/path changes, sends a webhook from CI, or triggers automation on push/PR for a given path.
disable-model-invocation: true
---

# GitHub Webhook Workflow

Author a `.github/workflows/*.yml` workflow that fires a webhook to an external service when specific files change. The result must pass `.github/workflows/scripts/check-workflow-security.py` (run by the `Workflow security lint` job on any `.github/workflows/**` change).

## Hard requirements (security lint)

These are **blocking** — the lint fails the PR otherwise:

1. **No `${{ ... }}` interpolation inside `run:` blocks.** Route every `github.*`, `inputs.*`, and `secrets.*` value through the step's `env:` map and reference it as a shell variable (`"$VAR"`). This prevents script injection.
2. **Pin every external action to a 40-char commit SHA**, with the human tag as a trailing comment: `owner/repo@<sha> # v4`. Local (`./`) and `docker://` refs are exempt.
3. **No static AWS keys** (`secrets.AWS_ACCESS_KEY_ID` / `secrets.AWS_SECRET_ACCESS_KEY`) — use OIDC if AWS is needed.

## Template

```yaml
name: Notify <Service> on <Thing> Change

on:
  push:
    paths:
      - "path/to/watched/file.ext"

permissions:
  contents: read

concurrency:
  group: "${{ github.workflow }}-${{ github.ref }}"
  cancel-in-progress: true

jobs:
  trigger-webhook:
    name: Trigger <Service> webhook
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - name: Send webhook
        env:
          WEBHOOK_URL: ${{ secrets.WEBHOOK_URL }}
          WEBHOOK_TOKEN: ${{ secrets.WEBHOOK_TOKEN }}
          REPOSITORY: ${{ github.repository }}
          REF: ${{ github.ref }}
          SHA: ${{ github.sha }}
          ACTOR: ${{ github.actor }}
        run: |
          if [ -z "$WEBHOOK_URL" ] || [ -z "$WEBHOOK_TOKEN" ]; then
            echo "::error::WEBHOOK_URL / WEBHOOK_TOKEN secret is not set"
            exit 1
          fi

          payload=$(jq -n \
            --arg event "thing-changed" \
            --arg repository "$REPOSITORY" \
            --arg ref "$REF" \
            --arg sha "$SHA" \
            --arg actor "$ACTOR" \
            '{event: $event, repository: $repository, ref: $ref, sha: $sha, actor: $actor}')

          http_code=$(curl --silent --show-error --location \
            --retry 3 --retry-connrefused \
            --output /dev/null --write-out "%{http_code}" \
            --request POST "$WEBHOOK_URL" \
            --header "Content-Type: application/json" \
            --header "Authorization: Bearer $WEBHOOK_TOKEN" \
            --data "$payload")

          echo "Webhook responded with HTTP $http_code"

          if [ "$http_code" -lt 200 ] || [ "$http_code" -ge 300 ]; then
            echo "::error::Webhook failed with HTTP $http_code"
            exit 1
          fi
```

## Key choices

- **Payload via `jq -n`**, never string-interpolated JSON — avoids escaping/injection bugs. Each value is a `--arg` bound to an env var.
- **Explicit non-2xx check** instead of relying on `curl --fail`. GitHub runs `run:` with `bash -eo pipefail`, so `--fail` + command-substitution would abort before any status line prints; the explicit `if` gives a clear error and meaningful logging.
- **`--location`** follows redirects; **`--retry 3 --retry-connrefused`** hardens against transient failures.
- **Auth**: default to `Authorization: Bearer $TOKEN`. If the endpoint expects HMAC signing instead (e.g. `X-Hub-Signature-256`), compute it with `openssl` over the payload.
- **`paths:` works on `push` and `pull_request` only.** For "on merge", use `pull_request` with `types: [closed]` and gate on `github.event.pull_request.merged`.
- **Branch scope**: bare `push` fires on every branch touching the path. Add `branches:` to limit to `main`/`next` if that's the intent — confirm with the user.

## Verify before opening a PR

```bash
python3 .github/workflows/scripts/check-workflow-security.py
```

Exit 0 with no warnings/errors referencing your new file means it's clean (pre-existing warnings in other files are fine).

## Ops follow-up

Remind the user to add the required repository secrets (e.g. `WEBHOOK_URL`, `WEBHOOK_TOKEN`); the job fails fast if they're missing.
