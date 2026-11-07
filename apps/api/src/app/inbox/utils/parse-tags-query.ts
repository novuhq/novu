import type { TagsFilter } from '@novu/shared';
import { TagsFilterValidationError } from '@novu/shared';

function isIndexedObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);

  return keys.length > 0 && keys.every((key) => /^\d+$/.test(key));
}

function toList(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) {
    return value;
  }

  if (isIndexedObject(value)) {
    return Object.keys(value)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => value[key]);
  }

  return undefined;
}

function toStringList(value: unknown[]): string[] {
  return value.map((t) => String(t));
}

function parseTagsArray(value: unknown[]): TagsFilter {
  if (value.length === 0) {
    return [];
  }

  if (toList(value[0]) !== undefined) {
    return {
      and: value.map((group) => ({ or: toStringList(toList(group) ?? [group]) })),
    };
  }

  return toStringList(value);
}

function parseOrRecord(record: Record<string, unknown>): TagsFilter | undefined {
  const orVal = record.or;
  if (!Array.isArray(orVal)) {
    return undefined;
  }

  return { or: toStringList(orVal) };
}

function parseAndEntry(item: unknown): { or: string[] } {
  if (Array.isArray(item)) {
    return { or: toStringList(item) };
  }

  if (typeof item === 'object' && item !== null && 'or' in item) {
    const innerOr = (item as { or: unknown }).or;
    if (Array.isArray(innerOr)) {
      return { or: toStringList(innerOr) };
    }
  }

  throw new TagsFilterValidationError('Each "and" entry must be { or: string[] } or a tag array');
}

function parseAndRecord(record: Record<string, unknown>): TagsFilter | undefined {
  const andVal = record.and;
  if (!Array.isArray(andVal)) {
    return undefined;
  }

  return { and: andVal.map(parseAndEntry) };
}

function parseIndexedRecord(record: Record<string, unknown>): TagsFilter | undefined {
  const entries = Object.keys(record)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => record[key])
    .filter((entry) => entry !== undefined && entry !== null);

  if (isIndexedObject(record) && entries.length > 0 && entries.every((entry) => toList(entry) === undefined)) {
    return entries.map((entry) => String(entry));
  }

  const groups = entries.map((entry) => toStringList(toList(entry) ?? [entry]));

  if (groups.length === 0) {
    return undefined;
  }

  if (groups.length === 1) {
    const [only] = groups;

    return only;
  }

  return {
    and: groups.map((g) => ({ or: g })),
  };
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
    return parseTagsArray(value);
  }

  if (typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const hasOr = Object.prototype.hasOwnProperty.call(record, 'or');
  const hasAnd = Object.prototype.hasOwnProperty.call(record, 'and');

  if (hasOr && hasAnd) {
    throw new TagsFilterValidationError('Tags filter cannot have both "or" and "and"');
  }

  if (hasOr) {
    return parseOrRecord(record);
  }

  if (hasAnd) {
    return parseAndRecord(record);
  }

  return parseIndexedRecord(record);
}
