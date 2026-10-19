# Terminal Compatibility Reference

How to detect terminal capabilities and degrade gracefully across environments.

## Terminal detection

### TTY detection

```tsx
const isTTY = process.stdin.isTTY && process.stdout.isTTY;
const isCI = Boolean(process.env.CI);
const isPiped = !process.stdin.isTTY;
```

If not a TTY (piped input, CI, etc.), skip the full Ink TUI and fall back to
non-interactive mode with defaults or flag-based configuration.

### Terminal dimensions

```tsx
import { useStdout } from 'ink';

const { stdout } = useStdout();
const columns = stdout.columns; // width in characters
const rows = stdout.rows;       // height in lines
```

Listen for resize:
```tsx
useEffect(() => {
  const onResize = () => { /* re-read stdout.columns/rows */ };
  stdout.on('resize', onResize);
  return () => stdout.off('resize', onResize);
}, []);
```

### Color support

Ink uses chalk internally. Colors outside the terminal's gamut are automatically
coerced to the closest available value.

Respect user preferences:
```tsx
// NO_COLOR standard: https://no-color.org/
const noColor = 'NO_COLOR' in process.env;

// FORCE_COLOR forces color even in non-TTY contexts
const forceColor = 'FORCE_COLOR' in process.env;
```

## Unicode and symbol fallbacks

Use the `figures` package for cross-platform symbols:

```bash
npm install figures
```

```tsx
import figures from 'figures';

// figures.tick       → ✓  (or √ on Windows CMD)
// figures.cross      → ✗  (or × on Windows CMD)
// figures.bullet     → ●  (or * on Windows CMD)
// figures.pointer    → ❯  (or > on Windows CMD)
// figures.arrowRight → →  (or > on Windows CMD)
// figures.line       → ─  (or - on Windows CMD)
```

For custom detection:
```tsx
const supportsUnicode = process.env.TERM !== 'dumb'
  && !process.env.CI
  && process.platform !== 'win32';
```

## Responsive layouts

Adapt to terminal width:

```tsx
const { stdout } = useStdout();
const isNarrow = stdout.columns < 60;
const isShort = stdout.rows < 20;

return (
  <Box flexDirection="column">
    {/* Collapse tab labels on narrow terminals */}
    <Box gap={isNarrow ? 0 : 1}>
      {TABS.map((tab, i) => (
        <Text key={tab}>
          {isNarrow ? tab[0] : tab}
        </Text>
      ))}
    </Box>

    {/* Skip borders on very narrow terminals */}
    <Box borderStyle={isNarrow ? undefined : 'round'}>
      {children}
    </Box>
  </Box>
);
```

## Cross-terminal testing checklist

Test on all of these before shipping:

- [ ] macOS Terminal.app
- [ ] iTerm2
- [ ] VS Code integrated terminal
- [ ] Hyper
- [ ] Windows Terminal
- [ ] PowerShell
- [ ] CMD (Command Prompt)
- [ ] Linux (GNOME Terminal, Konsole, Alacritty, kitty)
- [ ] SSH sessions
- [ ] tmux / screen

Common issues:
- **Overflow rendering**: Content wider than terminal renders on top of itself.
  Always constrain widths or use `wrap="truncate"` on Text.
- **Color schemes**: Light vs dark terminals. Use semantic colors (green=success,
  red=error) rather than absolute colors that may clash with backgrounds.
- **Character sets**: Box-drawing characters (─│┐└ etc.) may not render in all
  terminals. The `figures` package handles common fallbacks, but custom border
  characters may need manual ASCII alternatives.

## Non-interactive fallback

When the terminal doesn't support interactive mode:

```tsx
// cli.tsx
import { render } from 'ink';

if (!process.stdin.isTTY || process.env.CI) {
  // Non-interactive mode: use flags or defaults
  await runNonInteractive(parsedArgs);
} else {
  // Full TUI mode
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
```

Or use @inquirer/prompts as a simpler fallback:
```tsx
import { select, confirm } from '@inquirer/prompts';

const framework = await select({
  message: 'Select your framework',
  choices: [
    { name: 'Next.js', value: 'nextjs' },
    { name: 'React', value: 'react' },
  ],
});
```
