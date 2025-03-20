import { FILTERS } from '@/components/variable/constants';
import { LiquidVariable } from '@/utils/parseStepVariablesToLiquidVariables';
import { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { EditorView } from '@uiw/react-codemirror';

interface CompletionOption {
  label: string;
  type: string;
  boost?: number;
}

const ROOT_PREFIXES = {
  subscriber: 'subscriber.',
  payload: 'payload.',
  steps: 'steps.',
} as const;

const VALID_DYNAMIC_PATHS = ['subscriber.data.', 'payload.', /^steps\.[^.]+\.events\[\d+\]\.payload\./] as const;

/**
 * Liquid variable autocomplete for the following patterns:
 *
 * 1. Payload Variables:
 *    Valid:
 *    - payload.
 *    - payload.user
 *    - payload.anyNewField (allows any new field)
 *    - payload.deeply.nested.field
 *    Invalid:
 *    - pay (shows suggestions but won't validate)
 *    - payload (shows suggestions but won't validate)
 *
 * 2. Subscriber Variables:
 *    Valid:
 *    - subscriber.data.
 *    - subscriber.data.anyNewField (allows any new field)
 *    - subscriber.data.custom.nested.field
 *    - subscriber (shows suggestions but won't validate)
 *    - subscriber.email
 *    - subscriber.firstName
 *    Invalid:
 *    - subscriber.someOtherField (must use valid subscriber field)
 *
 * 3. Step Variables:
 *    Valid:
 *    - steps.
 *    - steps.digest-step (must be existing step ID)
 *    - steps.digest-step.events
 *    - steps.digest-step.events[0]
 *    - steps.digest-step.events[0].id
 *    - steps.digest-step.events[0].payload
 *    - steps.digest-step.events[0].payload.anyNewField (allows any new field after payload)
 *    - steps.digest-step.events[0].payload.deeply.nested.field
 *    Invalid:
 *    - steps.invalid-step (must use existing step ID)
 *    - steps.digest-step.payload (must use events[n].payload pattern)
 *    - steps.digest-step.events.payload (must use events[n] pattern)
 *    - steps.digest-step.invalidProp (only events[] is allowed)
 *
 * Autocomplete Behavior:
 * 1. Shows suggestions when typing partial prefixes:
 *    - 'su' -> shows subscriber.data.* variables
 *    - 'pay' -> shows payload.* variables
 *    - 'ste' -> shows steps.* variables
 *
 * 2. Shows suggestions with closing braces:
 *    - '{{su}}' -> shows subscriber.data.* variables
 *    - '{{payload.}}' -> shows payload.* variables
 *
 * 3. Allows new variables after valid prefixes:
 *    - subscriber.data.* (any new field)
 *    - payload.* (any new field)
 *    - steps.{valid-step}.events[n].payload.* (any new field)
 */
export const completions =
  (variables: LiquidVariable[]) =>
  (context: CompletionContext): CompletionResult | null => {
    const { state, pos } = context;
    const beforeCursor = state.sliceDoc(0, pos);

    // Only proceed if we're inside or just after {{
    const lastOpenBrace = beforeCursor.lastIndexOf('{{');
    if (lastOpenBrace === -1) return null;

    // Get the content between {{ and cursor
    const insideBraces = state.sliceDoc(lastOpenBrace + 2, pos);

    // Get clean search text without braces and trim
    const searchText = insideBraces.replace(/}+$/, '').trim();

    // Handle pipe filters
    const afterPipe = getContentAfterPipe(searchText);

    if (afterPipe !== null) {
      return {
        from: pos - afterPipe.length,
        to: pos,
        options: getFilterCompletions(afterPipe),
      };
    }

    const matchingVariables = getMatchingVariables(searchText, variables);

    // If we have matches or we're in a valid context, show them
    if (matchingVariables.length > 0 || isInsideLiquidBlock(beforeCursor)) {
      return {
        from: lastOpenBrace + 2,
        to: pos,
        options:
          matchingVariables.length > 0
            ? matchingVariables.map((v) => createCompletionOption(v.label, 'variable'))
            : variables.map((v) => createCompletionOption(v.label, 'variable')),
      };
    }

    return null;
  };

