# Bedrock probe

Checks whether Amazon Bedrock accepts the Copilot's strict tool schemas on OpenAI models
(GPT-6 Luna), before any Bedrock code is written. Bedrock documents limits for structured
output: at most 16 union-typed properties and 12 optional properties per schema, and a first
compile of up to about 90 seconds. Four Copilot tools are over the union limit. If the limits
apply to strict function tools, those tools need strict mode off on Bedrock.

Linear: NV-9375 (parent NV-9369).

## Run

1. Build the enterprise packages (`pnpm build` with the enterprise submodule), then write the
   tool definitions the model receives today:

   ```bash
   NODE_ENV=test NEW_RELIC_ENABLED=false node dump-tools.cjs
   ```

2. Dry run. It prints the 45 requests and their sizes, and sends nothing:

   ```bash
   node probe-bedrock.mjs
   ```

3. Send them. You need a Bedrock API key with GPT-6 Luna access:

   ```bash
   AWS_BEARER_TOKEN_BEDROCK=... node probe-bedrock.mjs --send
   ```

   It defaults to `global.openai.gpt-6-luna` on `bedrock-runtime` in us-east-1. Set
   `BEDROCK_OPENAI_BASE_URL` and `BEDROCK_MODEL` to change that, and `--only A,B` to run some
   groups. Expected cost: a few cents.

Results go to `probe-results-<timestamp>.jsonl` (one line per request), and a summary table is
printed with notes on how to read it.

## What it sends

| Group | Question |
| --- | --- |
| A | Strict tools work at all, the `$schema` keyword is accepted, and which validator runs |
| B | The 16-union limit, and whether unions inside array items count |
| C | The 12-optional limit |
| D | Whether the limits count per tool or per request |
| E, F | Each Copilot tool alone, strict and (for the heavy ones) non-strict |
| G | The real per-call tool sets, plus the proposed fix: heavy tools non-strict, the rest strict |
| H | First compile vs cached, and whether tool order breaks the cache |
| `[stream]` | The decisive cases again, streamed, as the agent calls the model |

Every request sends `store: false`, so Bedrock keeps no copy of the responses.
