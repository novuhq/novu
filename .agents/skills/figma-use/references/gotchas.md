# Gotchas & Common Mistakes

> Part of the [use_figma skill](../SKILL.md). Every known pitfall with WRONG/CORRECT code examples.

## Contents

- Component properties and variant creation pitfalls
- Paint, color, and variable binding pitfalls
- Page context and plugin lifecycle pitfalls
- Auto Layout and sizing order pitfalls (including HUG/FILL interactions)
- Variant layout and geometry pitfalls
- Font loading and text/typography pitfalls
- Variable scopes and mode pitfalls
- Node cleanup and empty-fill pitfalls
- Type-specific method calls without node type guards
- Non-existent property writes and "object is not extensible"
- width/height are read-only — use resize()
- detachInstance() and node ID invalidation


## New nodes default to (0,0) and overlap existing content

Every `figma.create*()` call places the node at position (0,0). If you append multiple nodes directly to the page, they all stack on top of each other and on top of any existing content.

**This only matters for nodes appended directly to the page** (i.e., top-level nodes). Nodes appended as children of other frames, components, or auto-layout containers are positioned by their parent — don't scan for overlaps when nesting nodes.

```js
// WRONG — top-level node lands at (0,0), overlapping existing page content
const frame = figma.createFrame()
frame.name = "My New Frame"
frame.resize(400, 300)
figma.currentPage.appendChild(frame)

// CORRECT — find existing content bounds and place the new top-level node to the right
const page = figma.currentPage
let maxX = 0
for (const child of page.children) {
  const right = child.x + child.width
  if (right > maxX) maxX = right
}
const frame = figma.createFrame()
frame.name = "My New Frame"
frame.resize(400, 300)
figma.currentPage.appendChild(frame)
frame.x = maxX + 100  // 100px gap from rightmost existing content
frame.y = 0

// NOT NEEDED — child nodes inside a parent don't need overlap scanning
const card = figma.createAutoLayout('VERTICAL')
const label = figma.createText()
card.appendChild(label)  // positioned by auto-layout, no x/y needed
```

## `addComponentProperty` returns a string key, not an object — never hardcode or guess it

Figma generates the property key dynamically (e.g. `"label#4:0"`). The suffix is unpredictable. Always capture and use the return value directly.

```js
// WRONG — guessing / hardcoding the key
comp.addComponentProperty('label', 'TEXT', 'Button')
labelNode.componentPropertyReferences = { characters: 'label#0:1' }  // Error: key not found

// WRONG — treating the return value as an object
const result = comp.addComponentProperty('Label', 'TEXT', 'Button')
const propKey = Object.keys(result)[0]  // BUG: returns '0' (first char index of string!)
labelNode.componentPropertyReferences = { characters: propKey }  // Error: property '0' not found

// CORRECT — the return value IS the key string, use it directly
const propKey = comp.addComponentProperty('Label', 'TEXT', 'Button')
// propKey === "label#4:0" (exact value varies; never assume it)
labelNode.componentPropertyReferences = { characters: propKey }
```

The same applies to `COMPONENT_SET` nodes — `addComponentProperty` always returns the property key as a string.

## MUST return ALL created/mutated node IDs

Every script that creates or mutates nodes on the canvas must track and return all affected node IDs in the return value. Without these IDs, subsequent calls cannot reference, validate, or clean up those nodes.

```js
// WRONG — only returns the parent frame ID, loses track of children
const frame = figma.createFrame()
const rect = figma.createRectangle()
const text = figma.createText()
frame.appendChild(rect)
frame.appendChild(text)
return { nodeId: frame.id }

// CORRECT — returns all created node IDs in a structured response
const frame = figma.createFrame()
const rect = figma.createRectangle()
const text = figma.createText()
frame.appendChild(rect)
frame.appendChild(text)
return {
  createdNodeIds: [frame.id, rect.id, text.id],
  rootNodeId: frame.id
}

// CORRECT — when mutating existing nodes, return those IDs too
const nodes = figma.currentPage.findAll(n => n.name === 'Card')
for (const n of nodes) {
  n.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
}
return {
  mutatedNodeIds: nodes.map(n => n.id),
  count: nodes.length
}
```

