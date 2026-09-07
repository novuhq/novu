---
name: figma-use
description: "**MANDATORY prerequisite** — you MUST invoke this skill BEFORE every `use_figma` tool call. NEVER call `use_figma` directly without loading this skill first. Skipping it causes common, hard-to-debug failures. Trigger whenever the user wants to perform a write action or a unique read action that requires JavaScript execution in the Figma file context — e.g. create/edit/delete nodes, set up variables or tokens, build components and variants, modify auto-layout or fills, bind variables to properties, or inspect file structure programmatically."
disable-model-invocation: false
---

# use_figma — Figma Plugin API Skill

Use the `use_figma` tool to execute JavaScript in Figma files via the Plugin API. All detailed reference docs live in `references/`.

**Always pass `skillNames: "figma-use"` when calling `use_figma`.** This is a logging parameter used to track skill usage — it does not affect execution.

**If Figma MCP tools appear as deferred tools, batch-load all their schemas in a single `ToolSearch` call** using the `select:` syntax — e.g. `ToolSearch query="select:use_figma,get_screenshot,get_metadata,create_new_file"`. One round trip beats six.

**If the task involves building or updating a full page, screen, or multi-section layout in Figma from code**, also load [figma-generate-design](../figma-generate-design/SKILL.md). It provides the workflow for discovering design system components via `search_design_system`, importing them, and assembling screens incrementally. Both skills work together: this one for the API rules, that one for the screen-building workflow.

Before anything, load [plugin-api-standalone.index.md](references/plugin-api-standalone.index.md) to understand what is possible. When you are asked to write plugin API code, use this context to grep [plugin-api-standalone.d.ts](references/plugin-api-standalone.d.ts) for relevant types, methods, and properties. This is the definitive source of truth for the API surface. It is a large typings file, so do not load it all at once, grep for relevant sections as needed.

IMPORTANT: Whenever you work with design systems, start with [working-with-design-systems/wwds.md](references/working-with-design-systems/wwds.md) to understand the key concepts, processes, and guidelines for working with design systems in Figma. Then load the more specific references for components, variables, text styles, and effect styles as needed.

## 1. Critical Rules

