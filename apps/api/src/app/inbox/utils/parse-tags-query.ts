import type { TagsFilter } from '@novu/shared';
import { TagsFilterValidationError } from '@novu/shared';

const INDEX_KEY_REGEX = /^\d+$/;

/** Raw query value with every `qs` index-keyed object replaced by an array. */
type NormalizedQueryValue =
  | string
  | number
  | boolean
  | NormalizedQueryValue[]
  | { [key: string]: NormalizedQueryValue };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIndexKeyedObject(value: unknown): value is Record<string, unknown> {
  if (!isPlainObject(value)) {
    return false;
  }

  const keys = Object.keys(value);

  return keys.length > 0 && keys.every((key) => INDEX_KEY_REGEX.test(key));
}

/**
 * Express's extended query parser (`qs`) caps arrays at 20 items (`arrayLimit`). Above that, or for
 * sparse/large indices, it returns an index-keyed object (`{ '0': 'a', '1': 'b', ... }`) instead of an
 * array. Convert such objects (recursively) back into the list they would have been below the limit.
 */
function normalizeIndexedLists(value: unknown): NormalizedQueryValue {
  if (Array.isArray(value)) {
    return value.map(normalizeIndexedLists);
  }

  if (isIndexKeyedObject(value)) {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key])
      .filter((item) => item !== undefined && item !== null)
      .map(normalizeIndexedLists);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeIndexedLists(item)]));
  }

  return value as NormalizedQueryValue;
}

function toTagList(values: unknown[]): string[] {
  return values.map((t) => String(t));
}

function toGroup(item: unknown): string[] {
  return Array.isArray(item) ? toTagList(item) : [String(item)];
}

function parseList(list: unknown[]): TagsFilter {
  if (list.length === 0) {
    return [];
  }

  if (list.some((item) => Array.isArray(item))) {
    return { and: list.map((group) => ({ or: toGroup(group) })) };
  }

  return toTagList(list);
}

function parseAndEntry(item: unknown): { or: string[] } {
  if (Array.isArray(item)) {
    return { or: toTagList(item) };
  }

  if (isPlainObject(item) && 'or' in item && Array.isArray(item.or)) {
    return { or: toTagList(item.or) };
  }

  throw new TagsFilterValidationError('Each "and" entry must be { or: string[] } or a tag array');
}

function parseExplicitObject(record: Record<string, unknown>): TagsFilter | undefined {
  const hasOr = Object.prototype.hasOwnProperty.call(record, 'or');
  const hasAnd = Object.prototype.hasOwnProperty.call(record, 'and');

  if (hasOr && hasAnd) {
    throw new TagsFilterValidationError('Tags filter cannot have both "or" and "and"');
  }

  if (hasOr) {
    const orVal = record.or;

    return Array.isArray(orVal) ? { or: toTagList(orVal) } : undefined;
  }

  if (hasAnd) {
    const andVal = record.and;

    return Array.isArray(andVal) ? { and: andVal.map(parseAndEntry) } : undefined;
  }

  return undefined;
}

/**
 * Coerce Express query / mixed shapes into `TagsFilter` for validation + normalization.
 */
export function parseTagsQueryValue(value: unknown): TagsFilter | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    return [value];
  }

  const wasIndexKeyedObject = isIndexKeyedObject(value);
  const normalized = normalizeIndexedLists(value);

  if (Array.isArray(normalized)) {
    const parsed = parseList(normalized);

    // Preserve legacy behavior: an index-keyed object with a single group collapses to a flat list.
    if (wasIndexKeyedObject && !Array.isArray(parsed) && 'and' in parsed && parsed.and.length === 1) {
      return parsed.and[0]?.or;
    }

    if (wasIndexKeyedObject && Array.isArray(parsed) && parsed.length === 0) {
      return undefined;
    }

    return parsed;
  }

  if (isPlainObject(normalized)) {
    return parseExplicitObject(normalized);
  }

  return undefined;
}