## Colors are 0–1 range

```js
// WRONG — will throw validation error (ZeroToOne enforced)
node.fills = [{ type: 'SOLID', color: { r: 255, g: 0, b: 0 } }]

// CORRECT
node.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
```

## Fills/strokes are immutable arrays

```js
// WRONG — modifying in place does nothing
node.fills[0].color = { r: 1, g: 0, b: 0 }

// CORRECT — clone, modify, reassign
const fills = JSON.parse(JSON.stringify(node.fills))
fills[0].color = { r: 1, g: 0, b: 0 }
node.fills = fills
```

## setBoundVariableForPaint returns a NEW paint

```js
// WRONG — ignoring return value
figma.variables.setBoundVariableForPaint(paint, "color", colorVar)
node.fills = [paint]  // paint is unchanged!

// CORRECT — capture the returned new paint
const boundPaint = figma.variables.setBoundVariableForPaint(paint, "color", colorVar)
node.fills = [boundPaint]
```

## Variable collection starts with 1 mode

```js
// A new collection already has one mode — rename it, don't try to add first
const collection = figma.variables.createVariableCollection("Colors")
// collection.modes = [{ modeId: "...", name: "Mode 1" }]
collection.renameMode(collection.modes[0].modeId, "Light")
const darkModeId = collection.addMode("Dark")
```

## combineAsVariants requires ComponentNodes

```js
// WRONG — passing frames
const f1 = figma.createFrame()
figma.combineAsVariants([f1], figma.currentPage) // Error!

// CORRECT — passing components
const c1 = figma.createComponent()
c1.name = "variant=primary, size=md"
const c2 = figma.createComponent()
c2.name = "variant=secondary, size=md"
figma.combineAsVariants([c1, c2], figma.currentPage)
```

## Page switching: sync setter does NOT work

The sync setter `figma.currentPage = page` does **NOT work** in `use_figma` — it throws `"Setting figma.currentPage is not supported"`. You **must** use `await figma.setCurrentPageAsync(page)` instead, which switches the page and loads its content.

Note: **reading** `figma.currentPage` is fine — it's only the **assignment** (`figma.currentPage = ...`) that throws.

```js
// WRONG — throws "Setting figma.currentPage is not supported"
figma.currentPage = targetPage

// CORRECT — async method switches and loads content
await figma.setCurrentPageAsync(targetPage)

// ALSO CORRECT — reading currentPage is fine
const page = figma.currentPage  // works
```

## `get_metadata` operates on one subtree — discover pages explicitly

A Figma file can have multiple pages (canvas nodes). `get_metadata` only returns the subtree of whichever node you pass it. To get a usable index of every page:

- Call `get_metadata` with **no nodeId** — it returns the document's top-level pages as `{guid, name}` entries (no XML dump). This is the cheapest way to discover pages.
- For more detail per page (e.g. child counts, top-level node types), fall back to `use_figma`:

```js
const pages = figma.root.children.map(p => `${p.name} id=${p.id} children=${p.children.length}`);
return pages.join('\n');
```

Icons, variables, and components may live on pages other than the first. Always enumerate all pages before concluding that the file has no existing assets.

## Never use figma.notify()

```js
// WRONG — throws "not implemented" error
figma.notify("Done!")

// CORRECT — return a value to send data back to the agent
return "Done!"
```

## `getPluginData()` / `setPluginData()` are not supported

These APIs are not available in `use_figma`. Use `getSharedPluginData()` / `setSharedPluginData()` instead (these ARE supported), or track nodes by returning IDs.

