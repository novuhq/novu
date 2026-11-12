export type DiffLine = {
  lineNumber: number;
  text: string;
  type: 'unchanged' | 'removed' | 'added';
};

/** One aligned row of a side-by-side diff. A `null` side is a filler opposite an added/removed line. */
export type DiffRow = {
  left: DiffLine | null;
  right: DiffLine | null;
};

export type DiffBlock = { kind: 'rows'; id: string; rows: DiffRow[] } | { kind: 'gap'; id: string; rows: DiffRow[] };

export type JsonLineDiff = {
  blocks: DiffBlock[];
  added: number;
  removed: number;
};

type LineOp = { type: DiffLine['type']; leftIndex?: number; rightIndex?: number };

const CONTEXT_LINES = 2;
const MIN_HIDDEN_LINES = 3;
/** Above this many LCS cells, fall back to "everything replaced" instead of blocking the main thread. */
const MAX_LCS_CELLS = 4_000_000;

export function toJsonLines(value: unknown): string[] {
  if (value === undefined || value === null) return [];

  return JSON.stringify(value, null, 2).split('\n');
}

function diffLineOps(left: string[], right: string[]): LineOp[] {
  const n = left.length;
  const m = right.length;

  if (n * m > MAX_LCS_CELLS) {
    return [
      ...left.map((_, leftIndex): LineOp => ({ type: 'removed', leftIndex })),
      ...right.map((_, rightIndex): LineOp => ({ type: 'added', rightIndex })),
    ];
  }

  const width = m + 1;
  const lcs = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i * width + j] =
        left[i] === right[j]
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }

  const ops: LineOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (left[i] === right[j]) {
      ops.push({ type: 'unchanged', leftIndex: i++, rightIndex: j++ });
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      ops.push({ type: 'removed', leftIndex: i++ });
    } else {
      ops.push({ type: 'added', rightIndex: j++ });
    }
  }
  while (i < n) ops.push({ type: 'removed', leftIndex: i++ });
  while (j < m) ops.push({ type: 'added', rightIndex: j++ });

  return ops;
}

function toLine(lines: string[], index: number | undefined, type: DiffLine['type']): DiffLine | null {
  if (index === undefined) return null;

  return { lineNumber: index + 1, text: lines[index], type };
}

/** Pairs each run of removed lines with the following run of added lines, padding the shorter side. */
function alignRows(ops: LineOp[], left: string[], right: string[]): DiffRow[] {
  const rows: DiffRow[] = [];
  let removed: DiffLine[] = [];
  let added: DiffLine[] = [];

  const flushChanges = () => {
    for (let index = 0; index < Math.max(removed.length, added.length); index++) {
      rows.push({ left: removed[index] ?? null, right: added[index] ?? null });
    }
    removed = [];
    added = [];
  };

  for (const op of ops) {
    if (op.type === 'unchanged') {
      flushChanges();
      rows.push({ left: toLine(left, op.leftIndex, 'unchanged'), right: toLine(right, op.rightIndex, 'unchanged') });
    } else if (op.type === 'removed') {
      const line = toLine(left, op.leftIndex, 'removed');
      if (line) removed.push(line);
    } else {
      const line = toLine(right, op.rightIndex, 'added');
      if (line) added.push(line);
    }
  }
  flushChanges();

  return rows;
}

function isUnchanged(row: DiffRow): boolean {
  return row.left?.type === 'unchanged' && row.right?.type === 'unchanged';
}

/** Folds unchanged runs into gap blocks, keeping `CONTEXT_LINES` around each change. */
function foldUnchanged(rows: DiffRow[]): DiffBlock[] {
  const blocks: DiffBlock[] = [];
  let visible: DiffRow[] = [];

  const flushVisible = () => {
    if (visible.length > 0) blocks.push({ kind: 'rows', id: `rows-${blocks.length}`, rows: visible });
    visible = [];
  };

  let index = 0;
  while (index < rows.length) {
    if (!isUnchanged(rows[index])) {
      visible.push(rows[index++]);
      continue;
    }

    const start = index;
    while (index < rows.length && isUnchanged(rows[index])) index++;
    const run = rows.slice(start, index);
    const headContext = start === 0 ? 0 : CONTEXT_LINES;
    const tailContext = index === rows.length ? 0 : CONTEXT_LINES;
    const hidden = run.length - headContext - tailContext;

    if (hidden < MIN_HIDDEN_LINES) {
      visible.push(...run);
      continue;
    }

    visible.push(...run.slice(0, headContext));
    flushVisible();
    blocks.push({ kind: 'gap', id: `gap-${blocks.length}`, rows: run.slice(headContext, headContext + hidden) });
    visible.push(...run.slice(headContext + hidden));
  }
  flushVisible();

  return blocks;
}

