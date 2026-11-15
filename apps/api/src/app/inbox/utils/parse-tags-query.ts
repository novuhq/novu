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
    return normalizeValues(value);
  }

  return value as NormalizedQueryValue;
}

function normalizeValues(record: Record<string, unknown>): Record<string, NormalizedQueryValue> {
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, normalizeIndexedLists(item)]));
}

function toTagList(values: unknown[]): string[] {
  return values.map((t) => String(t));
}

function toGroup(item: unknown): string[] {
  return Array.isArray(item) ? toTagList(item) : [String(item)];
}

function toAndGroups(list: unknown[]): { and: { or: string[] }[] } {
  return { and: list.map((group) => ({ or: toGroup(group) })) };
}

function parseList(list: unknown[]): TagsFilter {
  if (list.length === 0) {
    return [];
  }

  if (list.some((item) => Array.isArray(item))) {
    return toAndGroups(list);
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

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function parseExplicitObject(record: Record<string, NormalizedQueryValue>): TagsFilter | undefined {
  if (hasOwn(record, 'or') && hasOwn(record, 'and')) {
    throw new TagsFilterValidationError('Tags filter cannot have both "or" and "and"');
  }

  if (hasOwn(record, 'or')) {
    const orVal = record.or;

    return Array.isArray(orVal) ? { or: toTagList(orVal) } : undefined;
  }

  const andVal = record.and;

  return Array.isArray(andVal) ? { and: andVal.map(parseAndEntry) } : undefined;
}

/**
 * A keyed object without "or" / "and". Index keys (`{ '0': …, '1': … }`) are a list `qs` could not build as an array
 * (more than 20 items, or sparse indices), so they parse exactly like that list. Named keys (`tags[foo]=a&tags[bar]=b`)
 * keep their legacy meaning: one AND group per key. Either way, a single group collapses to a flat tag list.
 */
function parseKeyedObject(record: Record<string, NormalizedQueryValue>, isIndexKeyed: boolean): TagsFilter | undefined {
  const list = Object.keys(record)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => record[key])
    .filter((item) => item !== undefined && item !== null);

  if (list.length === 0) {
    return undefined;
  }

  const parsed = isIndexKeyed ? parseList(list) : toAndGroups(list);

  if (!Array.isArray(parsed) && 'and' in parsed && parsed.and.length === 1) {
    return parsed.and[0]?.or;
  }

  return parsed;
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

  if (Array.isArray(value)) {
    return parseList(value.map(normalizeIndexedLists));
  }

  if (!isPlainObject(value)) {
    return undefined;
  }

  // Normalize the values, not the object itself, so the top-level keys stay visible to the checks below.
  const record = normalizeValues(value);

  if (hasOwn(record, 'or') || hasOwn(record, 'and')) {
    return parseExplicitObject(record);
  }

  return parseKeyedObject(record, isIndexKeyedObject(value));
}
