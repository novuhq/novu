# Ink API Reference

Complete reference for Ink's built-in components and hooks.
Source: https://github.com/vadimdemedes/ink (v5.x, 35k+ stars)

## Components

### `<Text>`

Displays text with styling. All visible text MUST be inside `<Text>`.
Nested `<Text>` is allowed for inline styling. `<Box>` CANNOT be inside `<Text>`.

```tsx
<Text color="green">I am green</Text>
<Text color="#005cc5">Hex color</Text>
<Text color="rgb(232, 131, 136)">RGB color</Text>
<Text bold>Bold</Text>
<Text italic>Italic</Text>
<Text underline>Underlined</Text>
<Text strikethrough>Strikethrough</Text>
<Text inverse>Inversed</Text>
<Text dimColor>Dimmed</Text>

// Nested inline styling
<Text>Status: <Text color="green" bold>Ready</Text></Text>
```

**Props:**
- `color: string` — Text color. Supports chalk color names, hex (#005cc5), rgb()
- `backgroundColor: string` — Background color. Same format as color
- `dimColor: boolean` — Make color less bright
- `bold: boolean`
- `italic: boolean`
- `underline: boolean`
- `strikethrough: boolean`
- `inverse: boolean` — Swap foreground/background
- `wrap: 'wrap' | 'truncate' | 'truncate-start' | 'truncate-middle' | 'truncate-end'`
  Default: `'wrap'`. Controls text overflow behavior.

```tsx
// Truncation examples
<Box width={7}><Text>Hello World</Text></Box>           // "Hello\nWorld"
<Box width={7}><Text wrap="truncate">Hello World</Text></Box>  // "Hello…"
<Box width={7}><Text wrap="truncate-middle">Hello World</Text></Box> // "He…ld"
<Box width={7}><Text wrap="truncate-start">Hello World</Text></Box>  // "…World"
```

### `<Box>`

Essential layout component. Like `<div style="display: flex">` in the browser.
Every `<Box>` is a Flexbox container by default.

**Dimension props:**
- `width: number | string` — Width in spaces. Supports percentages: `width="50%"`
- `height: number | string` — Height in lines. Supports percentages
- `minWidth: number`
- `minHeight: number`

**Padding props:**
- `padding: number` — All sides
- `paddingX: number` — Left and right
- `paddingY: number` — Top and bottom
- `paddingTop / paddingBottom / paddingLeft / paddingRight: number`

**Margin props:**
- `margin: number` — All sides
- `marginX: number` — Left and right
- `marginY: number` — Top and bottom
- `marginTop / marginBottom / marginLeft / marginRight: number`

**Gap props:**
- `gap: number` — Shorthand for columnGap + rowGap
- `columnGap: number`
- `rowGap: number`

**Flex props:**
- `flexDirection: 'row' | 'row-reverse' | 'column' | 'column-reverse'`
- `flexGrow: number` (default: 0)
- `flexShrink: number` (default: 1)
- `flexBasis: number | string`
- `flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'`
- `alignItems: 'flex-start' | 'center' | 'flex-end'`
- `alignSelf: 'auto' | 'flex-start' | 'center' | 'flex-end'`
- `justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly'`

**Border props:**
- `borderStyle: 'single' | 'double' | 'round' | 'bold' | 'singleDouble' | 'doubleSingle' | 'classic' | BoxStyle`
- `borderColor: string` — All sides. Same color format as Text
- `borderTopColor / borderRightColor / borderBottomColor / borderLeftColor: string`
- `borderDimColor: boolean` — Dim all border colors
- `borderTopDimColor / borderRightDimColor / borderBottomDimColor / borderLeftDimColor: boolean`
- `borderTop / borderRight / borderBottom / borderLeft: boolean` (default: true) — Show/hide individual sides

Custom border style:
```tsx
<Box borderStyle={{
  topLeft: '↘', top: '↓', topRight: '↙',
  left: '→', bottomLeft: '↗', bottom: '↑',
  bottomRight: '↖', right: '←'
}}>
  <Text>Custom borders</Text>
</Box>
```

**Background:**
- `backgroundColor: string` — Fills entire Box area. Inherited by child Text unless overridden.

```tsx
<Box backgroundColor="cyan" borderStyle="round" padding={1} alignSelf="flex-start">
  <Text>Background with border and padding</Text>
</Box>
```

**Visibility:**
- `display: 'flex' | 'none'` — Set to `none` to hide
- `overflow: 'visible' | 'hidden'` — Shorthand for overflowX + overflowY
- `overflowX / overflowY: 'visible' | 'hidden'`

### `<Newline>`

Adds newline characters. Must be used within `<Text>`.

- `count: number` (default: 1)

### `<Spacer>`

Flexible space that expands along the major axis. Like `flex-grow: 1`.

```tsx
<Box>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</Box>
```

### `<Static>`

Permanently renders output above everything else. Items are rendered once and never
re-rendered. Ideal for completed tasks, logs, or any output that doesn't change.

Used by Gatsby (page generation list), tap (test results), and similar tools.

```tsx
<Static items={completedTasks}>
  {(task) => (
    <Box key={task.id}>
      <Text color="green">✔ {task.title}</Text>
    </Box>
  )}
</Static>

{/* Live content below — keeps updating */}
<Box marginTop={1}>
  <Text dimColor>Completed: {completedTasks.length}</Text>
</Box>
```

**Props:**
- `items: Array<T>` — Array of items to render
- `style: object` — Styles for the container (same as Box props)
- `children: (item: T, index: number) => ReactNode` — Render function. Must return element with `key`.

**Important:** Only NEW items appended to the array are rendered. Changes to previously
rendered items are ignored. This is by design for performance.

### `<Transform>`

Transforms string output of child components before rendering. Only applies to
`<Text>` children. Must not change output dimensions.

```tsx
<Transform transform={output => output.toUpperCase()}>
  <Text>Hello World</Text>
</Transform>
// Renders: "HELLO WORLD"

// Hanging indent (different transform per line):
<Transform transform={(line, index) =>
  index === 0 ? line : '    ' + line
}>
  <Text>{longParagraph}</Text>
</Transform>
```

## Hooks

### `useInput(handler, options?)`

Handle keyboard input. The handler receives each character or the full pasted string.

```tsx
useInput((input, key) => {
  if (input === 'q') exit();
  if (key.leftArrow) { /* ... */ }
  if (key.return) { /* ... */ }
  if (key.escape) { /* ... */ }
  if (key.tab) { /* ... */ }
  if (key.backspace) { /* ... */ }
  if (key.delete) { /* ... */ }
  if (key.pageUp) { /* ... */ }
  if (key.pageDown) { /* ... */ }
  if (key.upArrow) { /* ... */ }
  if (key.downArrow) { /* ... */ }
  if (key.ctrl) { /* Ctrl held */ }
  if (key.shift) { /* Shift held */ }
  if (key.meta) { /* Meta/Alt held */ }
});
```

**Options:**
- `isActive: boolean` — Enable/disable the handler. Default: true. Useful for
  disabling input in inactive tabs or when a modal is open.

### `useApp()`

Returns: `{ exit: (error?: Error) => void }`

Call `exit()` to quit the app. Pass an Error to exit with non-zero code.

### `useStdin()`

Returns: `{ stdin: NodeJS.ReadStream, isRawModeSupported: boolean, setRawMode: (mode: boolean) => void }`

### `useStdout()`

Returns: `{ stdout: NodeJS.WriteStream, write: (data: string) => void }`

Key properties on `stdout`:
- `stdout.columns` — Terminal width
- `stdout.rows` — Terminal height

### `useStderr()`

Returns: `{ stderr: NodeJS.WriteStream, write: (data: string) => void }`

### `useFocus(options?)`

Makes a component focusable. Navigate between focusable components with Tab/Shift+Tab.

```tsx
const { isFocused } = useFocus();
// or
const { isFocused } = useFocus({ autoFocus: true }); // focus on mount
const { isFocused } = useFocus({ isActive: false });  // temporarily disable
const { isFocused } = useFocus({ id: 'my-input' });   // named focus target
```

### `useFocusManager()`

Programmatically control focus.

```tsx
const { focusNext, focusPrevious, focus, enableFocus, disableFocus } = useFocusManager();

focusNext();           // Move focus to next focusable element
focusPrevious();       // Move focus to previous
focus('my-input');     // Focus specific element by id
disableFocus();        // Disable all focus management
enableFocus();         // Re-enable focus management
```

### `useCursor()`

Set cursor position relative to Ink output. Use `string-width` for accurate positioning
with CJK/emoji characters.

```tsx
const { setCursorPosition } = useCursor();
setCursorPosition({ x: 5, y: 1 }); // position cursor
setCursorPosition(undefined);        // hide cursor
```

## `render()` API

```tsx
import { render } from 'ink';

const { unmount, waitUntilExit, rerender, clear } = render(<App />);

await waitUntilExit(); // Promise that resolves when app exits
unmount();             // Manually unmount
rerender(<App updated />); // Re-render with new props
clear();               // Clear output
```

## Testing

Ink provides `ink-testing-library` for unit testing:

```tsx
import { render } from 'ink-testing-library';

const { lastFrame, stdin, frames } = render(<MyComponent />);

// Check rendered output
expect(lastFrame()).toContain('Hello');

// Simulate input
stdin.write('q');

// Check all frames rendered
expect(frames).toHaveLength(2);
```
