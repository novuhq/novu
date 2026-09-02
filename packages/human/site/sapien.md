# human for people

`human` lets an AI agent send a question, approval request, choice, or notification to a real person over Telegram, Slack, or email. The calling process can wait until that person responds and then continue from a stable exit code or structured JSON result.

## Quickstart

```bash
npx @novu/human setup
human approve "Ship version 2.4.1 to production?" --from deploy-bot --timeout 15m
```

The setup command connects your preferred channel. Agents can then reach you without knowing which messaging provider you chose.

Read the [agent quickstart](https://gethuman.md/index.md), [developer portal](https://gethuman.md/developers), or [source code](https://github.com/novuhq/novu/tree/main/packages/human).
