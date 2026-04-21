import { Notification } from '../notifications/notification';
import { NotificationFilter, NotificationStatus, SeverityLevelEnum, type TagsFilter } from '../types';
import { arrayValuesEqual } from './arrays';

export const SEEN_OR_UNSEEN = [NotificationStatus.SEEN, NotificationStatus.UNSEEN];
export const READ_OR_UNREAD = [NotificationStatus.READ, NotificationStatus.UNREAD];

const MAX_TAG_GROUPS = 30;
const MAX_TAGS_PER_GROUP = 100;
const MAX_TOTAL_TAGS = 200;

class TagsFilterValidationError extends Error {
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

function tagsFilterComparableString(tags?: TagsFilter): string {
  if (tags === undefined) {
    return '';
  }

  const groups = normalizeTagGroups(tags);
  if (groups.length === 0) {
    return '';
  }

  const sortedGroups = Array.from(
    new Map(
      groups.map((group) => {
        const canonicalGroup = Array.from(new Set(group)).sort((a, b) => a.localeCompare(b));

        return [JSON.stringify(canonicalGroup), canonicalGroup] as const;
      })
    ).values()
  ).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  return JSON.stringify(sortedGroups);
}

export const areTagsEqual = (tags1?: TagsFilter, tags2?: TagsFilter) => {
  try {
    return tagsFilterComparableString(tags1) === tagsFilterComparableString(tags2);
  } catch {
    return false;
  }
};

export const areSeveritiesEqual = (
  el1?: SeverityLevelEnum | SeverityLevelEnum[],
  el2?: SeverityLevelEnum | SeverityLevelEnum[]
) => {
  const severity1 = Array.isArray(el1) ? el1 : el1 ? [el1] : [];
  const severity2 = Array.isArray(el2) ? el2 : el2 ? [el2] : [];

  return arrayValuesEqual(severity1, severity2);
};

export const areDataEqual = (data1?: Record<string, unknown>, data2?: Record<string, unknown>) => {
  if (!data1 && !data2) {
    return true;
  }

  if (!data1 || !data2) {
    return false;
  }

  try {
    return JSON.stringify(data1) === JSON.stringify(data2);
  } catch {
    // In case of circular dependencies or other stringify errors, fall back to false
    return false;
  }
};

export const isSameFilter = (filter1: NotificationFilter, filter2: NotificationFilter) => {
  return (
    areDataEqual(filter1.data, filter2.data) &&
    areTagsEqual(filter1.tags, filter2.tags) &&
    filter1.read === filter2.read &&
    filter1.archived === filter2.archived &&
    filter1.snoozed === filter2.snoozed &&
    filter1.seen === filter2.seen &&
    areSeveritiesEqual(filter1.severity, filter2.severity) &&
    filter1.createdGte === filter2.createdGte &&
    filter1.createdLte === filter2.createdLte
  );
};

export function checkNotificationDataFilter(
  notificationData: Notification['data'],
  filterData: NotificationFilter['data']
): boolean {
  if (!filterData || Object.keys(filterData).length === 0) {
    // No data filter defined, so it's a match on the data aspect.
    return true;
  }
  if (!notificationData) {
    // Filter has data criteria, but the notification has no data.
    return false;
  }

  return Object.entries(filterData).every(([key, filterValue]) => {
    const notifValue = notificationData[key];

    if (notifValue === undefined && filterValue !== undefined) {
      // Key is specified in filter, but not present in notification data.
      return false;
    }

    if (Array.isArray(filterValue)) {
      if (Array.isArray(notifValue)) {
        /*
         * Both filter value and notification value are arrays.
         * Check for set equality (same elements, regardless of order).
         */
        if (filterValue.length !== notifValue.length) return false;
        /*
         * Ensure elements are of primitive types for direct sort and comparison.
         * If elements can be objects, a more sophisticated comparison is needed.
         */
        const sortedFilterValue = [...(filterValue as (string | number | boolean)[])].sort();
        const sortedNotifValue = [...(notifValue as (string | number | boolean)[])].sort();

        return sortedFilterValue.every((val, index) => val === sortedNotifValue[index]);
      } else {
        /*
         * Filter value is an array, notification value is scalar.
         * Check if the scalar notification value is present in the filter array.
         */
        return (filterValue as unknown[]).includes(notifValue);
      }
    } else {
      // Filter value is scalar. Notification value must be equal.
      return notifValue === filterValue;
    }
  });
}

/**
 * Check if notification tags match the filter tags criteria.
 */
export function checkNotificationTagFilter(
  notificationTags: string[] | undefined,
  filterTags: TagsFilter | undefined
): boolean {
  let groups: string[][];
  try {
    groups = normalizeTagGroups(filterTags);
  } catch {
    return false;
  }

  if (groups.length === 0) {
    return true;
  }

  if (!notificationTags || notificationTags.length === 0) {
    return false;
  }

  return groups.every((group) => group.some((tag) => notificationTags.includes(tag)));
}

/**
 * Check if notification matches basic filter criteria (read, seen, archived, snoozed).
 */
export function checkBasicFilters(
  notification: Notification,
  filter: Pick<NotificationFilter, 'read' | 'seen' | 'archived' | 'snoozed'>
): boolean {
  // Check read status
  if (filter.read !== undefined && notification.isRead !== filter.read) {
    return false;
  }

  // Check seen status
  if (filter.seen !== undefined && notification.isSeen !== filter.seen) {
    return false;
  }

  // Check archived status
  if (filter.archived !== undefined && notification.isArchived !== filter.archived) {
    return false;
  }

  // Check snoozed status
  if (filter.snoozed !== undefined && notification.isSnoozed !== filter.snoozed) {
    return false;
  }

  return true;
}

/**
 * Check if notification falls within the specified time range.
 */
export function checkNotificationTimeframeFilter(
  notificationCreatedAt: string,
  createdGte?: number,
  createdLte?: number
): boolean {
  if (!createdGte && !createdLte) {
    return true;
  }

  const createdAtDate = new Date(notificationCreatedAt).getTime();

  if (createdGte) {
    if (createdAtDate < createdGte) {
      return false;
    }
  }

  if (createdLte) {
    if (createdAtDate > createdLte) {
      return false;
    }
  }

  return true;
}

/**
 * Complete notification filter check combining all criteria.
 * This is the main function that should be used by both React and SolidJS implementations.
 */
export function checkNotificationMatchesFilter(notification: Notification, filter: NotificationFilter): boolean {
  return (
    checkBasicFilters(notification, filter) &&
    checkNotificationTagFilter(notification.tags, filter.tags) &&
    checkNotificationDataFilter(notification.data, filter.data) &&
    checkNotificationTimeframeFilter(notification.createdAt, filter.createdGte, filter.createdLte)
  );
}
