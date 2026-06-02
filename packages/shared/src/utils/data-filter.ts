/**
 * Inbox `data` filter — mirrors the shape of `TagsFilter`, but applied per
 * key inside the `data` object.
 *
 * Each top-level key in `data` may be:
 *  - a scalar (exact equality, existing behavior)
 *  - `Scalar[]` (OR-group — match any of the listed values)
 *  - `{ or: Scalar[] }` (explicit OR-group)
 *  - `{ and: [{ or: Scalar[] }, ...] }` (CNF — AND of OR-groups)
 *  - a 1-level nested object whose sub-keys follow the same rules
 *
 * Across top-level keys (and nested sub-keys) clauses are AND-ed together,
 * the same way the existing exact-match `data` filter works.
 */

export type DataFilterScalar = string | number | boolean | null;

export type DataFilterOrGroup<T extends DataFilterScalar = DataFilterScalar> = { or: T[] };

export type DataFilterAndForm<T extends DataFilterScalar = DataFilterScalar> = {
  and: Array<DataFilterOrGroup<T>>;
};

export type DataFilterFieldValue<T extends DataFilterScalar = DataFilterScalar> =
  | T
  | T[]
  | DataFilterOrGroup<T>
  | DataFilterAndForm<T>;

export type DataFilterNested = Record<string, DataFilterFieldValue>;

export type DataFilter = Record<string, DataFilterFieldValue | DataFilterNested>;

/** Normalized representation: each entry is one dotted path and its CNF groups. */
export type NormalizedDataFilterEntry = { path: string; groups: DataFilterScalar[][] };

/** MongoDB-compatible data-filter fragment. Always merges via `$and`. */
export type DataFilterMongoFragment = { $and: Array<Record<string, unknown>> } | Record<string, never>;

export const MAX_DATA_VALUES_PER_OR_GROUP = 100;
export const MAX_DATA_AND_GROUPS = 30;
export const MAX_DATA_TOTAL_VALUES = 200;
export const MAX_DATA_STRING_LENGTH = 256;
export const MAX_DATA_NESTING_LEVELS = 2;

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export class DataFilterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataFilterValidationError';
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOperatorObject(value: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(value, 'or') || Object.prototype.hasOwnProperty.call(value, 'and');
}

function validateScalar(path: string, value: unknown): DataFilterScalar {
  if (value === null) {
    return null;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new DataFilterValidationError(`Value for ${path} must be a finite number`);
    }

    return value;
  }

  if (typeof value === 'string') {
    if (value.length > MAX_DATA_STRING_LENGTH) {
      throw new DataFilterValidationError(`String value for ${path} exceeds ${MAX_DATA_STRING_LENGTH} characters`);
    }

    return value;
  }

  throw new DataFilterValidationError(`Value for ${path} must be a scalar (string, number, boolean, or null)`);
}

function validateOrGroupScalars(path: string, group: unknown[]): DataFilterScalar[] {
  if (group.length > MAX_DATA_VALUES_PER_OR_GROUP) {
    throw new DataFilterValidationError(
      `At most ${MAX_DATA_VALUES_PER_OR_GROUP} values are allowed in a single OR-group for ${path}`
    );
  }

  return group.map((item) => validateScalar(path, item));
}

function normalizeFieldFromObject(path: string, obj: Record<string, unknown>): DataFilterScalar[][] {
  const hasOr = Object.prototype.hasOwnProperty.call(obj, 'or');
  const hasAnd = Object.prototype.hasOwnProperty.call(obj, 'and');
  const keys = Object.keys(obj);

  if (hasOr && hasAnd) {
    throw new DataFilterValidationError(`Filter for ${path} cannot have both "or" and "and"`);
  }

  if (hasOr) {
    if (keys.length !== 1) {
      throw new DataFilterValidationError(`Invalid filter object for ${path}`);
    }

    const orVal = obj.or;
    if (!Array.isArray(orVal)) {
      throw new DataFilterValidationError(`"or" for ${path} must be an array of scalars`);
    }

    if (orVal.length === 0) {
      return [];
    }

    return [validateOrGroupScalars(path, orVal)];
  }

  if (hasAnd) {
    if (keys.length !== 1) {
      throw new DataFilterValidationError(`Invalid filter object for ${path}`);
    }

    const andVal = obj.and;
    if (!Array.isArray(andVal)) {
      throw new DataFilterValidationError(`"and" for ${path} must be an array`);
    }

    if (andVal.length === 0) {
      return [];
    }

    if (andVal.length > MAX_DATA_AND_GROUPS) {
      throw new DataFilterValidationError(`At most ${MAX_DATA_AND_GROUPS} groups are allowed for ${path}`);
    }

    const groups: DataFilterScalar[][] = [];
    let total = 0;

    for (const item of andVal) {
      if (!isPlainObject(item)) {
        throw new DataFilterValidationError(`Each "and" entry for ${path} must be { or: Scalar[] }`);
      }

      const itemKeys = Object.keys(item);
      if (itemKeys.length !== 1 || !Object.prototype.hasOwnProperty.call(item, 'or')) {
        throw new DataFilterValidationError(`Each "and" entry for ${path} must be { or: Scalar[] }`);
      }

      const innerOr = (item as { or: unknown }).or;
      if (!Array.isArray(innerOr)) {
        throw new DataFilterValidationError(`"or" for ${path} must be an array of scalars`);
      }

      if (innerOr.length === 0) {
        throw new DataFilterValidationError(`Each group for ${path} must be a non-empty array`);
      }

      const group = validateOrGroupScalars(path, innerOr);
      total += group.length;
      groups.push(group);
    }

    if (total > MAX_DATA_TOTAL_VALUES) {
      throw new DataFilterValidationError(`At most ${MAX_DATA_TOTAL_VALUES} total values are allowed for ${path}`);
    }

    return groups;
  }

  throw new DataFilterValidationError(`Filter object for ${path} must have "or" or "and"`);
}

