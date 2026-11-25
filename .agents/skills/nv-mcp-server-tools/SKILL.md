---
name: nv-mcp-server-tools
description: >-
  Add or change a tool, a tool's input schema or description, or the step,
  Maily email-body, skip-condition or payload-property schemas in
  apps/mcp-server (the hosted Novu MCP server, also shipped in process to the
  enterprise Copilot as @novu/mcp-server/tools). Keeps tools/list small
  (per-tool budgets, no $ref), advertises loose.pipe(strict) inputs that stay
  fully validated, keeps errors actionable without the schema, and preserves
  backward compatibility. Use before editing apps/mcp-server/src/tools or
  apps/mcp-server/src/utils.
---

# MCP server tools: small schemas, full validation

MCP clients load every tool's input schema, and several cap it. claude.ai drops a tool whose input schema is over 16 KB, and ChatGPT rejects one over 5,000 tokens. Several clients cannot resolve `$ref`.

Before this skill, `tools/list` was 2.3 MB: five workflow tools inlined the Maily email body and 16 copies of the skip condition. It is now about 88 KB, and every call is still validated by the full schemas. Keep it that way. The evidence behind each rule is in [reference.md](./reference.md).

## How the package is wired

| Piece | Where |
| --- | --- |
| Tool registration (`ToolFactory.createTool` adds `idempotencyKey`, and `environmentId` unless `getAuthorization` is set) | [`src/utils/tool-factory.ts`](../../../apps/mcp-server/src/utils/tool-factory.ts) |
| Workflow and step tools, `get_step_schema`, `STEP_SCHEMA_HINT` | [`src/tools/workflows.ts`](../../../apps/mcp-server/src/tools/workflows.ts), [`src/tools/workflow-steps.ts`](../../../apps/mcp-server/src/tools/workflow-steps.ts) |
| Tool names and the hosted tool list | `WORKFLOW_STEP_TOOL_NAMES` in `src/tools/workflow-steps.ts`, `WORKFLOW_TOOL_NAMES` in [`src/tools/tool-names.ts`](../../../apps/mcp-server/src/tools/tool-names.ts), the inline snapshot in [`test/smoke.spec.ts`](../../../apps/mcp-server/test/smoke.spec.ts). Other modules register in `src/server/NovuMCP.ts` `registerAllTools`, mirrored by `test/support.ts` `connectAllTools` |
| Strict step control schemas, advertised step inputs, field guides, examples | [`src/utils/step-schemas.ts`](../../../apps/mcp-server/src/utils/step-schemas.ts) |
| Maily body schema and its notes | [`src/utils/maily-schemas.ts`](../../../apps/mcp-server/src/utils/maily-schemas.ts) |
| Skip condition (strict, advertised, errors) | [`src/utils/skip-schemas.ts`](../../../apps/mcp-server/src/utils/skip-schemas.ts) |
| Payload properties, workflow inputs, re-exports | [`src/utils/workflow-schemas.ts`](../../../apps/mcp-server/src/utils/workflow-schemas.ts) |
| Budgets and guard tests | [`test/tool-schemas.spec.ts`](../../../apps/mcp-server/test/tool-schemas.spec.ts) |
| Public in-process exports used by the Copilot | [`src/tools/index.ts`](../../../apps/mcp-server/src/tools/index.ts) |

**The mechanism.** A tool input is `loose.pipe(strict)`.
- The SDK lists a tool's schema from the input side of a pipe (`pipeStrategy: 'input'`), so clients see the small loose shape.
- `tools/call` parses through the whole pipe, so handlers receive the strict output type with strict errors.

## Workflow for any change

1. **Measure first:** `cd apps/mcp-server && pnpm tools:report`. It prints every tool's bytes against the budgets, plus each `get_step_schema` size.
2. **Pick the advertised shape** with the table below.
3. **Write the strict schema,** then the loose side and the guide text (patterns below).
4. **Check that errors are actionable:** invalid input must say what to send, because the model may only see the guide.
5. **Add or update tests,** then run the checks.
6. **Measure again** and compare with step 1. If a budget fails, move detail out of the advertised schema rather than raising the budget.
7. **Docs:** when a tool is added or renamed, update the tool tables in `apps/mcp-server/README.md` and `docs/platform/build-with-ai/mcp.mdx`. A tool without `environmentId` also joins the "every tool except `whoami` and `get_step_schema`" sentences: one in the README, two in `mcp.mdx`.

