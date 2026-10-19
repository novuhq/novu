/** Single OR-group as `string[]`, or explicit `{ or }` / `{ and: [{ or }] }` for multi-group (AND of OR-groups). Nested `string[][]` is not accepted. */
export type TagsFilterOrGroup = { or: string[] };

export type TagsFilterAndForm = { and: TagsFilterOrGroup[] };

export type TagsFilter = string[] | TagsFilterOrGroup | TagsFilterAndForm;

/** MongoDB-compatible tag filter fragment (for the message `tags` array field). */
export type TagsMongoFragment =
  | Record<string, never>
  | { tags: { $in: string[] } }
  | { $and: Array<{ tags: { $in: string[] } }> };

const MAX_TAG_GROUPS = 30;
const MAX_TAGS_PER_GROUP = 100;
const MAX_TOTAL_TAGS = 200;

export class TagsFilterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TagsFilterValidationError';
  }
}

function validateOrGroupStrings(group: unknown[], maxLen: number): string[] {
  if (group.length > maxLen) {
    throw new TagsFilterValidationError(`At most ${maxLen} tags are allowed in a single OR-group`);
  }

  for (const t of group) {
    if (typeof t !== 'string') {
      throw new TagsFilterValidationError('Tags must be strings');
    }
  }

  return group as string[];
}

function normalizeTagGroupsFromObject(obj: Record<string, unknown>): string[][] {
  const keys = Object.keys(obj);
  const hasOr = Object.prototype.hasOwnProperty.call(obj, 'or');
  const hasAnd = Object.prototype.hasOwnProperty.call(obj, 'and');

  if (hasOr && hasAnd) {
    throw new TagsFilterValidationError('Tags filter cannot have both "or" and "and"');
  }

  if (hasOr) {
    if (keys.length !== 1) {
      throw new TagsFilterValidationError('Invalid tags filter object');
    }

    const orVal = obj['or'];
    if (!Array.isArray(orVal)) {
      throw new TagsFilterValidationError('"or" must be an array of strings');
    }

    if (orVal.length === 0) {
      return [];
    }

    const group = validateOrGroupStrings(orVal, MAX_TAGS_PER_GROUP);

    return [group];
  }

  if (hasAnd) {
    if (keys.length !== 1) {
      throw new TagsFilterValidationError('Invalid tags filter object');
    }

    const andVal = obj['and'];
    if (!Array.isArray(andVal)) {
      throw new TagsFilterValidationError('"and" must be an array');
    }

    if (andVal.length === 0) {
      return [];
    }

    if (andVal.length > MAX_TAG_GROUPS) {
      throw new TagsFilterValidationError(`At most ${MAX_TAG_GROUPS} tag groups are allowed`);
    }

    const groups: string[][] = [];
    let total = 0;

    for (const item of andVal) {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) {
        throw new TagsFilterValidationError('Each "and" entry must be an object { or: string[] }');
      }

      const itemKeys = Object.keys(item);
      if (itemKeys.length !== 1 || !Object.prototype.hasOwnProperty.call(item, 'or')) {
        throw new TagsFilterValidationError('Each "and" entry must be { or: string[] }');
      }

      const innerOr = (item as { or: unknown }).or;
      if (!Array.isArray(innerOr)) {
        throw new TagsFilterValidationError('"or" must be an array of strings');
      }

      if (innerOr.length === 0) {
        throw new TagsFilterValidationError('Each tag group must be a non-empty array of strings');
      }

      const group = validateOrGroupStrings(innerOr, MAX_TAGS_PER_GROUP);
      total += group.length;
      groups.push(group);
    }

    if (total > MAX_TOTAL_TAGS) {
      throw new TagsFilterValidationError(`At most ${MAX_TOTAL_TAGS} total tag values are allowed`);
    }

    return groups;
  }

  throw new TagsFilterValidationError('Tags filter object must have "or" or "and"');
}

/**
 * Normalizes inbox tag filters to CNF: `string[][]` where each inner array is one OR-group.
 * A flat list `['a','b']` is normalized to one OR-group `[['a','b']]`. Empty input → `[]` (no tag filter).
 */
export function normalizeTagGroups(tags: TagsFilter | undefined): string[][] {
  if (tags === undefined) {
    return [];
  }

  if (tags === null) {
    throw new TagsFilterValidationError('Tags must be an array or object');
  }

  if (typeof tags === 'object' && !Array.isArray(tags)) {
    return normalizeTagGroupsFromObject(tags as Record<string, unknown>);
  }

  if (!Array.isArray(tags)) {
    throw new TagsFilterValidationError('Tags must be an array or object');
  }

  if (tags.length === 0) {
    return [];
  }

  if (Array.isArray(tags[0])) {
    throw new TagsFilterValidationError(
      'Nested tag arrays are not supported; use { and: [{ or: string[] }, ...] } for multiple OR-groups'
    );
  }

  const flat = tags as string[];
  if (flat.length > MAX_TAGS_PER_GROUP) {
    throw new TagsFilterValidationError(`At most ${MAX_TAGS_PER_GROUP} tags are allowed in a single OR-group`);
  }

  for (const t of flat) {
    if (typeof t !== 'string') {
      throw new TagsFilterValidationError('Tags must be strings');
    }
  }

  return [flat];
}

/** MongoDB fragment for the message `tags` field from normalized CNF groups. */
export function buildTagsQuery(groups: string[][]): TagsMongoFragment {
  if (groups.length === 0) {
    return {};
  }

  if (groups.length === 1) {
    const [only] = groups;
    if (!only) {
      return {};
    }

    return { tags: { $in: only } };
  }

  return {
    $and: groups.map((g) => ({ tags: { $in: g } })),
  };
}
