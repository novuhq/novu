# human — the human API for agents

`human` gives an AI agent or script a one-line way to reach a real person over Telegram, Slack, or email and wait for the answer.

## Install

```bash
npm install -g @novu/human
npx @novu/human setup
```

Setup is completed once by the human. It provisions a keyless Novu environment, creates a relay agent, connects a channel, and stores credentials in `~/.novu/human.json`.

## Use

```bash
human ask "Which environment should I deploy to?"
human approve "Delete 342 stale records from production?"
human choose "Pick a release strategy" --option canary --option blue-green
human tell "Nightly build finished with no failures."
```

Use `human` for unattended work, risky or irreversible actions, consequential multi-way decisions, and completion notifications. Ask the user directly when they are already active in the current conversation.

Add `--json` for a machine-readable interaction object. Add `--async` to return an interaction ID immediately, or `--timeout 10m` to stop waiting locally and later resume with `human wait <id>`.

## Stable exit codes

| Code | Meaning |
| --- | --- |
| `0` | answered, approved, chosen, or delivered |
| `10` | denied |
| `11` | timed out locally; interaction is still pending |
| `12` | expired or canceled |
| `1` | error |

## Authentication

The recommended flow is `npx @novu/human setup`, which creates a temporary keyless environment without an account. Existing Novu environments can set `NOVU_SECRET_KEY`; headless runs also set `HUMAN_TO`. See the [authentication guide](https://gethuman.md/auth.md).

## Resources

- [Developer portal](https://gethuman.md/developers)
- [OpenAPI specification](https://gethuman.md/openapi.json)
- [Full agent guide](https://gethuman.md/llms-full.txt)
- [npm package](https://www.npmjs.com/package/@novu/human)
- [source code](https://github.com/novuhq/novu/tree/main/packages/human)
