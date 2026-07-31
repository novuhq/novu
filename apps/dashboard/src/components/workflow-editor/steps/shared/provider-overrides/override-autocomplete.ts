import {
  type Completion,
  type CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete';
import {
  type DescribeOverrideField,
  defaultValueForFieldSchema,
  getConstraints,
  type OverrideFieldSchema,
} from './override-field-schema';
import { createSchemaResolver, DISCRIMINATOR_KEY, type SchemaResolver } from './schema-resolver';

/** How the cursor's frame was entered from its parent frame. */
type FrameLink = { kind: 'property'; key: string } | { kind: 'items' };

type ObjectFrame = {
  kind: 'object';
  link?: FrameLink;
  state: 'key-or-end' | 'colon' | 'value' | 'comma-or-end';
  pendingKey?: string;
  usedKeys: Set<string>;
  /** Value of the object's `type` property, used to pick an `anyOf` branch. */
  discriminator?: string;
};

type ArrayFrame = {
  kind: 'array';
  link?: FrameLink;
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

function linkFromParent(frame: JsonFrame | undefined): FrameLink | undefined {
  if (frame?.kind === 'object' && frame.state === 'value' && frame.pendingKey !== undefined) {
    return { kind: 'property', key: frame.pendingKey };
  }

  if (frame?.kind === 'array' && frame.state === 'value-or-end') {
    return { kind: 'items' };
  }

  return undefined;
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

/** Frame stack from the document root down to the cursor, innermost last. */
function getCursorFrames(doc: string, pos: number): JsonFrame[] {
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
        if (frame?.kind === 'object' && frame.state === 'value' && frame.pendingKey === DISCRIMINATOR_KEY) {
          frame.discriminator = stringToken.value;
        }

        finishParentValue(frame);
      }

      index = stringToken.end;
      continue;
    }

    if (char === '{') {
      const link = linkFromParent(frame);
      finishParentValue(frame);
      frames.push({ kind: 'object', link, state: 'key-or-end', usedKeys: new Set() });
      index += 1;
      continue;
    }

    if (char === '[') {
      const link = linkFromParent(frame);
      finishParentValue(frame);
      frames.push({ kind: 'array', link, state: 'value-or-end' });
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

  return frames;
}

/** Walks the schema down the frame stack, following `$ref`s and narrowing `anyOf` branches. */
function resolveSchemaAtCursor(resolver: SchemaResolver, frames: JsonFrame[]): OverrideFieldSchema | undefined {
  let node: OverrideFieldSchema | undefined = resolver.rootSchema;

  for (const frame of frames) {
    if (frame.link) {
      node = frame.link.kind === 'property' ? resolver.propertyNode(node, frame.link.key) : resolver.itemsNode(node);
    }

    node = frame.kind === 'object' ? resolver.objectNode(node, frame.discriminator) : resolver.deref(node);

    if (!node) {
      return undefined;
    }
  }

  return node;
}

function buildFieldInfo(
  key: string,
  fieldSchema: OverrideFieldSchema,
  describeField: DescribeOverrideField | undefined
): string | undefined {
  const parts: string[] = [];

  if (fieldSchema.description) {
    parts.push(fieldSchema.description);
  }

  parts.push(...(describeField?.(key, fieldSchema) ?? []));

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
  key: string,
  fieldSchema: OverrideFieldSchema,
  resolver: SchemaResolver,
  describeField: DescribeOverrideField | undefined
): Completion {
  const described = resolver.describedNode(fieldSchema);
  const defaultValue = defaultValueForFieldSchema(described);
  const keyPrefix = `"${key}": `;

  return {
    label: key,
    type: 'property',
    detail: resolver.typeLabel(fieldSchema),
    info: buildFieldInfo(key, described, describeField),
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

function availableKeyOptions({
  objectSchema,
  usedKeys,
  prefix,
  resolver,
  describeField,
}: {
  objectSchema: OverrideFieldSchema;
  usedKeys: Set<string>;
  prefix?: string;
  resolver: SchemaResolver;
  describeField: DescribeOverrideField | undefined;
}): Completion[] {
  return Object.entries(objectSchema.properties ?? {})
    .filter(([key]) => {
      if (usedKeys.has(key)) {
        return false;
      }

      if (prefix !== undefined && !key.startsWith(prefix)) {
        return false;
      }

      return true;
    })
    .map(([key, fieldSchema]) => buildKeyCompletion(key, fieldSchema, resolver, describeField));
}

function createValueOptions(values: string[], typedValue: string): Completion[] {
  return values
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

type OverrideCompletionInput = {
  doc: string;
  pos: number;
  explicit: boolean;
  rootSchema: OverrideFieldSchema;
  resolver?: SchemaResolver;
  describeField?: DescribeOverrideField;
};

export function getOverrideCompletionResult({
  doc,
  pos,
  explicit,
  rootSchema,
  resolver = createSchemaResolver(rootSchema),
  describeField,
}: OverrideCompletionInput): CompletionResult | null {
  const openString = getOpenStringAtCursor(doc, pos);
  const quoteFrom = openString?.from ?? pos;
  const frames = getCursorFrames(doc, quoteFrom);
  const objectContext = frames.at(-1);
  if (objectContext?.kind !== 'object') {
    return null;
  }

  const objectSchema = resolveSchemaAtCursor(resolver, frames);
  if (!objectSchema) {
    return null;
  }

  if (openString && objectContext.state === 'value' && objectContext.pendingKey) {
    const typedValue = openString.text;
    const values = resolver.valueOptions(resolver.propertyNode(objectSchema, objectContext.pendingKey));
    const options = createValueOptions(values, typedValue);
    if (options.length === 0) {
      return null;
    }

    return {
      from: pos - typedValue.length,
      to: pos,
      options,
      filter: false,
    };
  }

  if (objectContext.state !== 'key-or-end') {
    return null;
  }

  const options = availableKeyOptions({
    objectSchema,
    usedKeys: objectContext.usedKeys,
    prefix: openString?.text,
    resolver,
    describeField,
  });
  if (options.length === 0) {
    return null;
  }

  if (openString) {
    return {
      from: quoteFrom,
      to: getKeyReplacementTo(doc, pos),
      options,
      filter: false,
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

/** The resolver carries the root schema, so the caller owns both and completion never rebuilds one. */
export function createOverrideCompletionSource({
  resolver,
  describeField,
}: {
  resolver: SchemaResolver | undefined;
  describeField?: DescribeOverrideField;
}): CompletionSource {
  return (context: CompletionContext): CompletionResult | null => {
    if (!resolver || Object.keys(resolver.rootSchema.properties ?? {}).length === 0) {
      return null;
    }

    return getOverrideCompletionResult({
      doc: context.state.doc.toString(),
      pos: context.pos,
      explicit: context.explicit,
      rootSchema: resolver.rootSchema,
      resolver,
      describeField,
    });
  };
}
