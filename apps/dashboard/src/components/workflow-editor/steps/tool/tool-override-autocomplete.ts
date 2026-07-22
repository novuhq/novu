import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import { type DashboardToolContentOverrideProviderId } from './tool-content-source';
import {
  defaultValueForFieldSchema,
  getConstraints,
  getFieldSchemas,
  getTypeLabel,
  type OverrideFieldSchema,
} from './tool-override-field-schema';

type ObjectFrame = {
  kind: 'object';
  path: string[];
  state: 'key-or-end' | 'colon' | 'value' | 'comma-or-end';
  pendingKey?: string;
  usedKeys: Set<string>;
};

type ArrayFrame = {
  kind: 'array';
  state: 'value-or-end' | 'comma-or-end';
};

type JsonFrame = ObjectFrame | ArrayFrame;

function finishParentValue(frame: JsonFrame | undefined) {
  if (frame?.kind === 'object' && frame.state === 'value') {
    frame.state = 'comma-or-end';
    frame.pendingKey = undefined;
  } else if (frame?.kind === 'array' && frame.state === 'value-or-end') {
    frame.state = 'comma-or-end';
  }
}

function readJsonString(doc: string, start: number, limit: number): { value: string; end: number } | undefined {
  let value = '';
  let escaped = false;

  for (let index = start + 1; index < limit; index += 1) {
    const char = doc[index];
    if (escaped) {
      value += char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      return { value, end: index + 1 };
    }

    value += char;
  }

  return undefined;
}

function getOpenStringAtCursor(doc: string, pos: number): { from: number; text: string } | undefined {
  let openingQuote = -1;
  let escaped = false;

  for (let index = 0; index < pos; index += 1) {
    const char = doc[index];
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && openingQuote >= 0) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      openingQuote = openingQuote >= 0 ? -1 : index;
    }
  }

  if (openingQuote < 0) {
    return undefined;
  }

  return {
    from: openingQuote,
    text: doc.slice(openingQuote + 1, pos),
  };
}

function getObjectCursorContext(doc: string, pos: number): ObjectFrame | undefined {
  const frames: JsonFrame[] = [];
  let index = 0;

  while (index < pos) {
    const char = doc[index];
    const frame = frames.at(-1);

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '"') {
      const stringToken = readJsonString(doc, index, pos);
      if (!stringToken) {
        break;
      }

      if (frame?.kind === 'object' && frame.state === 'key-or-end') {
        frame.pendingKey = stringToken.value;
        frame.usedKeys.add(stringToken.value);
        frame.state = 'colon';
      } else {
        finishParentValue(frame);
      }

      index = stringToken.end;
      continue;
    }

    if (char === '{') {
      const path =
        frame?.kind === 'object' && frame.state === 'value' && frame.pendingKey
          ? [...frame.path, frame.pendingKey]
          : [];
      finishParentValue(frame);
      frames.push({ kind: 'object', path, state: 'key-or-end', usedKeys: new Set() });
      index += 1;
      continue;
    }

    if (char === '[') {
      finishParentValue(frame);
      frames.push({ kind: 'array', state: 'value-or-end' });
      index += 1;
      continue;
    }

    if (char === '}' || char === ']') {
      frames.pop();
      index += 1;
      continue;
    }

    if (char === ':' && frame?.kind === 'object' && frame.state === 'colon') {
      frame.state = 'value';
      index += 1;
      continue;
    }

    if (char === ',') {
      if (frame?.kind === 'object') {
        frame.state = 'key-or-end';
      } else if (frame?.kind === 'array') {
        frame.state = 'value-or-end';
      }
      index += 1;
      continue;
    }

    finishParentValue(frame);
    index += 1;
  }

  const current = frames.at(-1);

  return current?.kind === 'object' ? current : undefined;
}

function getSchemasAtPath(
  rootSchemas: Record<string, OverrideFieldSchema>,
  path: string[]
): Record<string, OverrideFieldSchema> {
  let schemas = rootSchemas;

  for (const segment of path) {
    const next = schemas[segment]?.properties;
    if (!next) {
      return {};
    }

    schemas = next;
  }

  return schemas;
}

function buildFieldInfo(fieldSchema: OverrideFieldSchema): string | undefined {
  const parts: string[] = [];

  if (fieldSchema.description) {
    parts.push(fieldSchema.description);
  }

  if (fieldSchema.sources && fieldSchema.sources.length > 0) {
    parts.push(`Sources: ${fieldSchema.sources.join(', ')}`);
  }

  if (fieldSchema.conflicts && fieldSchema.conflicts.length > 0) {
    parts.push(`Type conflict: ${fieldSchema.conflicts.map(({ source, type }) => `${source} (${type})`).join(', ')}`);
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
    detail: fieldSchema.sources?.length
      ? `${getTypeLabel(fieldSchema)} · ${fieldSchema.sources.join(', ')}`
      : getTypeLabel(fieldSchema),
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

function createEnumOptions(fieldSchema: OverrideFieldSchema | undefined, typedValue: string): Completion[] {
  if (!fieldSchema?.enum || fieldSchema.enum.length === 0) {
    return [];
  }

  return fieldSchema.enum
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
}

type ToolOverrideCompletionInput = {
  doc: string;
  pos: number;
  explicit: boolean;
  fieldSchemas: Record<string, OverrideFieldSchema>;
};

export function getToolOverrideCompletionResult({
  doc,
  pos,
  explicit,
  fieldSchemas,
}: ToolOverrideCompletionInput): CompletionResult | null {
  const openString = getOpenStringAtCursor(doc, pos);
  const quoteFrom = openString?.from ?? pos;
  const objectContext = getObjectCursorContext(doc, quoteFrom);
  if (!objectContext) {
    return null;
  }

  const schemas = getSchemasAtPath(fieldSchemas, objectContext.path);

  if (openString && objectContext.state === 'value' && objectContext.pendingKey) {
    const typedValue = openString.text;
    const options = createEnumOptions(schemas[objectContext.pendingKey], typedValue);
    if (options.length === 0) {
      return null;
    }

    return {
      from: pos - typedValue.length,
      to: pos,
      options,
      filter: false,
      validFor: /[\w-]*/,
    };
  }

  if (objectContext.state !== 'key-or-end') {
    return null;
  }

  const prefix = openString?.text;
  const options = availableKeyOptions(schemas, objectContext.usedKeys, prefix);
  if (options.length === 0) {
    return null;
  }

  if (openString) {
    return {
      from: quoteFrom,
      to: getKeyReplacementTo(doc, pos),
      options,
      filter: false,
      validFor: /"[^"\\]*/,
    };
  }

  if (!explicit) {
    return null;
  }

  return {
    from: pos,
    options,
    filter: false,
  };
}

export function createToolOverrideCompletionSource(
  providerId: DashboardToolContentOverrideProviderId,
  schemaOverride?: Record<string, OverrideFieldSchema>
): CompletionSource {
  const fieldSchemas = schemaOverride ?? getFieldSchemas(providerId);

  return (context: CompletionContext): CompletionResult | null => {
    if (Object.keys(fieldSchemas).length === 0) {
      return null;
    }

    return getToolOverrideCompletionResult({
      doc: context.state.doc.toString(),
      pos: context.pos,
      explicit: context.explicit,
      fieldSchemas,
    });
  };
}