| Change | Advertised shape |
| --- | --- |
| Tool with flat arguments | Plain `z.object` through `ToolFactory.createTool`, with every field described |
| Nested, union-heavy or large input (step controls, rich text, conditions) | `loose.pipe(strict)`: a record or flat object plus a short guide; full detail on demand from a read-only tool |
| Tool that serves static data and calls no API | `server.registerTool` directly, with `title` and all three annotation hints |
| New key on an existing step type | An optional, described field on the strict control schema, plus the key on that type's `STEP_CONTROLS_GUIDE_TYPES` line (a test fails without it) |
| New step type | Strict control schema plus a line in the field guide, an example and a `controlValuesSchemaByStepType` entry (see below) |
| New Maily node or attribute | Strict schema with the dashboard editor's default (see "Maily") |

## Patterns

**Advertised step input.** This lives in `step-schemas.ts`: the record is what clients see, and `workflowStepSchema` is what validates.

```ts
export const workflowStepInputSchema = z
	.object({
		...baseStepFields,
		controlValues: controlValuesRecordSchema.describe(STEP_CONTROLS_GUIDE),
		type: stepTypeSchema,
	})
	.pipe(workflowStepSchema);
```

**The loose side accepts everything the strict side accepts.** Otherwise the pipe rejects inputs that worked before.
- Type a field loosely when the strict side strips it for some variants.
- Example: in `payloadPropertyInputSchema`, `enumValues`, `arrayItemsType` and `arrayItemProperties` are `z.unknown().optional()`. Each union option strips the fields of the other types whatever their value, so `{ type: "string", enumValues: null }` must still pass.

**Actionable union errors.** The SDK prints each Zod issue as `<message> at <path>`. When every branch of a `z.union` fails, Zod reports only "Invalid input" at the union.
- Objects keyed by a literal (`type`, `editorType`): use `z.discriminatedUnion`, so errors land on the failing field.
- Other unions: add a message only for that case, and leave single-branch issues like "Too big" alone.

```ts
z.union([z.string().max(65536), z.array(httpKeyValuePairSchema)], {
	error: (issue) => (issue.code === "invalid_union" ? HTTP_BODY_ERROR : undefined),
});
```

**Static tool.** `get_step_schema` is the model.
- **Registration:** `server.registerTool`, so the tool takes no credential, `environmentId` or `idempotencyKey`. Give it a `title` and `annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true }`; OpenAI's app review blocks a read-only tool missing any of the three hints, and a test checks every annotated tool.
- **Output:** one compact JSON text block, never pretty-printed and with no `outputSchema`.
- **Name:** add it to `WORKFLOW_STEP_TOOL_NAMES` and to the inline list in `test/smoke.spec.ts`; both smoke tests fail until you do.

**New step type or step field.**
- **API first:** the key must exist in the API's control schema (`libs/application-generic/src/schemas/control/<type>-control.schema.ts`). This package mirrors it and adds no behavior.
- **Strict schema:** in `step-schemas.ts`, add the type to `stepTypeSchema`, its control schema as a module-level constant, and an option in `workflowStepSchema`.
  - If its content is editable, add it to `workflowStepContentSchema`; if not, add it to the `exclude([...])` in `contentStepTypes`.
- **`controlValuesSchemaByStepType`:** it is `satisfies Record<StepType, ...>`, so the build fails until the new type is added.
- **`STEP_CONTROL_EXAMPLES`:** add one entry, typed against `z.input` of the schema; tests also parse it.
- **Field guide:** add a `- <type>: { key, key? }` line to `STEP_CONTROLS_GUIDE_TYPES`. A test fails when a top-level key is missing from its type's line. A free-form type goes on the `- trigger, custom: any keys` line in `STEP_CONTROLS_GUIDE` instead.

## Guide and description text

