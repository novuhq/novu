# @inkjs/ui Component Reference

Official component library for Ink. Provides themeable, production-ready UI widgets.
Source: https://github.com/vadimdemedes/ink-ui

Install: `npm install @inkjs/ui`

All components import from `@inkjs/ui`. Do NOT use the older standalone packages
(ink-text-input, ink-select-input, ink-spinner) — this package supersedes them.

## Input Components

### TextInput

Single-line text input.

```tsx
import { TextInput } from '@inkjs/ui';

<TextInput
  placeholder="Enter your API key..."
  onSubmit={(value) => { /* value is the entered string */ }}
/>
```

### EmailInput

Text input validated for email format.

```tsx
import { EmailInput } from '@inkjs/ui';

<EmailInput
  placeholder="you@example.com"
  onSubmit={(value) => { /* validated email string */ }}
/>
```

### PasswordInput

Masked text input for sensitive values.

```tsx
import { PasswordInput } from '@inkjs/ui';

<PasswordInput
  placeholder="Enter password..."
  onSubmit={(value) => { /* password string */ }}
/>
```

### ConfirmInput

Yes/No confirmation prompt.

```tsx
import { ConfirmInput } from '@inkjs/ui';

<ConfirmInput
  onConfirm={() => { /* user confirmed */ }}
  onCancel={() => { /* user cancelled */ }}
/>
```

### Select

Scrollable single-select list. User picks one option.

```tsx
import { Select } from '@inkjs/ui';

<Select
  options={[
    { label: 'Next.js', value: 'nextjs' },
    { label: 'React (Vite)', value: 'react-vite' },
    { label: 'Vue', value: 'vue' },
    { label: 'Svelte', value: 'svelte' },
  ]}
  onChange={(newValue) => {
    // newValue equals the `value` field of the selected option
    // e.g. "nextjs"
  }}
/>
```

### MultiSelect

Scrollable multi-select list. User picks one or more options.

```tsx
import { MultiSelect } from '@inkjs/ui';

<MultiSelect
  options={[
    { label: 'Session Recording', value: 'session-recording' },
    { label: 'Feature Flags', value: 'feature-flags' },
    { label: 'A/B Testing', value: 'ab-testing' },
    { label: 'Surveys', value: 'surveys' },
  ]}
  onChange={(newValues) => {
    // newValues is an array of selected value fields
    // e.g. ["session-recording", "feature-flags"]
  }}
/>
```

## Feedback Components

### Spinner

Animated loading indicator.

```tsx
import { Spinner } from '@inkjs/ui';

<Spinner label="Installing dependencies..." />
```

### ProgressBar

Determinate progress indicator. Extended version of Spinner.

```tsx
import { ProgressBar } from '@inkjs/ui';

// progress must be a number between 0 and 100
<Box width={30}>
  <ProgressBar value={progress} />
</Box>
```

Full example with state:
```tsx
const [progress, setProgress] = useState(0);

useEffect(() => {
  if (progress === 100) return;
  const timer = setTimeout(() => setProgress(p => p + 1), 50);
  return () => clearTimeout(timer);
}, [progress]);

return (
  <Box width={30}>
    <ProgressBar value={progress} />
  </Box>
);
```

### Badge

Colored status indicator label.

```tsx
import { Badge } from '@inkjs/ui';

<Badge color="green">Pass</Badge>
<Badge color="red">Fail</Badge>
<Badge color="yellow">Warn</Badge>
<Badge color="blue">Todo</Badge>
```

### StatusMessage

Status indicator with icon and longer explanation text.

```tsx
import { StatusMessage } from '@inkjs/ui';

<StatusMessage variant="success">
  PostHog snippet added to your app
</StatusMessage>

<StatusMessage variant="error">
  Failed to install posthog-js
</StatusMessage>

<StatusMessage variant="warning">
  No API key found in environment
</StatusMessage>

<StatusMessage variant="info">
  Using default configuration
</StatusMessage>
```

### Alert

Boxed alert message for important information.

```tsx
import { Alert } from '@inkjs/ui';

<Alert variant="info">
  Your PostHog project key was found in .env
</Alert>
```

## List Components

### OrderedList

Numbered list with nesting support.

```tsx
import { OrderedList } from '@inkjs/ui';

<OrderedList>
  <OrderedList.Item>
    <Text>Install posthog-js</Text>
  </OrderedList.Item>
  <OrderedList.Item>
    <Text>Add initialization code</Text>
    <OrderedList>
      <OrderedList.Item>
        <Text>Import PostHog</Text>
      </OrderedList.Item>
      <OrderedList.Item>
        <Text>Call posthog.init()</Text>
      </OrderedList.Item>
    </OrderedList>
  </OrderedList.Item>
  <OrderedList.Item>
    <Text>Verify events</Text>
  </OrderedList.Item>
</OrderedList>
```

### UnorderedList

Bulleted list with nesting support. Same API pattern as OrderedList.

## Theming

All @inkjs/ui components are styled via a theme system using React context.
You can customize any component's appearance.

### Using the default theme

Components work out of the box with the default theme.

### Customizing the theme

```tsx
import { render, type TextProps } from 'ink';
import { Spinner, ThemeProvider, extendTheme, defaultTheme } from '@inkjs/ui';

const posthogTheme = extendTheme(defaultTheme, {
  components: {
    Spinner: {
      styles: {
        frame: (): TextProps => ({
          color: 'magenta',
        }),
      },
    },
    StatusMessage: {
      styles: {
        icon: ({ variant }): TextProps => ({
          color: {
            success: 'green',
            error: 'red',
            warning: 'yellow',
            info: '#1d4aff',  // PostHog blue
          }[variant],
        }),
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={posthogTheme}>
      <Spinner label="Loading..." />
    </ThemeProvider>
  );
}

render(<App />);
```

### Theme structure

Each component's theme has:
- `styles` — Functions that return TextProps or BoxProps based on component state
- `config` — Non-visual configuration (like list markers, default values)

Access a component's theme in custom components:
```tsx
import { useComponentTheme } from '@inkjs/ui';

const theme = useComponentTheme('Spinner');
```

## Combining with core Ink

These components compose naturally with core Ink layout:

```tsx
<Box flexDirection="column" gap={1}>
  <Text bold>Configure PostHog features:</Text>

  <MultiSelect
    options={featureOptions}
    onChange={setSelectedFeatures}
  />

  {selectedFeatures.length > 0 && (
    <StatusMessage variant="success">
      {selectedFeatures.length} features selected
    </StatusMessage>
  )}

  <Box marginTop={1}>
    <Text dimColor>Press enter to continue</Text>
  </Box>
</Box>
```
