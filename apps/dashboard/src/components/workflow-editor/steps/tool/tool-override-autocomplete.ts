import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { type ToolContentOverrideProviderId } from '@novu/shared';
import {
  getConstraints,
  getFieldSchemas,
  getToolOverrideFieldDefaultValue,
  getTypeLabel,
  type OverrideFieldSchema,
} from './tool-override-field-schema';

function getUsedKeys(doc: string): Set<string> | null {
  try {
    const parsed = JSON.parse(doc);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }

    return new Set(Object.keys(parsed));
  } catch {
    return null;
  }
}

function getPrecedingNonWhitespace(doc: string, from: number): string | null {
  for (let i = from - 1; i >= 0; i -= 1) {
    const char = doc[i];
    if (char === ' ' || char === '\t' || char === '\n' || char === '\r') {
      continue;
    }

    return char;
  }

  return null;
}

function isKeyPosition(doc: string, from: number): boolean {
  const preceding = getPrecedingNonWhitespace(doc, from);

  return preceding === null || preceding === '{' || preceding === ',';
}

function formatDefaultValue(value: unknown): string {
  return JSON.stringify(value);
}

function buildFieldInfo(fieldSchema: OverrideFieldSchema): string | undefined {
  const parts: string[] = [];

  if (fieldSchema.description) {
    parts.push(fieldSchema.description);
  }

  const constraints = getConstraints(fieldSchema);
  if (constraints.length > 0) {
    parts.push(constraints.join(' · '));
  }

  if (parts.length === 0) {
    return undefined;
  }

  return parts.join('\n');
}

/** True when another property key follows — call only after consuming any auto-closed key quote. */
function hasPropertyAfter(doc: string, pos: number): boolean {
  return /^\s*"/.test(doc.slice(pos));
}

/** Include an immediately following auto-closed `"` in the replacement range. */
function getKeyReplacementTo(doc: string, matchTo: number): number {
  if (doc[matchTo] === '"') {
    return matchTo + 1;
  }

  return matchTo;
}

function buildKeyCompletion(
  providerId: ToolContentOverrideProviderId,
  key: string,
  fieldSchema: OverrideFieldSchema
): Completion {
  const defaultValue = getToolOverrideFieldDefaultValue(providerId, key);

  return {
    label: key,
    type: 'property',
    detail: getTypeLabel(fieldSchema),
    info: buildFieldInfo(fieldSchema),
    apply: (view, _completion, from, to) => {
      // Resolve end from the live doc — CodeMirror's `to` may stop before an auto-closed `"`.
      const doc = view.state.doc.toString();
      const replaceTo = getKeyReplacementTo(doc, to);
      const valueLiteral = formatDefaultValue(defaultValue);
      const needsComma = hasPropertyAfter(doc, replaceTo);
      const insertText = `"${key}": ${valueLiteral}${needsComma ? ',' : ''}`;

      view.dispatch({
        changes: { from, to: replaceTo, insert: insertText },
        selection: {
          anchor: from + `"${key}": `.length + (typeof defaultValue === 'string' ? 1 : 0),
        },
      });
    },
  };
}

function createKeyCompletions(
  context: CompletionContext,
  providerId: ToolContentOverrideProviderId,
  fieldSchemas: Record<string, OverrideFieldSchema>
): CompletionResult | null {
  const doc = context.state.doc.toString();
  const quoteMatch = context.matchBefore(/"[\w-]*$/);

  if (quoteMatch) {
    if (!isKeyPosition(doc, quoteMatch.from)) {
      return null;
    }

    const usedKeys = getUsedKeys(doc);
    const typedPrefix = quoteMatch.text.slice(1);
    const replaceTo = getKeyReplacementTo(doc, quoteMatch.to);
    const options: Completion[] = Object.entries(fieldSchemas)
      .filter(([key]) => {
        if (usedKeys?.has(key)) {
          return false;
        }

        return key.startsWith(typedPrefix);
      })
      .map(([key, fieldSchema]) => buildKeyCompletion(providerId, key, fieldSchema));

    if (options.length === 0) {
      return null;
    }

    return {
      from: quoteMatch.from,
      to: replaceTo,
      options,
      filter: false,
      validFor: /"[\w-]*/,
    };
  }

  if (!context.explicit) {
    return null;
  }

  const preceding = getPrecedingNonWhitespace(doc, context.pos);
  if (preceding !== null && preceding !== '{' && preceding !== ',') {
    return null;
  }

  const usedKeys = getUsedKeys(doc);
  const options: Completion[] = Object.entries(fieldSchemas)
    .filter(([key]) => !usedKeys?.has(key))
    .map(([key, fieldSchema]) => buildKeyCompletion(providerId, key, fieldSchema));

  if (options.length === 0) {
    return null;
  }

  return {
    from: context.pos,
    options,
    filter: false,
  };
}

function createEnumValueCompletions(
  context: CompletionContext,
  fieldSchemas: Record<string, OverrideFieldSchema>
): CompletionResult | null {
  const before = context.state.doc.sliceString(0, context.pos);
  const enumMatch = before.match(/"([\w-]+)"\s*:\s*"([\w-]*)$/);

  if (!enumMatch) {
    return null;
  }

  const key = enumMatch[1];
  const typedValue = enumMatch[2];
  const fieldSchema = fieldSchemas[key];

  if (!fieldSchema?.enum || fieldSchema.enum.length === 0) {
    return null;
  }

  const options: Completion[] = fieldSchema.enum
    .filter((value) => value.startsWith(typedValue))
    .map(
      (value) =>
        ({
          label: value,
          type: 'enum',
          detail: 'enum',
          apply: value,
        }) satisfies Completion
    );

  if (options.length === 0) {
    return null;
  }

  const valueFrom = context.pos - typedValue.length;

  return {
    from: valueFrom,
    to: context.pos,
    options,
    filter: false,
    validFor: /[\w-]*/,
  };
}

export function createToolOverrideCompletionSource(providerId: ToolContentOverrideProviderId): CompletionSource {
  const fieldSchemas = getFieldSchemas(providerId);

  return (context: CompletionContext): CompletionResult | null => {
    if (Object.keys(fieldSchemas).length === 0) {
      return null;
    }

    const enumResult = createEnumValueCompletions(context, fieldSchemas);
    if (enumResult) {
      return enumResult;
    }

    return createKeyCompletions(context, providerId, fieldSchemas);
  };
}
