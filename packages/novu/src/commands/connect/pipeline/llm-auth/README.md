# LLM auth during bridge scaffold

Wires an LLM provider when `novu connect` scaffolds a **new** ai-sdk or langchain agent app into an empty directory. Reconciliation of existing projects is out of scope.

## Flow

```
empty dir detected
  → resolveLlmAuthChoice()     picker or --llm-auth flags
  → ensureSubscriptionAuth()   CLI OAuth when subscription kind (releases Ink TUI)
  → confirmScaffold()          Ink or console prompt if terminal was released
  → installTemplate()          registry deps/env + codegen → .env.local + agent handler
```

Entry point: `bridge-adapter/engine.ts` calls `resolveLlmAuthChoice` before scaffold confirm.

## Files

| File | Role |
|------|------|
| `types.ts` | `LlmAuthChoice` union; CLI uses short names (`openai`), internal uses precise kinds (`openai-api-key`) |
| `resolve-llm-auth.ts` | Interactive picker vs `--llm-auth` flag resolution |
| `ensure-subscription-auth.ts` | Codex / LangChain Codex / Claude Code login orchestration |
| `subscription-auth.ts` | Credential detection + `runInteractiveCli` for OAuth subprocesses |
| `registry.ts` | Per-kind npm packages and `.env.local` keys |
| `llm-auth-options.ts` | Picker labels; Claude subscription omitted for langchain |
| `codegen/` | Generated `support-agent.tsx` and `next.config.mjs` |

## CLI flags

`--llm-auth` skips the Ink picker even without `--ci`. Pair API-key kinds with `--openai-api-key` or `--anthropic-api-key` in non-interactive mode.

Subscription kinds run OAuth on the local machine; tokens are not stored in Novu cloud. Warn when `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` are set in the shell (may override subscription billing).
