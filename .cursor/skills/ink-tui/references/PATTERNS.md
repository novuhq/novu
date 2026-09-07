# Layout Patterns & Design Recipes

Common patterns for building wizard-style TUIs with Ink.

## Layout patterns

### Full-screen app shell (3-zone layout)

The standard wizard layout: header → content → footer.

```tsx
import { Box, Text, useStdout } from 'ink';

const AppShell = ({ header, children, footer }) => {
  const { stdout } = useStdout();

  return (
    <Box flexDirection="column" height={stdout.rows}>
      {/* Header — fixed height */}
      <Box paddingX={1} justifyContent="space-between">
        {header}
      </Box>

      {/* Content — fills remaining space */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} overflow="hidden">
        {children}
      </Box>

      {/* Footer — fixed height */}
      <Box paddingX={1}>
        {footer}
      </Box>
    </Box>
  );
};
```

### Two-column layout (sidebar + main)

```tsx
<Box flexGrow={1}>
  {/* Sidebar */}
  <Box flexDirection="column" width={30}
       borderStyle="single" borderRight
       borderTop={false} borderBottom={false} borderLeft={false}>
    {sidebarContent}
  </Box>

  {/* Main content */}
  <Box flexDirection="column" flexGrow={1} paddingLeft={2}>
    {mainContent}
  </Box>
</Box>
```

### Bordered panel component

```tsx
const Panel = ({ title, children, borderColor = 'cyan' }) => (
  <Box flexDirection="column" borderStyle="single" borderColor={borderColor}
       paddingX={1} paddingY={0}>
    {title && (
      <Box marginBottom={1}>
        <Text bold color={borderColor}>{title}</Text>
      </Box>
    )}
    {children}
  </Box>
);
```

### Inline mode (non-fullscreen)

For short interactions that should scroll with terminal history, don't set
`height` on the root Box. Ink will render inline and scroll naturally.

```tsx
// Inline: just renders and scrolls
<Box flexDirection="column">
  <Text>Quick question:</Text>
  <Select options={options} onChange={handleSelect} />
</Box>

// vs. Full-screen: takes over the terminal
<Box flexDirection="column" height={stdout.rows}>
  {/* ... */}
</Box>
```

## Tab navigation pattern

### Tab bar component

```tsx
import React from 'react';
import { Box, Text } from 'ink';
import figures from 'figures';

type Tab = { label: string; status: 'pending' | 'active' | 'complete' };

const TabBar = ({ tabs, activeIndex }: { tabs: Tab[], activeIndex: number }) => (
  <Box gap={1} paddingX={1}>
    {tabs.map((tab, i) => {
      const icon = tab.status === 'complete'
        ? figures.tick
        : tab.status === 'active'
        ? figures.pointer
        : figures.bullet;

      const color = tab.status === 'complete'
        ? 'green'
        : i === activeIndex
        ? 'cyan'
        : 'gray';

      return (
        <Text key={i} color={color} bold={i === activeIndex}>
          {icon} {tab.label}
        </Text>
      );
    })}
  </Box>
);
```

### Tab switching with useInput

```tsx
const [activeTab, setActiveTab] = useState(0);

useInput((input, key) => {
  if (key.leftArrow) setActiveTab(i => Math.max(0, i - 1));
  if (key.rightArrow) setActiveTab(i => Math.min(TABS.length - 1, i + 1));

  // Number keys for direct tab access
  const num = parseInt(input, 10);
  if (num >= 1 && num <= TABS.length) setActiveTab(num - 1);
}, { isActive: !isInputFocused }); // disable when typing in an input
```

**Important:** Use `isActive: false` on the tab-switching `useInput` when the user
is focused on a text input or other component that needs arrow keys. Otherwise
arrow keys will switch tabs instead of navigating within the component.

### Conditional rendering for tab content

```tsx
// Simple: mount/unmount (loses state when switching away)
{activeTab === 0 && <SetupTab />}

// Preserve state: render all but hide inactive
{TABS.map((_, i) => (
  <Box key={i} display={i === activeTab ? 'flex' : 'none'}
       flexDirection="column" flexGrow={1}>
    <TabContent index={i} />
  </Box>
))}
```

## State management patterns

### Centralized wizard state hook

```tsx
interface WizardState {
  framework: string | null;
  language: 'typescript' | 'javascript' | null;
  apiKey: string | null;
  features: string[];
  installStatus: 'idle' | 'running' | 'success' | 'error';
  error: string | null;
}

const initialState: WizardState = {
  framework: null,
  language: null,
  apiKey: null,
  features: [],
  installStatus: 'idle',
  error: null,
};

export function useWizardState() {
  const [state, setState] = useState<WizardState>(initialState);

  const update = (patch: Partial<WizardState>) =>
    setState(prev => ({ ...prev, ...patch }));

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 0: return state.framework !== null;
      case 1: return state.apiKey !== null;
      case 2: return state.installStatus === 'success';
      case 3: return false; // verification is terminal
      default: return false;
    }
  };

  return { state, update, isStepComplete };
}
```

### Tab-to-tab data flow

Pass wizard state down to tabs, and `onComplete` callbacks up:

```tsx
const App = () => {
  const { state, update, isStepComplete } = useWizardState();
  const [activeTab, setActiveTab] = useState(0);

  const advanceTab = () =>
    setActiveTab(i => Math.min(TABS.length - 1, i + 1));

  return (
    <AppShell>
      {activeTab === 0 && (
        <SetupTab
          onSelect={(fw) => { update({ framework: fw }); advanceTab(); }}
        />
      )}
      {activeTab === 1 && (
        <ConfigTab
          framework={state.framework}
          onComplete={(config) => { update(config); advanceTab(); }}
        />
      )}
      {activeTab === 2 && (
        <InstallTab config={state} onComplete={() => advanceTab()} />
      )}
    </AppShell>
  );
};
```

## Progress and completion patterns

### Spinner → result replacement

Show a spinner while working, then replace in-place with the result:

```tsx
const Step = ({ label, status }: { label: string; status: 'pending' | 'running' | 'done' | 'error' }) => (
  <Box gap={1}>
    {status === 'running' && <Spinner label="" />}
    {status === 'done' && <Text color="green">{figures.tick}</Text>}
    {status === 'error' && <Text color="red">{figures.cross}</Text>}
    {status === 'pending' && <Text dimColor>{figures.bullet}</Text>}
    <Text dimColor={status === 'pending'}>{label}</Text>
  </Box>
);
```

### Multi-step progress list

```tsx
const steps = [
  { id: 'deps', label: 'Installing dependencies', status: 'done' },
  { id: 'config', label: 'Writing configuration', status: 'running' },
  { id: 'snippet', label: 'Adding code snippet', status: 'pending' },
  { id: 'verify', label: 'Verifying setup', status: 'pending' },
];

<Box flexDirection="column" gap={0}>
  {steps.map(step => <Step key={step.id} {...step} />)}
</Box>
```

## Debug logging

Never write debug output to stdout — it will corrupt the Ink display.
Write to a file or stderr instead:

```tsx
import { writeFileSync, appendFileSync } from 'node:fs';

const debug = (msg: string) => {
  if (process.env.DEBUG) {
    appendFileSync('/tmp/wizard-debug.log', `${new Date().toISOString()} ${msg}\n`);
  }
};
```

Or use `useStderr()`:
```tsx
const { write } = useStderr();
write('Debug: something happened\n');
```
