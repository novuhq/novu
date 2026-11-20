# apps/mcp-server

The hosted Novu MCP server (Cloudflare Worker). `src/tools` and `src/utils` also ship in process as `@novu/mcp-server/tools` to the enterprise Copilot (`enterprise/packages/ai/src/ai/mcp`), built to `dist` with `pnpm build`.

Before adding or changing a tool, a tool's input schema or description, or the step, Maily, skip or payload-property schemas, follow [`.agents/skills/nv-mcp-server-tools/SKILL.md`](../../.agents/skills/nv-mcp-server-tools/SKILL.md). It covers the workflow, the patterns and why they exist.

## Keep `tools/list` lean

MCP clients load every tool's schema, and several cap it: claude.ai drops a tool whose input schema is over 16 KB, and ChatGPT rejects one over 5,000 tokens.

- **Budgets.** `test/tool-schemas.spec.ts` enforces them:
  - `tools/list` under 100 KB;
  - each `inputSchema` under 12 KB and each tool under 16 KB;
  - nesting depth at most 16;
  - each `get_step_schema` result under 32,000 characters;
  - no `$ref`, `$defs` or `definitions`.

  Run `pnpm tools:report` before and after a change. If a budget fails, move detail out of the advertised schema; don't raise the budget.
- **Advertised vs validated.** Nested, union-heavy or large inputs are `loose.pipe(strict)`. The SDK lists the loose side and validates every call through the strict side. The loose side must accept everything the strict side accepts.
- **On-demand detail.** Each step type's full schema, an example and notes come from the read-only `get_step_schema` tool, not from the step tools' schemas.
- **One guide per fact.** Per-type keys go on the `controlValues` description, and tool descriptions get one hint sentence. All of the following live in `src/utils/step-schemas.ts`:
  - Adding a key means adding it to the type's strict control schema and to that type's line in `STEP_CONTROLS_GUIDE_TYPES`.
  - Adding a step type also means updating `stepTypeSchema`, `workflowStepSchema`, `controlValuesSchemaByStepType` and `STEP_CONTROL_EXAMPLES`.
- **Actionable errors.** A model may only see the guide, so every rejection must say what to send. Use `z.discriminatedUnion` for objects keyed by a literal; give other unions a custom `error` for `invalid_union`.
- **Maily defaults.** An omitted Maily attribute gets the dashboard editor's default (`libs/maily-core`), never a `null` the renderer can't style.

## Don't break callers

- Don't reject input that was accepted before.
- Keep tool names, argument shapes, SDK rejection envelopes (`isError` text, no `structuredContent`) and 4xx `structuredContent.error.status`.
- Keep `toSavedControlValues` strict. The Copilot depends on all of these.
- Static tools such as `get_step_schema` use `server.registerTool` with a `title` and explicit `readOnlyHint`, `destructiveHint` and `openWorldHint`.

## Checks

```bash
npx vitest run --dir test && npx tsc --noEmit -p tsconfig.json && npx biome check src test && pnpm build
pnpm tools:report
```

Then run the Copilot's MCP specs against the new `dist`; the command is in the skill. Keep scratch experiments out of `test/`, don't name them `*.spec.ts`, and delete them before committing.
