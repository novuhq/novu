# Reference: why the MCP server's tool schemas look the way they do

This file collects the evidence and recipes behind [SKILL.md](./SKILL.md), from the work that cut `tools/list` from 2.3 MB to about 88 KB (NV-9336).

## Client limits

These limits were checked in November 2026. Some come from issue reports rather than vendor documentation, so treat them as lower bounds.

| Client | What breaks |
| --- | --- |
| claude.ai and Claude Desktop connectors | A tool whose `inputSchema` is over 16,384 bytes is dropped silently when the connector is added |
| ChatGPT and the OpenAI Responses `mcp` tool | A tool over 5,000 tokens is rejected. Strict mode allows 10 nesting levels and 5,000 properties; schemas beyond that load non-strict |
| Claude Code | Tool search defers tools, but a tool's whole schema still loads once picked. Tool output is capped near 25k tokens |
| Cursor, Kiro, VS Code Copilot, Continue | Builds have failed with "can't resolve reference #/$defs/...". Continue copies only `properties` and `required`, so it drops root `$defs`. VS Code validates schemas with Ajv |
| LangChain, the OpenAI Agents SDK, Gemini adapters | They inline `$ref`, so deduplication buys nothing there. Gemini rejects schemas nested about 32 or more levels deep |

These limits are why tools/list carries no `$ref`, each `inputSchema` stays under 12,288 bytes, each tool under 16,000 bytes, and nesting depth at or under 16.

## SDK and Zod behavior the design relies on

These were verified on `@modelcontextprotocol/sdk` 1.32.1 and zod 4.6.

