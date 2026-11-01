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
| `task_success` | Every check the example defines passed, and `payload_schema_ok` |
| `workflow_created`, `name_match`, `step_types_match`, `critical_match`, `tags_match`, `payload_match`, `step_details_match` | The individual checks against the saved workflow; `step_details_match` covers step content, controls (delay/digest windows) and skip conditions |
| `payload_schema_ok` | Run for every workflow: no top-level `payload` property and every required key declared |
| `tool_calls`, `tool_errors`, `run_completed` | From the chat stream; failed tool calls are listed in the comment |
| `max_turn_seconds`, `repeated_tool_calls` | Per-turn budget from the chat stream: the slowest turn, and calls that repeat an earlier call in the same turn with the same tool and identical input (listed in the comment) |
| `leaked_internal_text` | Text parts on the chat stream that were one JSON object, such as the input guard's or tool router's output; the comment quotes each. Should be 0 |
| `llm_calls`, `max_llm_calls_per_turn`, `total_tokens`, `prompt_tokens`, `completion_tokens`, `total_cost` | From the API's own traces for the chat |
| `variant_check` | 1 when every turn's API trace carries `tools:<variant>`; the comment names the project the traces came from |

The budget and trace metrics (`max_turn_seconds`, `repeated_tool_calls`, `llm_calls`,
`max_llm_calls_per_turn`, tokens and cost) are for comparing the variants and are not part of
`task_success`. Neither is `leaked_internal_text`, since a reply can itself be a JSON object, but
anything above 0 there usually means the API streamed its internal structured outputs again.

Latency is recorded by LangSmith on each run, and each run's output lists the tool calls in
order (`toolSequence`) for reading side by side.

### Checks

An example's expectation (`Expectation` in `src/dataset.ts`) only scores what it defines. Step
checks pick a step by type and position and can assert:

- `fields`: exact values at control-value paths, e.g. `from.email` or `primaryAction.redirect.url`.
  Paths step into `[{ key, value }]` lists by key (`headers.X-Source`) and into strings that hold
  JSON (`body.userId`). Strings are trimmed and `{{ payload.x }}` equals `{{payload.x}}`; nothing
  else is normalized. Use these for settings with a key of their own, so text the model writes into
  an email body does not count as the setting.
- `controls`: like `fields`, but passes when any one of several alternatives matches (1 hour or 60
  minutes).
- `includes`: case-insensitive substrings anywhere in the step's control values, for free text such
  as a body that must mention `payload.orderId`.
- `condition`: whether the step has a skip condition, and what it mentions.

`payload_schema_ok` fails on a top-level `payload` property, which is what the tools save when the
model names a field `payload.orderId`. It counts toward `task_success` because both tool flows turn
on payload validation, so the API then rejects triggers that send `orderId` at the top level.

Examples whose requests are open-ended or invalid (`vague-request`, `empty-email-subject`) only check
that the workflow survives; judge their replies in the compare view. A turn's reply text leaves out
text parts that are a single JSON object, as the dashboard does; they are kept in the turn's
`droppedText` and counted by `leaked_internal_text`.

A turn can be `{ text, focusStep: { type, nth } }` instead of a string. It is then sent with that
step's `stepId` as message metadata, the way the dashboard sends messages while a step's editor is
open (`focused-step-edit`).

### Workflow reads

The API answers `ApiKey` reads of a workflow's preferences (`critical`) from a 60 s in-memory cache,
so a read right after the chat can miss the chat's last change. With `NOVU_INTERNAL_AUTH_SECRET` set
here, the harness reads the workflow with an `Internal` token instead, which skips that cache. It
mints the token the way ee-ai does for its MCP calls, acting as the member who owns the chat:
`GET /v2/ai/chat/:id` returns the chat's `_userId`, `_organizationId` and `_environmentId`, and an
API-key chat belongs to the user who created `NOVU_SECRET_KEY`.

A token authenticates as that member, so the harness only mints one when `NOVU_API_URL` points at
`localhost`, `127.0.0.1` or `::1`. Any other host, even one that proxies to your local API, gets
API-key reads; the API refuses `Internal` tokens that came through a proxy anyway.

Without the secret, with any other `NOVU_API_URL` host, or when the `Internal` read fails, the
harness reads with the API key, and the `critical_match` comment says why and that the value may be
up to 60 s stale. The run's first log line says which read it uses.

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

3. `cp .env.example .env` here and fill in `LANGSMITH_API_KEY`, `NOVU_SECRET_KEY` (dashboard →
   API Keys for the environment Copilot should work in) and `NOVU_INTERNAL_AUTH_SECRET` (the same
   value as the API's).
4. `pnpm install` from the repo root, then `pnpm dataset:sync` here. Re-run it whenever you edit
   `src/dataset.ts`; examples are matched by `key`, so it updates rather than duplicates.

## Run the comparison

The flag is read when the API starts, so restart it between variants.

```sh
# API: IS_COPILOT_MCP_TOOLS_ENABLED=false
pnpm eval:direct --reps 3

# API: IS_COPILOT_MCP_TOOLS_ENABLED=true
pnpm eval:mcp --reps 3
```

`--reps 3` runs every example three times. LLM runs vary, so compare averages over three
repetitions rather than single runs.

Then open LangSmith → Datasets & Experiments → `copilot-workflow-tools`, select both experiments
and click **Compare**.

The API's traces are looked up in both `copilot-direct` and `copilot-mcp` (`API_TRACE_PROJECT_DIRECT`
/ `API_TRACE_PROJECT_MCP`), so the API's `LANGSMITH_PROJECT` does not have to change between
variants. Setting it to `copilot-direct` / `copilot-mcp` per variant still keeps the traces apart for
browsing. `variant_check` is decided by the `tools:direct` / `tools:mcp` tag on the traces, not by
the project they are in.

If `variant_check` is 0 on the MCP run, the API did not use the MCP tools: check that it was
restarted with the flag on and that `NOVU_INTERNAL_AUTH_SECRET` is set (without it the API logs a
warning and falls back to the direct tools). "No API traces found" means neither project has traces
for the chat: check the API's `LANGSMITH_TRACING` and LangSmith settings.

Requires Node 22.18+ (the scripts run TypeScript directly).