function normalizeFieldValue(path: string, value: unknown): DataFilterScalar[][] {
  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    if (value.some((item) => Array.isArray(item))) {
      throw new DataFilterValidationError(
        `Nested arrays are not supported for ${path}; use { and: [{ or: Scalar[] }, ...] } for multiple OR-groups`
      );
    }

    return [validateOrGroupScalars(path, value)];
  }

  if (isPlainObject(value)) {
    return normalizeFieldFromObject(path, value);
  }

  return [[validateScalar(path, value)]];
}

function validateKey(rawKey: string, parentPath: string): string {
  if (rawKey.length === 0) {
    throw new DataFilterValidationError(`Empty keys are not allowed under ${parentPath || 'data'}`);
  }

  if (rawKey.startsWith('$') || rawKey.startsWith('.')) {
    throw new DataFilterValidationError(`Key "${rawKey}" under ${parentPath || 'data'} cannot start with "$" or "."`);
  }

  if (DANGEROUS_KEYS.has(rawKey)) {
    throw new DataFilterValidationError(`Key "${rawKey}" under ${parentPath || 'data'} is not allowed`);
  }

  return rawKey;
}

function flattenDataFilter(
  data: Record<string, unknown>,
  pathPrefix: string,
  depth: number,
  out: NormalizedDataFilterEntry[]
): void {
  if (depth > MAX_DATA_NESTING_LEVELS) {
    throw new DataFilterValidationError(
      `Maximum nesting level exceeded (${MAX_DATA_NESTING_LEVELS} levels max) at ${pathPrefix}`
    );
  }

  for (const [rawKey, rawValue] of Object.entries(data)) {
    validateKey(rawKey, pathPrefix);
    const fieldPath = pathPrefix ? `${pathPrefix}.${rawKey}` : rawKey;

    if (isPlainObject(rawValue) && !isOperatorObject(rawValue)) {
      flattenDataFilter(rawValue, fieldPath, depth + 1, out);
      continue;
    }

    const groups = normalizeFieldValue(fieldPath, rawValue);
    if (groups.length > 0) {
      out.push({ path: fieldPath, groups });
    }
  }
}

/**
 * Validate and normalize a `data` filter into a flat list of dotted paths and
 * their CNF groups. Throws `DataFilterValidationError` on any structural issue.
 */
export function normalizeDataFilter(data: unknown): NormalizedDataFilterEntry[] {
  if (data === undefined || data === null) {
    return [];
  }

  if (!isPlainObject(data)) {
    throw new DataFilterValidationError('Data filter must be an object');
  }

  const entries: NormalizedDataFilterEntry[] = [];
  flattenDataFilter(data, '', 1, entries);

  return entries;
}

/**
 * Build a MongoDB filter fragment from a `data` filter object. Always merges
 * via a single `$and` array so callers can compose it with their own `$and`.
 *
 * @param data           The data filter as supplied by the API caller.
 * @param fieldPrefix    Prefix to apply to all field paths (default `data`).
 */
export function buildDataFilterQuery(data: unknown, fieldPrefix = 'data'): DataFilterMongoFragment {
  const entries = normalizeDataFilter(data);
  if (entries.length === 0) {
    return {};
  }

  const clauses: Array<Record<string, unknown>> = [];

  for (const { path, groups } of entries) {
    const fullPath = fieldPrefix ? `${fieldPrefix}.${path}` : path;
    for (const group of groups) {
      if (group.length === 1) {
        clauses.push({ [fullPath]: group[0] });
      } else {
        clauses.push({ [fullPath]: { $in: group } });
      }
    }
  }

  if (clauses.length === 0) {
    return {};
  }

  return { $and: clauses };
}

/**
 * Check whether a notification's `data` matches the supplied data filter.
 * Mirrors the server-side semantics for the OR/AND-of-OR shapes so that
 * realtime, cache, and counts stay consistent.
 */
export function checkDataFilterMatches(
  notificationData: Record<string, unknown> | undefined | null,
  filter: unknown
): boolean {
  let entries: NormalizedDataFilterEntry[];
  try {
    entries = normalizeDataFilter(filter);
  } catch {
    return false;
  }

  if (entries.length === 0) {
    return true;
  }

  if (!notificationData) {
    return false;
  }

  return entries.every(({ path, groups }) => {
    const notifValue = getValueAtPath(notificationData, path);
    if (notifValue === undefined) {
      return false;
    }

    return groups.every((group) => orGroupMatches(group, notifValue));
  });
}

function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function orGroupMatches(group: DataFilterScalar[], notifValue: unknown): boolean {
  if (Array.isArray(notifValue)) {
    return notifValue.some((v) => group.some((g) => scalarsEqual(g, v)));
  }

  return group.some((g) => scalarsEqual(g, notifValue));
}

function scalarsEqual(a: DataFilterScalar, b: unknown): boolean {
  if (a === null) {
    return b === null;
  }

  return a === b;
}