**SDK**
- **Listing:** `tools/list` converts each input schema with `toJSONSchema(..., { io: 'input' })`, through `pipeStrategy: 'input'` in `server/mcp.js`. The behavior is deliberate (typescript-sdk#962), and the v2 SDK uses `std.jsonSchema.input`. For a pipe, only its `in` side is emitted.
- **No caching:** the SDK rebuilds every schema on each `tools/list` call. At 2.3 MB that was a 241 ms median per call; at 88 KB it is 6.4 ms.
- **Validation:** `tools/call` runs `safeParseAsync` on the full schema before the handler.
  - A failure returns `isError: true` with the text `MCP error -32602: Input validation error: Invalid arguments for tool <name>: <issue> at <dot.path>`, one line per issue, and no `structuredContent`.
  - The handler never runs.
- **Top-level unions:** the SDK drops a top-level discriminated union (`normalizeObjectSchema`, typescript-sdk#1643), so a tool input must be a `z.object`.

**Zod**
- **Shared instances:** Zod inlines shared instances by default. `reused: 'ref'` extracts every schema used twice, down to a described boolean, under opaque `__schemaN` names. `get_step_schema` therefore emits the schema inline and extracts only named subtrees that repeat, matched by structure.
- **Metadata:** `.describe()` and `.meta()` return a clone.
  - `.meta({ id })` registers the id in the global registry. That forces a `$ref` wherever the schema is converted, and Zod throws if two schemas share an id.
  - `.meta({ title })` has neither problem.
- **Union errors:**
  - If exactly one branch fails with non-aborting issues (checks like `min` or `regex`), Zod reports that branch's issues, for example "Too big …" or "Must name a property … at payloadProperties[1].name".
  - Otherwise it reports one `invalid_union` issue, "Invalid input", at the union. Fix that with `z.discriminatedUnion` or a custom `error` limited to `invalid_union`.
- **Pipes stop at the loose side:** if the loose side fails, the strict side never runs. For example, a missing `name` hides `controlValues` errors until the next call.
- **Enterprise SDK copy:** the Copilot's copy of the SDK validates through zod 3.25's `zod/v4-mini`. With no English locale loaded, a missed discriminator renders as a bare "Invalid input". A schema's own `error` takes precedence over the locale in both copies.

## Maily facts

- **Renderer:** `libs/maily-render/src/maily.tsx` destructures attributes with defaults such as `paddingTop = DEFAULT_BUTTON_PADDING_TOP`, which skip `null`. With `null`, a button renders `background-color:null` and `padding: 2px nullpx`, an image `width:0px`, and an inline image `width:nullpx`.
- **Editor defaults:** these come from `libs/maily-core/src/editor/nodes/**` and `extensions/**`, in `addAttributes()` and the `DEFAULT_*` constants.
  - button: `left`, `filled`, `smooth`, `#000000` on `#ffffff`, padding 10/32/10/32, width `auto`
  - image: `center`, `auto` × `auto`, radius 0
  - inline image: 20 × 20
  - logo: `sm`, `left`
  - section: `left`, `#f7f7f7`, border `#e2e2e2`, radius 6, width 0, margins 0/0/10/0, padding 8
  - columns: gap 8, marginBottom 10
  - column: `auto`, `top`
  - repeat: `isUpdatingKey` false, `iterations` 0
  - link: `isUrlVariable` false
  - horizontal rule: margins 10
- **Repeat items:** inside a repeat, refer to an item field by its full path, such as `payload.items.name` or `steps.<digestStepId>.events.payload.x`. The renderer uses `aliasFor || id`, so `aliasFor` is optional.
- **Dashboard storage:** the dashboard saves a cleared skip condition as `skip: null`. `get_workflow` returns a block body as a JSON string, and the tools accept only the parsed object.

## Measurements (NV-9336)

| | Tools | tools/list (KiB) | Approx. tokens | Largest tool |
| --- | --- | --- | --- | --- |
| Prod before (mcp.novu.co) | 30 | 762 | ~195k | — |
| Staging before | 38 | 2,282 (2,336,238 bytes) | ~584k | 463,523 bytes |
| After | 39 | 86 (88,291 bytes) | ~22k | 10,945 bytes |

`get_step_schema` output: email about 26 KB; the other types 3.6–6.3 KB.

The size history of `update_workflow_step_content` (one tool) shows why `$ref` alone was rejected:

| Approach | Size |
| --- | --- |
| Inline (before) | 422 KB |
| Shared `$defs` | 54–58 KB |
| Per-type union with only Maily and skip stubbed | 26–35 KB |
| `loose.pipe(strict)` | 4.7 KB |

## Recipes

### Differential test against `origin/next`

Use this to prove that nothing accepted before is rejected, and that requests and errors are unchanged.

1. **Baseline tree:** `mkdir -p /tmp/bn && git archive origin/next apps/mcp-server/src apps/mcp-server/test | tar -x -C /tmp/bn`, then copy `src` and `test` into a scratch folder inside `apps/mcp-server`. It must sit there so `node_modules` resolves; a `git worktree` elsewhere has none.
2. **Run both trees** on the same corpus of tool calls. Build each server with that tree's `test/support.ts` `connectAllTools`, and stub the API with `fakeWorkflowsApi` from `test/fake-api.ts`.
3. **Compare:** accept or reject, the exact error text, `isError`, `structuredContent`, every recorded request body, and `toSavedControlValues` output.
4. **Corpus:**
   - every step type and variant;
   - the bodies in `test/fixtures/dashboard-email-bodies.ts`;
   - complete Maily bodies, plus bodies with attributes left out;
   - payload properties with nulls and fields of other types;
   - every skip operator, including `and`, `or` and `null`;
   - realistic invalid inputs.
5. **Classify** every difference as intended widening, wording only, or regression. The goal is zero regressions.
6. **Run three modes:** a hosted API key, the Copilot accessors (`getAuthorization` set), and the Copilot with the enterprise package's SDK copy.
7. **Scratch files:** name them `*.exp.ts` with their own vitest config, so `pnpm test` and Biome don't pick them up, and delete them before committing.
   - **vitest:** the CLI has no `--include` flag. Use a config such as `scratch/vitest.config.mts` with `root` set to `apps/mcp-server` and `test: { include: ["scratch/*.exp.ts"] }`, and run `npx vitest run --config scratch/vitest.config.mts`.
   - **tsconfig:** a scratch tsconfig extending `../tsconfig.json` must override `types` to `["../worker-configuration.d.ts", "node"]`.

### Agent usability check

Use this before shipping guide or description changes.
1. Dump `tools/list` and every `get_step_schema` output from a scratch spec.
2. Using only those dumps, write the tool arguments for about 30 realistic authoring tasks. Include a block email with a button, a variable, columns and a repeat, digest and delay variants, an HTTP POST, skip conditions, and payload properties.
3. Run them through the real tools against `fakeWorkflowsApi`.
4. Record first-try success, and whether each error message alone was enough to fix the input.
5. Include the `get_workflow` → edit → send-back round trip.

### Render check for Maily changes

```ts
import { render } from "../../../libs/maily-render/dist/index.mjs"; // from a scratch file one folder below apps/mcp-server, e.g. apps/mcp-server/scratch/render.exp.ts
const body = workflowStepSchema.parse({ controlValues: { body: doc, editorType: "block", subject: "s" }, name: "E", type: "email" }).controlValues.body;
const html = await render(body); // assert no "null", "NaN" or "undefined" in style values
```

## Known gaps (predate NV-9336; keep them in mind, don't widen them)

- **Dropped keys:** unknown keys are stripped silently, for example in-app `primaryAction.url` or a second operator in one skip comparison.
- **String bodies:** a block email body sent as a JSON string is rejected; descriptions tell agents to send it parsed.
- **`active` on update:** `update_workflow` sends `active: false` when `active` is omitted, which deactivates the workflow.
- **Dashboard skip operators:** conditions using operators the dashboard offers but the MCP skip grammar lacks, or nested groups, cannot be re-sent through `update_workflow`.
- **Comparison arity:** skip comparisons accept any number of operands, although the descriptions say exactly two.
- **Copilot discriminator messages:** in the Copilot's zod 3.25 SDK copy, discriminator misses render as a bare "Invalid input".