```js
// WRONG — not supported in use_figma
node.setPluginData('my_key', 'my_value')
const val = node.getPluginData('my_key')

// CORRECT — use shared plugin data (requires a namespace)
node.setSharedPluginData('my_namespace', 'my_key', 'my_value')
const val = node.getSharedPluginData('my_namespace', 'my_key')

// ALSO CORRECT — return node IDs and track them across calls
const rect = figma.createRectangle()
return { nodeId: rect.id }
// Then pass nodeId as a string literal in the next use_figma call
```

## Script must always return a value

```js
// WRONG — no return, caller gets no useful response
figma.createRectangle()

// CORRECT — return a result (objects are auto-serialized, errors are auto-captured)
const rect = figma.createRectangle()
return { nodeId: rect.id }
```

## setBoundVariable for paint fields only works on SOLID paints

```js
// Only SOLID paint type supports color variable binding
// Gradient paints, image paints, etc. will throw
const solidPaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }
const bound = figma.variables.setBoundVariableForPaint(solidPaint, "color", colorVar)
```

## Explicit variable modes must be set per component

```js
// WRONG — all variants render with the default (first) mode
const colorCollection = figma.variables.createVariableCollection("Colors")
// ... create variables and modes ...
// Components all show the first mode's values by default!

// CORRECT — set explicit mode on each component to get variant-specific values
component.setExplicitVariableModeForCollection(colorCollection, targetModeId)
```

## `lineHeight` and `letterSpacing` must be objects, not bare numbers

```js
// WRONG — throws or silently does nothing
style.lineHeight = 1.5
style.lineHeight = 24
style.letterSpacing = 0

// CORRECT
style.lineHeight = { unit: "AUTO" }                    // auto/intrinsic
style.lineHeight = { value: 24, unit: "PIXELS" }       // fixed pixel height
style.lineHeight = { value: 150, unit: "PERCENT" }     // percentage of font size

style.letterSpacing = { value: 0, unit: "PIXELS" }     // no tracking
style.letterSpacing = { value: -0.5, unit: "PIXELS" }  // tight
style.letterSpacing = { value: 5, unit: "PERCENT" }    // percent-based
```

This applies to both `TextStyle` and `TextNode` properties. The same rule applies inside `use_figma`, interactive plugins, and any other plugin API context.

## Font style names are file-dependent — use `listAvailableFontsAsync` to discover them

