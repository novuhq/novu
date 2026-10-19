import type { TagsFilter } from '@novu/shared';
import { TagsFilterValidationError } from '@novu/shared';

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
    if (value.length === 0) {
      return [];
    }

    const first = value[0];
    if (Array.isArray(first)) {
      const groups = (value as unknown[][]).map((group) =>
        Array.isArray(group) ? group.map((t) => String(t)) : [String(group)]
      );

      return {
        and: groups.map((g) => ({ or: g })),
      };
    }

    return (value as unknown[]).map((t) => String(t));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    const hasOr = Object.prototype.hasOwnProperty.call(record, 'or');
    const hasAnd = Object.prototype.hasOwnProperty.call(record, 'and');

    if (hasOr && hasAnd) {
      throw new TagsFilterValidationError('Tags filter cannot have both "or" and "and"');
    }

    if (hasOr) {
      const orVal = record['or'];
      if (!Array.isArray(orVal)) {
        return undefined;
      }

      return { or: orVal.map((t) => String(t)) };
    }

    if (hasAnd) {
      const andVal = record['and'];
      if (!Array.isArray(andVal)) {
        return undefined;
      }

      return {
        and: andVal.map((item) => {
          if (Array.isArray(item)) {
            return { or: item.map((t) => String(t)) };
          }

          if (typeof item === 'object' && item !== null && !Array.isArray(item) && 'or' in item) {
            const innerOr = (item as { or: unknown }).or;
            if (Array.isArray(innerOr)) {
              return { or: innerOr.map((t) => String(t)) };
            }
          }

          throw new TagsFilterValidationError('Each "and" entry must be { or: string[] } or a tag array');
        }),
      };
    }

    const keys = Object.keys(record).sort((a, b) => Number(a) - Number(b));
    const groups: string[][] = [];

    for (const key of keys) {
      const group = record[key];
      if (Array.isArray(group)) {
        groups.push(group.map((t) => String(t)));
      } else if (group !== undefined && group !== null) {
        groups.push([String(group)]);
      }
    }

    if (groups.length === 0) {
      return undefined;
    }

    if (groups.length === 1) {
      const [only] = groups;
      if (!only) {
        return undefined;
      }

      return only;
    }

    return {
      and: groups.map((g) => ({ or: g })),
    };
  }

  return undefined;
}