- **One place per fact.** Per-type keys live on the `controlValues` description. Tool descriptions get one `STEP_SCHEMA_HINT` sentence. Notes for a single type go in the `notes` field of `get_step_schema` output; only email has one today (`MAILY_BODY_GUIDE`, added in `describeStepControlValues`).
- **Examples over rules:** write flat JSON-like shapes (`{ type: "regular", amount: 30, unit: "minutes" }`), mark optional keys with `?`, and give the limits once.
- **Say what is lost:** for example, that keys not listed are dropped, and that a skip in content is ignored.
- **No emphasis words** (`always`, `MUST`), and no instructions duplicated across tools.
- **State when a fact is only true for valid input.** If the content tool ignores `skip`, it must drop it before validation, as it does now.

## Maily (block email body)

- **Defaults:** an omitted attribute gets the value the dashboard editor gives a new block (`libs/maily-core` `addAttributes`). Use `null` only where the editor has no value.
  - An optional `attrs` object uses `.nullable().prefault({})`, so leaving it out gives the same defaults as `attrs: {}`. An explicit `null` is kept.
  - The renderer (`libs/maily-render`) uses destructuring defaults, which skip `null`. A button with a `null` color renders `color:null`, and an image with `null` sizes renders at 0px.
- **Required:** only what the dashboard always writes; `MAILY_BODY_GUIDE` lists the full set.
  - Easy to miss: container `content` (blockquote, lists, listItem, section, column, repeat, htmlCodeBlock), the repeat's `attrs` and `each`, and the button's `url`. These must be present, though they may be `null`.
  - With these required, a misspelled container key fails instead of saving an empty list.
- **Names in `get_step_schema`:** a node that repeats is listed once, named after its `type`. A repeating union or attrs object has no `type`, so give it `.meta({ title })`.
- **Rendering:** check a changed node with `render()` from `libs/maily-render/dist` (recipe in reference.md).

## Contracts that must not move

- **Nothing accepted before is rejected now.** Widening is fine; tightening needs a compat plan. Prove it with a differential run against `origin/next` (reference.md).
- **The enterprise Copilot** (`enterprise/packages/ai/src/ai/mcp`) builds a server per turn with `registerWorkflowTools` and calls tools by name. It relies on:
  - the tool names and argument shapes;
  - SDK rejections as `isError` text with no `structuredContent`;
  - 4xx results carrying `structuredContent.error.status`;
  - the error fragments its specs assert, such as `'>=1'` and `'at step.controlValues.amount'`;
  - `toSavedControlValues` parsing with the strict content schema.
- **The dashboard round trip:**
  - Keep accepting `skip: null`; the dashboard stores a cleared condition that way.
  - `get_workflow` returns block email bodies as JSON strings.

## Checks to run

```bash
cd apps/mcp-server
npx vitest run --dir test          # unit and guard tests
npx tsc --noEmit -p tsconfig.json
npx biome check src test
pnpm build                         # dist used by the Copilot
pnpm tools:report                  # sizes against the budgets

cd ../../enterprise/packages/ai    # Copilot specs against the new dist; the src symlink breaks mocha's glob
NODE_ENV=test TS_NODE_TRANSPILE_ONLY=true NEW_RELIC_ENABLED=false NODE_OPTIONS=--no-experimental-strip-types \
  npx mocha --timeout 20000 --require ts-node/register --exit $(ls src/ai/mcp/*.spec.ts)
```

Keep scratch experiments outside `apps/mcp-server/test`, and don't name them `*.spec.ts`. `pnpm test` runs every spec in the package, and Biome checks `**`. Remove scratch files before committing.

## Avoid

- **`$ref` in `tools/list`.** The guard test fails on `$ref`, `$defs` and `definitions`.
- **`.meta({ id })`.** It uses a global registry that forces `$ref` and throws on duplicate ids. Use `.meta({ title })` for naming.
- **Recursive schemas** and **top-level discriminated unions.** The SDK drops a top-level union, so wrap it in `z.object`.
- **`z.custom`.** `toJSONSchema` throws on it, which breaks all of `tools/list`.
- **MCP resource templates for schemas.** Most hosts don't let models read resources; serve the data from a read-only tool.
- **Raising a budget** to fit a schema.

Known gaps that predate this skill are listed in reference.md; don't make them worse.