Font style names vary per provider and per Figma file. Always call `figma.listAvailableFontsAsync()` to discover exact style strings before loading — never guess or probe with try/catch. See [text-style-patterns.md](text-style-patterns.md#discovering-available-font-styles) for the discovery + load pattern.

## combineAsVariants does NOT auto-layout in `use_figma`

```js
// WRONG — all variants stack at position (0, 0), resulting in a tiny ComponentSet
const components = [comp1, comp2, comp3]
const cs = figma.combineAsVariants(components, figma.currentPage)
// cs.width/height will be the size of a SINGLE variant!

// CORRECT — manually layout children in a grid after combining
const cs = figma.combineAsVariants(components, figma.currentPage)
const colWidth = 120
const rowHeight = 56
cs.children.forEach((child, i) => {
  const col = i % numCols
  const row = Math.floor(i / numCols)
  child.x = col * colWidth
  child.y = row * rowHeight
})
// CRITICAL: resize from actual child bounds, not formula — formula errors leave variants outside the boundary
let maxX = 0, maxY = 0
for (const child of cs.children) {
  maxX = Math.max(maxX, child.x + child.width)
  maxY = Math.max(maxY, child.y + child.height)
}
cs.resizeWithoutConstraints(maxX + 40, maxY + 40)
```

## Paint `color` must not include `a` — use `opacity` at the paint level instead

Paint `color` only accepts `{r, g, b}`. Adding `a` to it throws `"Unrecognized key(s) in object: 'a' at [0].color"`. This is a common mistake coming from CSS `rgba()` muscle memory.

Alpha/opacity belongs at the **paint level** as `opacity`, not inside `color`.

```js
// WRONG — 'a' is not valid inside color; throws validation error
node.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 0.1 } }]

// CORRECT — opacity goes at the paint level
node.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.1 }]

// CORRECT — fully opaque (no opacity needed)
node.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }]
```

**COLOR variable values are the exception** — they do use `{r, g, b, a}`:

```js
// Variable values use {r, g, b, a} — this is correct for variables only
const colorVar = figma.variables.createVariable("bg", collection, "COLOR")
colorVar.setValueForMode(modeId, { r: 1, g: 0, b: 0, a: 1 })  // opaque red
colorVar.setValueForMode(modeId, { r: 0, g: 0, b: 0, a: 0 })  // fully transparent
```

## `layoutSizingVertical`/`layoutSizingHorizontal` = `'FILL'` requires auto-layout parent FIRST

```js
// WRONG — setting FILL before the node is a child of an auto-layout frame
const child = figma.createFrame()
child.layoutSizingVertical = 'FILL'  // ERROR: "FILL can only be set on children of auto-layout frames"
parent.appendChild(child)

// CORRECT — append to auto-layout parent FIRST, then set FILL
const child = figma.createFrame()
parent.appendChild(child)            // parent must have layoutMode set
child.layoutSizingVertical = 'FILL'  // Works!
```

**Tip:** use `figma.createAutoLayout()` (or `figma.createAutoLayout('VERTICAL')`) instead of `figma.createFrame()` when you want a parent that supports `FILL` children. It returns a frame with `layoutMode` already set and both axes hugging content, so you don't have to remember the property dance.

```js
const parent = figma.createAutoLayout()  // layoutMode = 'HORIZONTAL', sizing = AUTO
const child = figma.createFrame()
parent.appendChild(child)
child.layoutSizingHorizontal = 'FILL'    // Works immediately
```

## HUG parents collapse FILL children

A `HUG` parent cannot give `FILL` children meaningful size. If children have `layoutSizingHorizontal = "FILL"` but the parent is `"HUG"`, the children collapse to minimum size. The parent must be `"FILL"` or `"FIXED"` for FILL children to expand. This is a common cause of truncated text in select fields, inputs, and action rows.

```js
// WRONG — parent hugs, so FILL children get zero extra space
const parent = figma.createAutoLayout()
parent.layoutSizingHorizontal = 'HUG'
const child = figma.createFrame()
parent.appendChild(child)
child.layoutSizingHorizontal = 'FILL'  // collapses to min size!

// CORRECT — parent must be FIXED or FILL for FILL children to expand
const parent = figma.createAutoLayout()
parent.resize(400, 50)
parent.layoutSizingHorizontal = 'FIXED'  // or 'FILL' if inside another auto-layout
const child = figma.createFrame()
parent.appendChild(child)
child.layoutSizingHorizontal = 'FILL'  // expands to fill remaining 400px
```

## `layoutGrow` with a hugging parent causes content compression

```js
// WRONG — layoutGrow on a child when parent has primaryAxisSizingMode='AUTO' (hug)
// causes the child to SHRINK below its natural size instead of expanding
const parent = figma.createComponent()
parent.layoutMode = 'VERTICAL'
parent.primaryAxisSizingMode = 'AUTO'  // hug contents
const content = figma.createAutoLayout('VERTICAL')
parent.appendChild(content)
content.layoutGrow = 1  // BUG: content compresses, children hidden!

// CORRECT — only use layoutGrow when parent has FIXED sizing with extra space
content.layoutGrow = 0  // let content take its natural size
// OR: set parent to FIXED sizing first
parent.primaryAxisSizingMode = 'FIXED'
parent.resizeWithoutConstraints(300, 500)
content.layoutGrow = 1  // NOW it correctly fills remaining space
```

## `width` and `height` are read-only — use `resize()`

`node.width` and `node.height` are read-only. Assigning to them throws `"TypeError: no setter for property"`. Use `resize()` or `resizeWithoutConstraints()` instead.

Note: `x` and `y` are **not** read-only and can be set directly.

```js
// WRONG — throws "no setter for property"
node.width = 300
node.height = 64

// CORRECT — use resize() to change dimensions
node.resize(300, 64)           // change both
node.resize(300, node.height)  // change width only
node.resize(node.width, 64)    // change height only

// CORRECT — x and y are writable directly
node.x = 100
node.y = 200
```

For sections and component sets, use `resizeWithoutConstraints()` instead of `resize()` (see the sections gotcha above).

## `resize()` resets `primaryAxisSizingMode` and `counterAxisSizingMode` to FIXED

`resize(w, h)` silently resets **both** sizing modes to `FIXED`. If you call it after setting `HUG`, the frame locks to the exact pixel value you passed — even a throwaway like `1`.

```js
// WRONG — resize() after setting sizing mode overwrites it back to FIXED
const frame = figma.createComponent()
frame.layoutMode = 'VERTICAL'
frame.primaryAxisSizingMode = 'AUTO'  // hug height
frame.counterAxisSizingMode = 'FIXED'
frame.resize(300, 10)  // BUG: resets BOTH axes to 'FIXED'! Height stays at 10px forever.

// ESPECIALLY DANGEROUS — throwaway values when you only care about one axis
const comp = figma.createComponent()
comp.layoutMode = 'VERTICAL'
comp.layoutSizingHorizontal = 'FIXED'
comp.layoutSizingVertical = 'HUG'
comp.resize(280, 1)  // BUG: "I only want width=280" but this locks height to 1px!
// HUG was reset to FIXED by resize(), frame is now permanently 280×1

// CORRECT — call resize() FIRST, then set sizing modes
const frame = figma.createComponent()
frame.layoutMode = 'VERTICAL'
frame.resize(300, 40)  // use a reasonable default, never 0 or 1
frame.counterAxisSizingMode = 'FIXED'  // keep width fixed at 300
frame.primaryAxisSizingMode = 'AUTO'   // NOW set height to hug — this sticks!
// Or use the modern shorthand (equivalent):
// frame.layoutSizingHorizontal = 'FIXED'
// frame.layoutSizingVertical = 'HUG'
```

**Rule of thumb**: Never pass a throwaway/garbage value (like `1` or `0`) to `resize()` for an axis you intend to be `HUG`. Either call `resize()` before setting sizing modes, or use a reasonable default that won't cause visual bugs if the mode reset goes unnoticed.

## Node positions don't auto-reset after reparenting

```js
// WRONG — assuming positions reset when moving a node into a new parent
const node = figma.createRectangle()
node.x = 500; node.y = 500;
figma.currentPage.appendChild(node)
section.appendChild(node)  // node still at (500, 500) relative to section!

// CORRECT — explicitly set x/y after ANY reparenting operation
section.appendChild(node)
node.x = 80; node.y = 80;  // reset to desired position within section
```

## Grid layout with mixed-width rows causes overlaps

```js
// WRONG — using a single column offset for rows with different-width items
// e.g. vertical cards (320px) and horizontal cards (500px) in a 2-row grid
for (let i = 0; i < allCards.length; i++) {
  allCards[i].x = (i % 4) * 370  // 370 works for 320px cards but NOT 500px cards!
}

// CORRECT — compute each row's spacing independently based on actual child widths
const gap = 50
let x = 0
for (const card of horizontalCards) {
  card.x = x
  x += card.width + gap  // use actual width, not a fixed column size
}
```

## Sections don't auto-resize to fit content

```js
// WRONG — section stays at default size, content overflows
const section = figma.createSection()
section.name = "My Section"
section.appendChild(someNode) // node may be outside section bounds

// CORRECT — explicitly resize after adding content
const section = figma.createSection()
section.name = "My Section"
section.appendChild(someNode)
section.resize(
  Math.max(someNode.width + 100, 800),
  Math.max(someNode.height + 100, 600)
)
```

## `counterAxisAlignItems` does NOT support `'STRETCH'`

```js
// WRONG — 'STRETCH' is not a valid enum value
comp.counterAxisAlignItems = 'STRETCH'
// Error: Invalid enum value. Expected 'MIN' | 'MAX' | 'CENTER' | 'BASELINE', received 'STRETCH'

// CORRECT — use 'MIN' on the parent, then set children to FILL on the cross axis
comp.counterAxisAlignItems = 'MIN'
comp.appendChild(child)
// For vertical layout, stretch width:
child.layoutSizingHorizontal = 'FILL'
// For horizontal layout, stretch height:
child.layoutSizingVertical = 'FILL'
```

## Variable collection mode limits are plan-dependent

```js
// Figma limits modes per collection based on the team/org plan:
//   Free: 1 mode only (no addMode)
//   Professional: up to 4 modes
//   Organization/Enterprise: up to 40+ modes
//
// WRONG — creating 20 modes on a Professional plan will fail silently or throw
const coll = figma.variables.createVariableCollection("Variants")
for (let i = 0; i < 20; i++) coll.addMode("mode" + i) // May fail!

// CORRECT — if you need many modes, split across multiple collections
// E.g., instead of 1 collection with 20 modes (variant×color):
//   Collection A: 4 modes (variant: plain/outlined/soft/solid)
//   Collection B: 5 modes (color: neutral/primary/danger/success/warning)
// Then use setExplicitVariableModeForCollection for BOTH on each component
```

## Variables default to `ALL_SCOPES` — always set scopes explicitly

```js
// WRONG — variable appears in every property picker (fills, text, strokes, spacing, etc.)
const bgColor = figma.variables.createVariable("Background/Default", coll, "COLOR")
// bgColor.scopes defaults to ["ALL_SCOPES"] — pollutes all dropdowns

// CORRECT — restrict to relevant property pickers
const bgColor = figma.variables.createVariable("Background/Default", coll, "COLOR")
bgColor.scopes = ["FRAME_FILL", "SHAPE_FILL"]  // fill pickers only

const textColor = figma.variables.createVariable("Text/Default", coll, "COLOR")
textColor.scopes = ["TEXT_FILL"]  // text color picker only

const borderColor = figma.variables.createVariable("Border/Default", coll, "COLOR")
borderColor.scopes = ["STROKE_COLOR"]  // stroke picker only

const spacing = figma.variables.createVariable("Space/400", coll, "FLOAT")
spacing.scopes = ["GAP"]  // gap/spacing pickers only

// Hide primitives that are only referenced via aliases
const primitive = figma.variables.createVariable("Brand/500", coll, "COLOR")
primitive.scopes = []  // hidden from all pickers
```

## Binding fills on nodes with empty fills

```js
// WRONG — binding to a node with no fills does nothing
const comp = figma.createComponent()
comp.fills = [] // transparent
// Can't bind a color variable to fills that don't exist

// CORRECT — add a placeholder SOLID fill, then bind the variable
const comp = figma.createComponent()
const basePaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 } }
const boundPaint = figma.variables.setBoundVariableForPaint(basePaint, "color", colorVar)
comp.fills = [boundPaint]
// The variable's resolved value (which may be transparent) will control the actual color
```

## Mode names must be descriptive — never leave 'Mode 1'

Every new `VariableCollection` starts with one mode named `'Mode 1'`. Always rename it immediately. For single-mode collections use `'Default'`; for multi-mode collections use names from the source (e.g. `'Light'`/`'Dark'`, `'Desktop'`/`'Tablet'`/`'Mobile'`).

    // WRONG — generic names give no semantic meaning
    const coll = figma.variables.createVariableCollection('Colors')
    // coll.modes[0].name === 'Mode 1' — left as-is
    const darkId = coll.addMode('Mode 2')

    // CORRECT — rename immediately to match the source
    const coll = figma.variables.createVariableCollection('Colors')
    coll.renameMode(coll.modes[0].modeId, 'Light')   // was 'Mode 1'
    const darkId = coll.addMode('Dark')

    // For single-mode collections (primitives, spacing, etc.)
    const spacing = figma.variables.createVariableCollection('Spacing')
    spacing.renameMode(spacing.modes[0].modeId, 'Default')  // was 'Mode 1'

## CSS variable names must not contain spaces

When constructing a `var(--name)` string from a Figma variable name, replace BOTH slashes AND spaces with hyphens and convert to lowercase.

    // WRONG — only replacing slashes leaves spaces like 'var(--color-bg-brand secondary hover)'
    v.setVariableCodeSyntax('WEB', `var(--${figmaName.replace(/\//g, '-').toLowerCase()})`)

    // CORRECT — replace all whitespace and slashes in one pass
    v.setVariableCodeSyntax('WEB', `var(--${figmaName.replace(/[\s\/]+/g, '-').toLowerCase()})`)

**Best practice**: Preserve the original CSS variable name from the source token file rather than deriving it from the Figma name.

    // Preferred — use the source CSS name directly
    v.setVariableCodeSyntax('WEB', `var(${token.cssVar})`)  // e.g. '--color-bg-brand-secondary-hover'

## Calling type-specific methods without checking node type

Some methods only exist on specific node types. Calling them on the wrong type throws "TypeError: not a function". Always guard with a type check before calling type-specific methods.

```js
// WRONG — node might not be a TextNode
const node = await figma.getNodeByIdAsync('952:1253');
const segments = node.getStyledTextSegments(['hyperlink']); // TypeError if node isn't TEXT

// CORRECT — check type first
const node = await figma.getNodeByIdAsync('952:1253');
if (!node || node.type !== 'TEXT') return { error: `Expected TextNode, got ${node?.type ?? 'null'}` };
const segments = node.getStyledTextSegments(['hyperlink']);
```

Common type-specific methods and the types that have them:

| Method | Node type required |
|--------|-------------------|
| `getStyledTextSegments()` | `TEXT` |
| `setRangeFontName()`, `setRangeFontSize()` | `TEXT` |
| `createInstance()` | `COMPONENT` |
| `addComponentProperty()` | `COMPONENT`, `COMPONENT_SET` |
| `createVariant()` | `COMPONENT_SET` |

## Setting a non-existent property throws "object is not extensible"

Figma plugin API node objects are non-extensible — you cannot add new properties to them. Setting a property name that doesn't exist on a node type throws `"Cannot add property X, object is not extensible"` (surfaced as `"object is not extensible"`). This only fires on **write**, and only for properties not defined on that node type.

```js
// WRONG — 'strokeDashes' does not exist on VectorNode; throws "object is not extensible"
const v = figma.createVector()
v.strokeDashes = [4, 8]  // Error!

// CORRECT — the actual property is dashPattern
v.dashPattern = [4, 8]

// WRONG — any invented property name throws the same error
node.customColor = '#ff0000'  // Error — not a real API property
```

**How to avoid this**: Before setting any property, verify it exists on the node type by grepping [plugin-api-standalone.d.ts](plugin-api-standalone.d.ts). Property names that sound plausible but aren't in the typings will always throw.

## `detachInstance()` invalidates ancestor node IDs

When `detachInstance()` is called on a nested instance inside a library component instance, the parent instance may also get implicitly detached (converted from INSTANCE to FRAME with a **new ID**). Any previously cached ID for the parent becomes invalid.

```js
// WRONG — using cached parent ID after child detach
const parentId = parentInstance.id;
nestedChild.detachInstance();
const parent = await figma.getNodeByIdAsync(parentId); // null! ID changed.

// CORRECT — re-discover by traversal from a stable (non-instance) frame
const stableFrame = await figma.getNodeByIdAsync(manualFrameId);
nestedChild.detachInstance();
const parent = stableFrame.findOne(n => n.name === "ParentName");
```

If detaching multiple nested instances across siblings, do it in a **single** `use_figma` call — discover all targets by traversal before any detachment mutates the tree.
