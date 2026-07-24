import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { type ToolContentOverrideProviderId } from '@novu/shared';
import {
  defaultValueForFieldSchema,
  getConstraints,
  getFieldSchemas,
  getTypeLabel,
  type OverrideFieldSchema,
} from './tool-override-field-schema';
import { collectRootKeys } from './tool-override-json';

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

function buildKeyCompletion(key: string, fieldSchema: OverrideFieldSchema): Completion {
  const defaultValue = defaultValueForFieldSchema(fieldSchema);
  const keyPrefix = `"${key}": `;

  return {
    label: key,
    type: 'property',
    detail: getTypeLabel(fieldSchema),
    info: buildFieldInfo(fieldSchema),
    apply: (view, _completion, from, to) => {
      // Resolve end from the live doc — CodeMirror's `to` may stop before an auto-closed `"`.
      const doc = view.state.doc.toString();
      const replaceTo = getKeyReplacementTo(doc, to);
      const valueLiteral = JSON.stringify(defaultValue);
      const needsComma = hasPropertyAfter(doc, replaceTo);
      const insertText = `${keyPrefix}${valueLiteral}${needsComma ? ',' : ''}`;

      view.dispatch({
        changes: { from, to: replaceTo, insert: insertText },
        selection: {
          anchor: from + keyPrefix.length + (typeof defaultValue === 'string' ? 1 : 0),
        },
      });
    },
  };
}

function availableKeyOptions(
  fieldSchemas: Record<string, OverrideFieldSchema>,
  usedKeys: Set<string>,
  prefix?: string
): Completion[] {
  return Object.entries(fieldSchemas)
    .filter(([key]) => {
      if (usedKeys.has(key)) {
        return false;
      }

      if (prefix !== undefined && !key.startsWith(prefix)) {
        return false;
      }

      return true;
    })
    .map(([key, fieldSchema]) => buildKeyCompletion(key, fieldSchema));
}

function createKeyCompletions(
  context: CompletionContext,
  fieldSchemas: Record<string, OverrideFieldSchema>
): CompletionResult | null {
  const doc = context.state.doc.toString();
  const usedKeys = new Set(collectRootKeys(doc));
  const quoteMatch = context.matchBefore(/"[\w-]*$/);

  if (quoteMatch) {
    if (!isKeyPosition(doc, quoteMatch.from)) {
      return null;
    }

    const options = availableKeyOptions(fieldSchemas, usedKeys, quoteMatch.text.slice(1));
    if (options.length === 0) {
      return null;
    }

    return {
      from: quoteMatch.from,
      to: getKeyReplacementTo(doc, quoteMatch.to),
      options,
      filter: false,
      validFor: /"[\w-]*/,
    };
  }

  if (!context.explicit || !isKeyPosition(doc, context.pos)) {
    return null;
  }

  const options = availableKeyOptions(fieldSchemas, usedKeys);
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

    return createKeyCompletions(context, fieldSchemas);
  };
}
