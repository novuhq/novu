# Copilot evals

LangSmith experiments that compare Copilot's direct workflow tools with the MCP tools
(`IS_COPILOT_MCP_TOOLS_ENABLED`). Each variant runs the same dataset against the local API, so
LangSmith's compare view shows both answers to every task side by side.

## What a run does

For every example in `src/dataset.ts` it opens a new Copilot chat (`POST /v2/ai/chat`), sends
each turn to `POST /v2/ai/chat-stream` the way the dashboard does, then reads back the workflow
the chat produced and deletes it (set `KEEP_WORKFLOWS=true` to keep it).

Scores per example:

| Key | Meaning |
| --- | --- |
| `task_success` | Every check the example defines passed |
| `workflow_created`, `name_match`, `step_types_match`, `critical_match`, `tags_match`, `payload_match`, `step_details_match` | The individual checks against the saved workflow; `step_details_match` covers step content, controls (delay/digest windows) and skip conditions |
| `tool_calls`, `tool_errors`, `run_completed` | From the chat stream; failed tool calls are listed in the comment |
| `llm_calls`, `total_tokens`, `prompt_tokens`, `completion_tokens`, `total_cost` | From the API's own traces for the chat |
| `variant_check` | 1 when every turn's API trace carries `tools:<variant>` |

Latency is recorded by LangSmith on each run, and each run's output lists the tool calls in
order (`toolSequence`) for reading side by side.

Examples whose requests are open-ended or invalid (`vague-request`, `error-paths`) only check
that the workflow survives; judge their replies in the compare view.

## Setup

1. Create an API key in the **EU** workspace (eu.smith.langchain.com → Settings → API Keys).
2. Point the API's tracing at the EU workspace in `apps/api/src/.env.development`:

   ```env
   LANGSMITH_TRACING=true
   LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com
   LANGSMITH_API_KEY=lsv2_...
   NOVU_INTERNAL_AUTH_SECRET=<any long random string>
   IS_AI_WORKFLOW_GENERATION_ENABLED=true
   ```

3. `cp .env.example .env` here and fill in `LANGSMITH_API_KEY` and `NOVU_SECRET_KEY` (dashboard →
   API Keys for the environment Copilot should work in).
4. `pnpm install` from the repo root, then `pnpm dataset:sync` here. Re-run it whenever you edit
   `src/dataset.ts`; examples are matched by `key`, so it updates rather than duplicates.

## Run the comparison

The flag is read when the API starts, so restart it between variants.

```sh
# API: IS_COPILOT_MCP_TOOLS_ENABLED=false, LANGSMITH_PROJECT=copilot-direct
pnpm eval:direct

# API: IS_COPILOT_MCP_TOOLS_ENABLED=true, LANGSMITH_PROJECT=copilot-mcp
pnpm eval:mcp
```

Add `--reps 3` (`pnpm eval:direct --reps 3`) to run every example three times; LLM runs vary, so one
pass can mislead.

Then open LangSmith → Datasets & Experiments → `copilot-workflow-tools`, select both experiments
and click **Compare**.

If `variant_check` is 0 on the MCP run, the API did not use the MCP tools: check that it was
restarted with the flag on and that `NOVU_INTERNAL_AUTH_SECRET` is set (without it the API logs a
warning and falls back to the direct tools).

Requires Node 22.18+ (the scripts run TypeScript directly).
