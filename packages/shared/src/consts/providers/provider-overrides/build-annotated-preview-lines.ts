import { isRecord } from './path';

export type AnnotatedPreviewLine = {
  json: string;
  isDefaultContentKey?: boolean;
};

/**
 * Pretty-prints a merged provider override preview and marks the line whose value was
 * filled from the step's default content. `defaultContentKey` may be a dotted path
 * (`text.body`, `messages.0.text`) for providers that nest their message body.
 *
 * Emits the same shape as `JSON.stringify(value, null, 2)` by walking the object, so
 * marking can follow the structured path instead of re-parsing pretty-printed text.
 */
export function buildAnnotatedPreviewLines(
  merged: Record<string, unknown>,
  defaultContentKey?: string
): AnnotatedPreviewLine[] {
  if (Object.keys(merged).length === 0) {
    return [{ json: '{' }, { json: '}' }];
  }

  const lines: AnnotatedPreviewLine[] = [];
  appendObject(merged, 0, '', defaultContentKey, lines);

  return lines;
}

function appendObject(
  value: Record<string, unknown>,
  indent: number,
  pathPrefix: string,
  markPath: string | undefined,
  lines: AnnotatedPreviewLine[]
): void {
  const pad = ' '.repeat(indent * 2);
  const keys = Object.keys(value);

  lines.push({ json: `${pad}{` });

  keys.forEach((key, index) => {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    appendProperty(key, value[key], indent + 1, path, markPath, lines, index === keys.length - 1);
  });

  lines.push({ json: `${pad}}` });
}

function appendProperty(
  key: string,
  value: unknown,
  indent: number,
  path: string,
  markPath: string | undefined,
  lines: AnnotatedPreviewLine[],
  isLast: boolean
): void {
  const pad = ' '.repeat(indent * 2);
  const keyPrefix = `${JSON.stringify(key)}: `;
  const comma = isLast ? '' : ',';
  const marked = markPath !== undefined && path === markPath;

  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      lines.push({ json: `${pad}${keyPrefix}{}` + comma, ...(marked ? { isDefaultContentKey: true } : {}) });

      return;
    }

    lines.push({ json: `${pad}${keyPrefix}{` });
    keys.forEach((childKey, index) => {
      appendProperty(
        childKey,
        value[childKey],
        indent + 1,
        `${path}.${childKey}`,
        markPath,
        lines,
        index === keys.length - 1
      );
    });
    lines.push({ json: `${pad}}` + comma });

    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push({ json: `${pad}${keyPrefix}[]` + comma, ...(marked ? { isDefaultContentKey: true } : {}) });

      return;
    }

    lines.push({ json: `${pad}${keyPrefix}[` });
    value.forEach((item, index) => {
      appendArrayItem(item, indent + 1, `${path}.${index}`, markPath, lines, index === value.length - 1);
    });
    lines.push({ json: `${pad}]` + comma });

    return;
  }

  lines.push({
    json: `${pad}${keyPrefix}${JSON.stringify(value)}` + comma,
    ...(marked ? { isDefaultContentKey: true } : {}),
  });
}

function appendArrayItem(
  value: unknown,
  indent: number,
  path: string,
  markPath: string | undefined,
  lines: AnnotatedPreviewLine[],
  isLast: boolean
): void {
  const pad = ' '.repeat(indent * 2);
  const comma = isLast ? '' : ',';
  const marked = markPath !== undefined && path === markPath;

  if (isRecord(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      lines.push({ json: `${pad}{}` + comma, ...(marked ? { isDefaultContentKey: true } : {}) });

      return;
    }

    lines.push({ json: `${pad}{` });
    keys.forEach((key, index) => {
      appendProperty(key, value[key], indent + 1, `${path}.${key}`, markPath, lines, index === keys.length - 1);
    });
    lines.push({ json: `${pad}}` + comma });

    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      lines.push({ json: `${pad}[]` + comma, ...(marked ? { isDefaultContentKey: true } : {}) });

      return;
    }

    lines.push({ json: `${pad}[` });
    value.forEach((item, index) => {
      appendArrayItem(item, indent + 1, `${path}.${index}`, markPath, lines, index === value.length - 1);
    });
    lines.push({ json: `${pad}]` + comma });

    return;
  }

  lines.push({
    json: `${pad}${JSON.stringify(value)}` + comma,
    ...(marked ? { isDefaultContentKey: true } : {}),
  });
}