1.  **Use `return` to send data back.** The return value is JSON-serialized automatically (objects, arrays, strings, numbers). Do NOT call `figma.closePlugin()` or wrap code in an async IIFE — this is handled for you.
2.  **Write plain JavaScript with top-level `await` and `return`.** Code is automatically wrapped in an async context. Do NOT wrap in `(async () => { ... })()`.
3.  `figma.notify()` **throws "not implemented"** — never use it
3a. `getPluginData()` / `setPluginData()` are **not supported** in `use_figma` — do not use them. Use `getSharedPluginData()` / `setSharedPluginData()` instead (these ARE supported), or track node IDs by returning them and passing them to subsequent calls.
4.  `console.log()` is NOT returned — use `return` for output
5.  **Work incrementally in small steps.** Break large operations into multiple `use_figma` calls. Validate after each step. This is the single most important practice for avoiding bugs.
6.  Colors are **0–1 range** (not 0–255): `{r: 1, g: 0, b: 0}` = red
7.  Fills/strokes are **read-only arrays** — clone, modify, reassign
8.  **Font loading is required before ANY operation on nodes that contain unloaded fonts** — not just text-setting operations. This includes `appendChild`, `insertChild`, `setBoundVariable`, `setExplicitVariableModeForCollection`, `setValueForMode`, and even `findAll` callbacks. If the document has existing text nodes, preload all their fonts at the start of the script. Use `await figma.listAvailableFontsAsync()` to discover available fonts and styles, then `await figma.loadFontAsync({family, style})` to load each one. See [Gotchas](references/gotchas.md) for the full preload pattern.
9.  **Pages load incrementally** — use `await figma.setCurrentPageAsync(page)` to switch pages and load their content. The sync setter `figma.currentPage = page` does **NOT** work and will throw (see Page Rules below)
10. `setBoundVariableForPaint` returns a **NEW** paint — must capture and reassign
11. `createVariable` accepts collection **object or ID string** (object preferred)
12. **`layoutSizingHorizontal/Vertical = 'FILL'` MUST be set AFTER `parent.appendChild(child)`** — setting before append throws. Same applies to `'HUG'` on non-auto-layout nodes.
13. **Position new top-level nodes away from (0,0).** Nodes appended directly to the page default to (0,0). Scan `figma.currentPage.children` to find a clear position (e.g., to the right of the rightmost node). This only applies to page-level nodes — nodes nested inside other frames or auto-layout containers are positioned by their parent. See [Gotchas](references/gotchas.md).
14. **On `use_figma` error, STOP. Do NOT immediately retry.** Failed scripts are **atomic** — if a script errors, it is not executed at all and no changes are made to the file. Read the error message carefully, fix the script, then retry. See [Error Recovery](#6-error-recovery--self-correction).
15. **MUST `return` ALL created/mutated node IDs.** Whenever a script creates new nodes or mutates existing ones on the canvas, collect every affected node ID and return them in a structured object (e.g. `return { createdNodeIds: [...], mutatedNodeIds: [...] }`). This is essential for subsequent calls to reference, validate, or clean up those nodes.
16. **Always set `variable.scopes` explicitly when creating variables.** The default `ALL_SCOPES` pollutes every property picker — almost never what you want. Use specific scopes like `["FRAME_FILL", "SHAPE_FILL"]` for backgrounds, `["TEXT_FILL"]` for text colors, `["GAP"]` for spacing, etc. See [variable-patterns.md](references/variable-patterns.md) for the full list.
17. **`await` every Promise.** Never leave a Promise unawaited — unawaited async calls (e.g. `figma.loadFontAsync(...)` without `await`, or `figma.setCurrentPageAsync(page)` without `await`) will fire-and-forget, causing silent failures or race conditions. The script may return before the async operation completes, leading to missing data or half-applied changes.

> For detailed WRONG/CORRECT examples of each rule, see [Gotchas & Common Mistakes](references/gotchas.md).

## 2. Page Rules (Critical)

**Page context resets between `use_figma` calls** — `figma.currentPage` starts on the first page each time.

### Switching pages

Use `await figma.setCurrentPageAsync(page)` to switch pages and load their content. The sync setter `figma.currentPage = page` does **NOT work** — it throws `"Setting figma.currentPage is not supported"` in `use_figma`. Always use the async method.

```js
// Switch to a specific page (loads its content)
const targetPage = figma.root.children.find((p) => p.name === "My Page");
await figma.setCurrentPageAsync(targetPage);
// targetPage.children is now populated

// Iterate over all pages
for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);
  // page.children is now loaded — read or modify them here
}
```

### Across script runs

`figma.currentPage` resets to the **first page** at the start of each `use_figma` call. If your workflow spans multiple calls and targets a non-default page, call `await figma.setCurrentPageAsync(page)` at the start of each invocation.

You can call `use_figma` multiple times to incrementally build on the file state, or to retrieve information before writing another script. For example, write a script to get metadata about existing nodes, `return` that data, then use it in a subsequent script to modify those nodes.

## 3. `return` Is Your Output Channel

The agent sees **ONLY** the value you `return`. Everything else is invisible.

- **Returning IDs (CRITICAL)**: Every script that creates or mutates canvas nodes **MUST** return all affected node IDs — e.g. `return { createdNodeIds: [...], mutatedNodeIds: [...] }`. This is a hard requirement, not optional.
- **Progress reporting**: `return { createdNodeIds: [...], count: 5, errors: [] }`
- **Error info**: Thrown errors are automatically captured and returned — just let them propagate or `throw` explicitly.
- `console.log()` output is **never** returned to the agent
- Always return actionable data (IDs, counts, status) so subsequent calls can reference created objects

## 4. Editor Mode

`use_figma` works in **design mode** (editorType `"figma"`, the default). FigJam (`"figjam"`) and Slides (`"slides"`) have different sets of available node types — most design nodes are blocked in FigJam, and FigJam-only nodes are blocked in Slides.

Available in design mode: Rectangle, Frame, Component, Text, Ellipse, Star, Line, Vector, Polygon, BooleanOperation, Slice, Page, Section, TextPath.

**Blocked** in design mode: Sticky, Connector, ShapeWithText, CodeBlock, Slide, SlideRow, SlideGrid, InteractiveSlideElement, Webpage.

Available in Slides mode: Rectangle, Frame, Component, Text, Ellipse, Star, Line, Vector, Polygon, BooleanOperation, Slice, Section, TextPath, Slide, SlideRow, SlideGrid, InteractiveSlideElement.

**Blocked** in Slides mode: Sticky, Connector, ShapeWithText, CodeBlock, Webpage, Page.

> **Slides note:** There is no dedicated read tool for Slides files yet. Use `use_figma` with read-only scripts for inspection (see Section 6 "Inspect first" pattern), and `get_screenshot` / `await node.screenshot()` for visual context. For Slides-specific API guidance, load the [figma-use-slides](../figma-use-slides/SKILL.md) skill.

## 5. Efficient APIs — Prefer These Over Verbose Alternatives

These APIs reduce boilerplate, eliminate ordering errors, and compress token output. **Always prefer them over the verbose alternatives.**

### `node.query(selector)` — CSS-like node search

Find nodes within a subtree using CSS-like selectors. Replaces verbose `findAll` + filter loops.

```js
// BEFORE — verbose traversal
const texts = frame.findAll(n => n.type === 'TEXT' && n.name === 'Title')

// AFTER — one-liner with query
const texts = frame.query('TEXT[name=Title]')
```

**Selector syntax:**
- Type: `FRAME`, `TEXT`, `RECTANGLE`, `ELLIPSE`, `COMPONENT`, `INSTANCE`, `SECTION` (case-insensitive)
- Attribute exact: `[name=Card]`, `[visible=true]`, `[opacity=0.5]`
- Attribute substring: `[name*=art]` (contains), `[name^=Header]` (starts-with), `[name$=Nav]` (ends-with)
- Dot-path traversal: `[fills.0.type=SOLID]`, `[fills.*.type=SOLID]` (wildcard index)
- Instance matching: `[mainComponent=nodeId]`, `[mainComponent.name=Button]`
- Combinators: `FRAME > TEXT` (direct child), `FRAME TEXT` (any descendant), `A + B` (adjacent sibling), `A ~ B` (general sibling)
- Pseudo-classes: `:first-child`, `:last-child`, `:nth-child(2)`, `:not(TYPE)`, `:is(FRAME, RECTANGLE)`, `:where(TEXT, ELLIPSE)`
- Node ID: `#nodeId` or bare GUID
- Comma: `TEXT, RECTANGLE` (union)
- Wildcard: `*` (any type)

**QueryResult methods:**
| Method | Description |
|---|---|
| `.length` | Number of matched nodes |
| `.first()` | First matched node (or `null`) |
| `.last()` | Last matched node (or `null`) |
| `.toArray()` | Convert to regular array |
| `.each(fn)` | Iterate with callback, returns `this` for chaining |
| `.map(fn)` | Map to new array |
| `.filter(fn)` | Filter to new QueryResult |
| `.values(keys)` | Extract property values: `.values(['name', 'x', 'y'])` → `[{name, x, y}, ...]` |
| `.set(props)` | Set properties on all matched nodes (see `node.set()` below) |
| `.query(selector)` | Sub-query within matched nodes |
| `for...of` | Iterable — works in `for` loops |

**Scope:** `node.query()` searches within that node's subtree. To search the whole page: `figma.currentPage.query('...')`. There is no global `figma.query()`.

**Examples:**
```js
// Recolor all text inside cards
figma.currentPage.query('FRAME[name^=Card] TEXT').set({
  fills: [{type: 'SOLID', color: {r: 0.2, g: 0.2, b: 0.8}}]
})

// Get names and positions of all frames
return figma.currentPage.query('FRAME').values(['name', 'x', 'y'])

// Find the first component named "Button"
const btn = figma.currentPage.query('COMPONENT[name=Button]').first()

// Find all instances of a specific component
figma.currentPage.query(`INSTANCE[mainComponent=${compId}]`)

// Find nodes with solid fills using dot-path traversal
figma.currentPage.query('[fills.0.type=SOLID]')
```

### `node.set(props)` — batch property updates

Set multiple properties in one call. Returns `this` for chaining.

```js
// BEFORE — one line per property
frame.opacity = 0.5
frame.cornerRadius = 8
frame.name = "Card"

// AFTER — single call
frame.set({ opacity: 0.5, cornerRadius: 8, name: "Card" })
```

**Priority key ordering:** `layoutMode` is always applied before other properties (like `width`/`height`) regardless of object key order. This prevents the common bug where `resize()` behaves differently depending on whether `layoutMode` is set.

**Width/height handling:** `width` and `height` are routed through `node.resize()` automatically — setting `{ width: 200 }` calls `resize(200, currentHeight)`.

**Chaining with query:**
```js
// Find all rectangles named "Divider" and update them
figma.currentPage.query('RECTANGLE[name=Divider]').set({
  fills: [{type: 'SOLID', color: {r: 0.9, g: 0.9, b: 0.9}}],
  cornerRadius: 2
})
```

### `figma.createAutoLayout(direction?, props?)` — auto-layout frames

Creates a frame with auto-layout already enabled and both axes hugging content. **Prefer this over `figma.createFrame()` for any container that needs auto-layout.**

```js
// BEFORE — manual setup, easy to get ordering wrong
const frame = figma.createFrame()
frame.layoutMode = 'VERTICAL'
frame.primaryAxisSizingMode = 'AUTO'
frame.counterAxisSizingMode = 'AUTO'
frame.layoutSizingHorizontal = 'HUG'
frame.layoutSizingVertical = 'HUG'

// AFTER — one call, layout ready
const frame = figma.createAutoLayout('VERTICAL')
```

Children can immediately use `layoutSizingHorizontal/Vertical = 'FILL'` after being appended — no need to set sizing modes manually.

Accepts an optional props object as the first or second argument:
```js
figma.createAutoLayout({ name: 'Card', itemSpacing: 12 })               // HORIZONTAL + props
figma.createAutoLayout('VERTICAL', { name: 'Column', itemSpacing: 8 })  // VERTICAL + props
```

### `node.placeholder` — shimmer overlay for AI-in-progress feedback

Sets a visual shimmer overlay on a node indicating work is in progress. **Always remove the shimmer when done** — leftover shimmers confuse users and indicate incomplete work.

```js
// Mark as in-progress
frame.placeholder = true

// ... build out the content ...

// MUST remove when done — never leave shimmers on finished nodes
frame.placeholder = false
```

When building complex layouts, set `placeholder = true` on sections before populating them, then set `placeholder = false` on each section as it's completed.

### `await node.screenshot(opts?)` — inline screenshots

Capture a node as a PNG and return it inline in the response. Eliminates the need for a separate `get_screenshot` call.

```js
// Take a screenshot of a frame (returned inline in the tool response)
await frame.screenshot()

// Custom scale (default auto-scales: 0.5x or capped so max dimension ≤ 1024px)
await frame.screenshot({ scale: 2 })

// Include overlapping content from sibling nodes
await frame.screenshot({ contentsOnly: false })
```

**When to use:** After creating or modifying nodes, call `screenshot()` to visually verify the result within the same script. No need for a separate `get_screenshot` call.

**Auto-naming:** The image caption includes node metadata — `"Card (300x150 at 0,60).png"` — giving spatial context without parsing the image.

**Default scaling:** Uses 0.5x scale, but automatically caps so the largest output dimension never exceeds 1024px. Explicit `{ scale: N }` bypasses the cap.

## 6. Incremental Workflow (How to Avoid Bugs)

The most common cause of bugs is trying to do too much in a single `use_figma` call. **Work in small steps and validate after each one.**

### Key rules

- **At most 10 logical operations per `use_figma` call.** A "logical operation" is creating a node, setting its properties, and parenting it. If you need to create 20 nodes, split across 2-3 calls.
- **Build top-down, starting with placeholders.** Create the outer structure first with `placeholder = true` on each section, then incrementally replace placeholders with real content in subsequent calls.

### The pattern

1. **Inspect first.** Before creating anything, run a read-only `use_figma` to discover what already exists in the file — pages, components, variables, naming conventions. Match what's there.
2. **Build the skeleton.** Create the top-level structure with placeholder sections. Set `placeholder = true` on each section so the user sees progress.
3. **Fill in sections incrementally.** In each subsequent call, populate one section and set its `placeholder = false` when done. Take a `screenshot()` to verify.
4. **Return IDs from every call.** Always `return` created node IDs, variable IDs, collection IDs as objects (e.g. `return { createdNodeIds: [...] }`). You'll need these as inputs to subsequent calls.
5. **Validate after each step.** Use `get_metadata` to verify structure (counts, names, hierarchy, positions). Use `await node.screenshot()` inline or `get_screenshot` after major milestones to catch visual issues.
6. **Fix before moving on.** If validation reveals a problem, fix it before proceeding to the next step. Don't build on a broken foundation.

### Suggested step order for complex tasks

```
Step 1: Inspect file — discover existing pages, components, variables, conventions
Step 2: Create tokens/variables (if needed)
       → validate with get_metadata
Step 3: Create individual components
       → validate with get_metadata + get_screenshot
Step 4: Compose layouts from component instances
       → validate with get_screenshot
Step 5: Final verification
```

### What to validate at each step

| After... | Check with `get_metadata` | Check with `get_screenshot` |
|---|---|---|
| Creating variables | Collection count, variable count, mode names | — |
| Creating components | Child count, variant names, property definitions | Variants visible, not collapsed, grid readable |
| Binding variables | Node properties reflect bindings | Colors/tokens resolved correctly |
| Composing layouts | Instance nodes have mainComponent, hierarchy correct | No cropped/clipped text, no overlapping elements, correct spacing |

## 7. Error Recovery & Self-Correction

**`use_figma` is atomic — failed scripts do not execute.** If a script errors, no changes are made to the file. The file remains in the same state as before the call. This means there are no partial nodes, no orphaned elements from the failed script, and retrying after a fix is safe.

### When `use_figma` returns an error

1. **STOP.** Do not immediately fix the code and retry.
2. **Read the error message carefully.** Understand exactly what went wrong — wrong API usage, missing font, invalid property value, etc.
3. **If the error is unclear**, call `get_metadata` or `get_screenshot` to understand the current file state.
4. **Fix the script** based on the error message.
5. **Retry** the corrected script.

### Common self-correction patterns

| Error message | Likely cause | How to fix |
|---|---|---|
| `"not implemented"` | Used `figma.notify()` | Remove it — use `return` for output |
| `"node must be an auto-layout frame..."` | Set `FILL`/`HUG` before appending to auto-layout parent | Move `appendChild` before `layoutSizingX = 'FILL'` |
| `"Setting figma.currentPage is not supported"` | Used sync page setter (`figma.currentPage = page`) which does NOT work | Use `await figma.setCurrentPageAsync(page)` — the only way to switch pages |
| Property value out of range | Color channel > 1 (used 0–255 instead of 0–1) | Divide by 255 |
| `"Cannot read properties of null"` | Node doesn't exist (wrong ID, wrong page) | Check page context, verify ID |
| Script hangs / no response | Infinite loop or unresolved promise | Check for `while(true)` or missing `await`; ensure code terminates |
| `"The node with id X does not exist"` | Parent instance was implicitly detached by a child `detachInstance()`, changing IDs | Re-discover nodes by traversal from a stable (non-instance) parent frame |

### When the script succeeds but the result looks wrong

1. Call `get_metadata` to check structural correctness (hierarchy, counts, positions).
2. Call `get_screenshot` to check visual correctness. Look closely for cropped/clipped text (line heights cutting off content) and overlapping elements — these are common and easy to miss.
3. Identify the discrepancy — is it structural (wrong hierarchy, missing nodes) or visual (wrong colors, broken layout, clipped content)?
4. Write a targeted fix script that modifies only the broken parts — don't recreate everything.

> For the full validation workflow, see [Validation & Error Recovery](references/validation-and-recovery.md).

## 8. Pre-Flight Checklist

Before submitting ANY `use_figma` call, verify:

- [ ] Code uses `return` to send data back (NOT `figma.closePlugin()`)
- [ ] Code is NOT wrapped in an async IIFE (auto-wrapped for you)
- [ ] `return` value includes structured data with actionable info (IDs, counts)
- [ ] NO usage of `figma.notify()` anywhere
- [ ] NO usage of `console.log()` as output (use `return` instead)
- [ ] All colors use 0–1 range (not 0–255)
- [ ] Paint `color` objects use `{r, g, b}` only — no `a` field (opacity goes at the paint level: `{ type: 'SOLID', color: {...}, opacity: 0.5 }`)
- [ ] Fills/strokes are reassigned as new arrays (not mutated in place)
- [ ] Page switches use `await figma.setCurrentPageAsync(page)` (sync setter `figma.currentPage = page` does NOT work)
- [ ] `layoutSizingVertical/Horizontal = 'FILL'` is set AFTER `parent.appendChild(child)`
- [ ] `loadFontAsync()` called before any text property changes (use `listAvailableFontsAsync()` to verify font availability if unsure)
- [ ] Style names have already been verified via `listAvailableFontsAsync()` — NOT guessed from memory (`"SemiBold"` vs `"Semi Bold"` is a common footgun)
- [ ] For `FONT_FAMILY`-scoped variables: every value across every relevant mode is loaded before `setBoundVariable("fontFamily", …)`, `setValueForMode`, or `setExplicitVariableModeForCollection`
- [ ] `lineHeight`/`letterSpacing` use `{unit, value}` format (not bare numbers)
- [ ] `resize()` is called BEFORE setting sizing modes (resize resets them to FIXED)
- [ ] For multi-step workflows: IDs from previous calls are passed as string literals (not variables)
- [ ] New top-level nodes are positioned away from (0,0) to avoid overlapping existing content
- [ ] ALL created/mutated node IDs are collected and included in the `return` value
- [ ] Every async call (`loadFontAsync`, `setCurrentPageAsync`, `importComponentByKeyAsync`, etc.) is `await`ed — no fire-and-forget Promises

## 9. Discover Conventions Before Creating

**Always inspect the Figma file before creating anything.** Different files use different naming conventions, variable structures, and component patterns. Your code should match what's already there, not impose new conventions.

When in doubt about any convention (naming, scoping, structure), check the Figma file first, then the user's codebase. Only fall back to common patterns when neither exists.

### Quick inspection scripts

**List all pages and top-level nodes:**
```js
const pages = figma.root.children.map(p => `${p.name} id=${p.id} children=${p.children.length}`);
return pages.join('\n');
```

**List existing components across all pages:**
```js
const results = [];
for (const page of figma.root.children) {
  await figma.setCurrentPageAsync(page);
  page.findAll(n => {
    if (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET')
      results.push(`[${page.name}] ${n.name} (${n.type}) id=${n.id}`);
    return false;
  });
}
return results.join('\n');
```

**List existing variable collections and their conventions:**
```js
const collections = await figma.variables.getLocalVariableCollectionsAsync();
const results = collections.map(c => ({
  name: c.name, id: c.id,
  varCount: c.variableIds.length,
  modes: c.modes.map(m => m.name)
}));
return results;
```

## 10. Reference Docs

Load these as needed based on what your task involves:

| Doc | When to load | What it covers |
|-----|-------------|----------------|
| [gotchas.md](references/gotchas.md) | Before any `use_figma` | Every known pitfall with WRONG/CORRECT code examples |
| [common-patterns.md](references/common-patterns.md) | Need working code examples | Script scaffolds: shapes, text, auto-layout, variables, components, multi-step workflows |
| [plugin-api-patterns.md](references/plugin-api-patterns.md) | Creating/editing nodes | Fills, strokes, Auto Layout, effects, grouping, cloning, styles |
| [api-reference.md](references/api-reference.md) | Need exact API surface | Node creation, variables API, core properties, what works and what doesn't |
| [validation-and-recovery.md](references/validation-and-recovery.md) | Multi-step writes or error recovery | `get_metadata` vs `get_screenshot` workflow, mandatory error recovery steps |
| [component-patterns.md](references/component-patterns.md) | Creating components/variants | combineAsVariants, component properties, INSTANCE_SWAP, variant layout, discovering existing components, metadata traversal |
| [variable-patterns.md](references/variable-patterns.md) | Creating/binding variables | Collections, modes, scopes, aliasing, binding patterns, discovering existing variables |
| [text-style-patterns.md](references/text-style-patterns.md) | Creating/applying text styles | Type ramps, font discovery via `listAvailableFontsAsync`, listing styles, applying styles to nodes |
| [effect-style-patterns.md](references/effect-style-patterns.md) | Creating/applying effect styles | Drop shadows, listing styles, applying styles to nodes |
| [plugin-api-standalone.index.md](references/plugin-api-standalone.index.md) | Need to understand the full API surface | Index of all types, methods, and properties in the Plugin API |
| [plugin-api-standalone.d.ts](references/plugin-api-standalone.d.ts) | Need exact type signatures | Full typings file — grep for specific symbols, don't load all at once |

## 11. Snippet examples

You will see snippets throughout documentation here. These snippets contain useful plugin API code that can be repurposed. Use them as is, or as starter code as you go. If there are key concepts that are best documented as generic snippets, call them out and write to disk so you can reuse in the future.
