# LLM auth during bridge scaffold

Wires an LLM provider when `novu connect` scaffolds a **new** ai-sdk or langchain agent app into an empty directory. Reconciliation of existing projects is out of scope.

## Flow

```
empty dir detected
  → resolveLlmAuthChoice()     picker or --llm-auth flags
  → ensureSubscriptionAuth()   CLI OAuth when subscription kind (releases Ink TUI)
  → confirmScaffold()          Ink or console prompt if terminal was released
  → installTemplate()          registry deps/env + codegen → package.json provider deps + .env.local + agent handler + next.config
```

`installTemplate` installs provider packages from `registry.ts` based on the LLM choice (e.g. OpenAI → `@langchain/openai`, Anthropic → `@langchain/anthropic`). LangChain scaffolds also list those packages in `serverExternalPackages` so Turbopack can resolve them.
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
| `subscription-cli-specs.ts` | Pinned `package@version` strings for `npx` OAuth fallbacks |
| `codegen/` | Generated `support-agent.tsx` and `next.config.mjs` |

## CLI flags

`--llm-auth` skips the Ink picker even without `--ci`. Pair API-key kinds with `--openai-api-key`, `--anthropic-api-key`, or `--orcarouter-api-key` in non-interactive mode.

Subscription kinds run OAuth on the local machine; tokens are not stored in Novu cloud. Warn when `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` are set in the shell (may override subscription billing).

OrcaRouter is OpenAI-compatible: the `orcarouter` scaffold reuses the `@ai-sdk/openai` / `@langchain/openai` packages and points them at `https://api.orcarouter.ai/v1` with the `ORCAROUTER_API_KEY`.

## Subscription OAuth trust boundary

Subscription auth shells out to vendor CLIs (`codex`, `claude`, or pinned `npx` fallbacks in `subscription-cli-specs.ts`). That requires trusting Anthropic/OpenAI npm packages on the developer machine — the same tradeoff as running those tools directly.

Hardening:

- Prefer a globally installed `codex` / `claude` binary when present (no `npx` fetch).
- `npx` fallbacks use pinned `package@version` specs, not unpinned `latest`.
- Auth **detection** reads local credential files only; it does not run `npx` on the status-check path.
