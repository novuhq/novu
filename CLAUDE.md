@AGENTS.md

## Claude Code cloud sessions

In a cloud session (`CLAUDE_CODE_REMOTE=true`) the SessionStart hook `scripts/claude-cloud/session-start.sh` prepares the workspace: enterprise submodule (`.source`), `pnpm install`, `.env` files, and Docker services (MongoDB 27017, Redis 6379, ClickHouse 8123, LocalStack 4566). `pnpm build:agents`, ClickHouse migrations and the agent user/org seed then run in the background.

- Before starting apps or running e2e tests, wait until `/tmp/novu-cloud/ready` exists (failure: `/tmp/novu-cloud/failed`); the log is `/tmp/novu-cloud/setup.log`.
- If Docker services are down (e.g. after the VM was paused), re-run `bash scripts/claude-cloud/session-start.sh`.
- If the hook reports enterprise as unavailable, work stays Community Edition only; say so instead of guessing at enterprise code.
- `gh pr` / `gh issue` use GraphQL and are blocked in cloud sessions; use `gh api repos/novuhq/novu/...` instead.
