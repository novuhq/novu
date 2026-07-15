# LLM auth during `novu connect` scaffold

Implemented. See `pipeline/llm-auth/README.md` for architecture and file roles.

## Scope

- **In:** fresh empty-dir scaffold for `--runtime ai-sdk` and `--runtime langchain`
- **Out:** reconciliation of existing projects, managed runtimes (`demo`, `claude`, `claude-aws`), Google/local models

## Provider matrix (current)

| Choice | AI SDK | LangChain | Auth | Default model |
|--------|--------|-----------|------|---------------|
| OpenAI API key | yes | yes | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic API key | yes | yes | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` |
| ChatGPT subscription | yes | yes | Codex CLI / langchainjs-codex-oauth OAuth | `gpt-5.4-mini` | Tool approval example: API keys + LangChain Codex only |
| Claude subscription | yes | no | Claude Code OAuth | `haiku` | Tool approval example: API keys only |
| Skip | yes | yes | demo echo | — |

## Flags

```bash
npx novu connect --runtime ai-sdk --llm-auth openai --openai-api-key "$OPENAI_API_KEY"
npx novu connect --runtime ai-sdk --llm-auth codex-subscription
npx novu connect --runtime ai-sdk --llm-auth claude-subscription   # ai-sdk only
npx novu connect --runtime langchain --llm-auth codex-subscription
```

`--llm-auth` bypasses the interactive picker without requiring `--ci`.