function isInsideLiquidBlock(beforeCursor: string): boolean {
  const lastOpenBrace = beforeCursor.lastIndexOf('{{');

  return lastOpenBrace !== -1;
}

function getContentAfterPipe(content: string): string | null {
  const pipeIndex = content.lastIndexOf('|');
  if (pipeIndex === -1) return null;

  return content.slice(pipeIndex + 1).trimStart();
}

function createCompletionOption(label: string, type: string, boost?: number): CompletionOption {
  return { label, type, ...(boost && { boost }) };
}

function getFilterCompletions(afterPipe: string): CompletionOption[] {
  return FILTERS.filter((f) => f.label.toLowerCase().startsWith(afterPipe.toLowerCase())).map((f) =>
    createCompletionOption(f.value, 'function')
  );
}

function isValidDynamicPath(searchText: string): boolean {
  return VALID_DYNAMIC_PATHS.some((path) =>
    typeof path === 'string' ? searchText.startsWith(path) : path.test(searchText)
  );
}

function validateSubscriberField(searchText: string, matches: LiquidVariable[]): LiquidVariable[] {
  const parts = searchText.split('.');

  if (parts.length === 2 && parts[0] === 'subscriber') {
    if (!matches.some((v) => v.label === searchText)) {
      return [];
    }
  }

  return matches;
}

function validateStepId(searchText: string, variables: LiquidVariable[]): boolean {
  if (!searchText.startsWith('steps.')) return true;

  const stepMatch = searchText.match(/^steps\.([^.]+)/);
  if (!stepMatch) return true;

  const stepId = stepMatch[1];
  return variables.some((v) => v.label.startsWith(`steps.${stepId}.`));
}

function getMatchingVariables(searchText: string, variables: LiquidVariable[]): LiquidVariable[] {
  if (!searchText) return variables;

  const searchLower = searchText.toLowerCase();

  // Handle root prefixes and their partials
  for (const [root, prefix] of Object.entries(ROOT_PREFIXES)) {
    if (searchLower.startsWith(root) || root.startsWith(searchLower)) {
      let matches = variables.filter((v) => v.label.startsWith(prefix));

      // Special handling for subscriber fields
      if (prefix === 'subscriber.') {
        matches = validateSubscriberField(searchText, matches);
      }

      // Allow new paths for dynamic paths
      if (isValidDynamicPath(searchText)) {
        if (!matches.some((v) => v.label === searchText)) {
          matches.push({ label: searchText, type: 'variable' } as LiquidVariable);
        }
      }

      return matches;
    }
  }

  // Handle dot endings
  if (searchText.endsWith('.')) {
    const prefix = searchText.slice(0, -1);
    return variables.filter((v) => v.label.startsWith(prefix));
  }

  // Validate step ID exists
  if (!validateStepId(searchText, variables)) {
    return [];
  }

  // Default case: show any variables containing the search text
  return variables.filter((v) => v.label.toLowerCase().includes(searchLower));
}

export function createAutocompleteSource(variables: LiquidVariable[]) {
  return (context: CompletionContext) => {
    // Match text that starts with {{ and capture everything after it until the cursor position
    const word = context.matchBefore(/\{\{([^}]*)/);
    if (!word) return null;

    const options = completions(variables)(context);
    if (!options) return null;

    const { from, to } = options;

    return {
      from,
      to,
      options: options.options.map((option) => ({
        ...option,
        apply: (view: EditorView, completion: Completion, from: number, to: number) => {
          const selectedValue = completion.label;
          const content = view.state.doc.toString();
          const beforeCursor = content.slice(0, from);
          const afterCursor = content.slice(to);

          // Ensure proper {{ }} wrapping
          const needsOpening = !beforeCursor.endsWith('{{');
          const needsClosing = !afterCursor.startsWith('}}');

          const wrappedValue = `${needsOpening ? '{{' : ''}${selectedValue}${needsClosing ? '}}' : ''}`;

          // Calculate the final cursor position
          // Add 2 if we need to account for closing brackets
          const finalCursorPos = from + wrappedValue.length + (needsClosing ? 0 : 2);

          view.dispatch({
            changes: { from, to, insert: wrappedValue },
            selection: { anchor: finalCursorPos },
          });

          return true;
        },
      })),
    };
  };
}
