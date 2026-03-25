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

/** Normalizes legacy flat tags or CNF nested tags to `string[][]` (AND of OR-groups). */
export function normalizeTagGroups(tags: TagsFilter | undefined): string[][] {
  if (!tags || tags.length === 0) {
    return [];
  }

  if (!Array.isArray(tags)) {
    throw new TagsFilterValidationError('Tags must be an array');
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

function tagsFilterComparableString(tags?: TagsFilter): string {
  if (!tags || tags.length === 0) {
    return '';
  }

  const groups = normalizeTagGroups(tags);
  const sortedGroups = groups
    .map((g) => [...g].sort((a, b) => a.localeCompare(b)))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

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
  } catch (e) {
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
  if (!filterTags || filterTags.length === 0) {
    // No tag filter specified, so it matches
    return true;
  }

  if (!notificationTags || notificationTags.length === 0) {
    // Filter has tags but notification has none
    return false;
  }

  let groups: string[][];
  try {
    groups = normalizeTagGroups(filterTags);
  } catch {
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