type SchemaFrame = { indent: number; kind: 'schema' | 'properties' | 'required'; path: string[] };

const SCHEMA_KEY_LINE = /^(\s*)"((?:[^"\\]|\\.)*)"\s*:/;
const SCHEMA_STRING_LINE = /^(\s*)"((?:[^"\\]|\\.)*)"\s*,?\s*$/;

function splitSchemaPath(path: string): string[] {
  const segments: string[] = [];

  for (const part of path.split('.')) {
    if (!part) continue;

    const name = part.replace(/\[\]/g, '');
    const arrayMarks = part.match(/\[\]/g)?.length ?? 0;
    if (name) segments.push(name);
    for (let index = 0; index < arrayMarks; index++) segments.push('[]');
  }

  return segments;
}

function sameSchemaPath(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index]);
}

function frameForSchemaKey(
  key: string,
  indent: number,
  parent: SchemaFrame,
  segments: string[],
  hits: number[],
  lineNumber: number
): SchemaFrame {
  if (parent.kind === 'properties') {
    const path = [...parent.path, key];
    if (sameSchemaPath(path, segments)) hits.push(lineNumber);

    return { indent, kind: 'schema', path };
  }

  if (key === 'properties') {
    return { indent, kind: 'properties', path: parent.path };
  }

  if (key === 'items') {
    const path = [...parent.path, '[]'];
    if (sameSchemaPath(path, segments)) hits.push(lineNumber);

    return { indent, kind: 'schema', path };
  }

  if (key === 'required') {
    return { indent, kind: 'required', path: parent.path };
  }

  return { indent, kind: 'schema', path: parent.path };
}

/**
 * 1-based line numbers where `variablePath` is declared: its property key, a `required` entry of
 * that name, or its `items` keyword. Both sides of the diff are searched with this.
 */
export function schemaFocusLineNumbers(lines: string[], variablePath: string): number[] {
  const segments = splitSchemaPath(variablePath);
  if (segments.length === 0) {
    return [];
  }

  const frames: SchemaFrame[] = [{ indent: -1, kind: 'schema', path: [] }];
  const hits: number[] = [];

  const popToIndent = (indent: number) => {
    while (frames.length > 1 && frames[frames.length - 1].indent >= indent) frames.pop();
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const keyMatch = SCHEMA_KEY_LINE.exec(line);
    if (keyMatch) {
      const indent = keyMatch[1].length;
      popToIndent(indent);
      frames.push(frameForSchemaKey(keyMatch[2], indent, frames[frames.length - 1], segments, hits, lineNumber));

      return;
    }

    const stringMatch = SCHEMA_STRING_LINE.exec(line);
    if (!stringMatch) {
      return;
    }

    popToIndent(stringMatch[1].length);
    const parent = frames[frames.length - 1];
    if (parent.kind !== 'required') {
      return;
    }
    if (sameSchemaPath([...parent.path, stringMatch[2]], segments)) hits.push(lineNumber);
  });

  return hits;
}

function diffLineLists(left: string[], right: string[]): JsonLineDiff {
  const ops = diffLineOps(left, right);
  const rows = alignRows(ops, left, right);

  return {
    blocks: foldUnchanged(rows),
    added: ops.filter((op) => op.type === 'added').length,
    removed: ops.filter((op) => op.type === 'removed').length,
  };
}

export function diffJsonLines(previous: unknown, next: unknown): JsonLineDiff {
  return diffLineLists(toJsonLines(previous), toJsonLines(next));
}

/** Side-by-side diff of plain text, used for layout HTML that is not JSON. */
export function diffTextLines(previous: string | null, next: string | null): JsonLineDiff {
  return diffLineLists(previous ? previous.split('\n') : [], next ? next.split('\n') : []);
}
