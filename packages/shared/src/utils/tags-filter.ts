/** Flat OR-list (legacy) or CNF: AND of OR-groups (outer = AND, inner = OR). */
export type TagsFilter = string[] | string[][];

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

/**
 * Normalizes inbox tag filters to CNF: `string[][]` where each inner array is one OR-group.
 * Legacy `['a','b']` → `[['a','b']]`. Empty input → `[]` (no tag filter).
 */
export function normalizeTagGroups(tags: TagsFilter | undefined): string[][] {
  if (tags === undefined) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new TagsFilterValidationError('Tags must be an array');
  }

  if (tags.length === 0) {
    return [];
  }

  const isNested = Array.isArray(tags[0]);

  if (isNested) {
    const groups = tags as string[][];
    if (groups.length > MAX_TAG_GROUPS) {
      throw new TagsFilterValidationError(`At most ${MAX_TAG_GROUPS} tag groups are allowed`);
    }

    let total = 0;
    for (const group of groups) {
      if (!Array.isArray(group) || group.length === 0) {
        throw new TagsFilterValidationError('Each tag group must be a non-empty array of strings');
      }
      if (group.length > MAX_TAGS_PER_GROUP) {
        throw new TagsFilterValidationError(`At most ${MAX_TAGS_PER_GROUP} tags per group are allowed`);
      }
      for (const t of group) {
        if (typeof t !== 'string') {
          throw new TagsFilterValidationError('Tags must be strings');
        }
      }
      total += group.length;
    }
    if (total > MAX_TOTAL_TAGS) {
      throw new TagsFilterValidationError(`At most ${MAX_TOTAL_TAGS} total tag values are allowed`);
    }

    return groups;
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
