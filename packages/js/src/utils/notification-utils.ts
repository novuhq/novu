import { Notification, NotificationFilter, NotificationStatus, SeverityLevelEnum } from '../types';
import { arrayValuesEqual } from './arrays';

export const SEEN_OR_UNSEEN = [NotificationStatus.SEEN, NotificationStatus.UNSEEN];
export const READ_OR_UNREAD = [NotificationStatus.READ, NotificationStatus.UNREAD];

export const areTagsEqual = (tags1?: string[], tags2?: string[]) => {
  return arrayValuesEqual(tags1, tags2) || (!tags1 && tags2?.length === 0) || (tags1?.length === 0 && !tags2);
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
    areSeveritiesEqual(filter1.severity, filter2.severity)
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
  filterTags: string[] | undefined
): boolean {
  if (!filterTags || filterTags.length === 0) {
    // No tag filter specified, so it matches
    return true;
  }

  if (!notificationTags || notificationTags.length === 0) {
    // Filter has tags but notification has none
    return false;
  }

  // Check if notification has any of the required tags
  return filterTags.some((tag) => notificationTags.includes(tag));
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
 * Complete notification filter check combining all criteria.
 * This is the main function that should be used by both React and SolidJS implementations.
 */
export function checkNotificationMatchesFilter(notification: Notification, filter: NotificationFilter): boolean {
  return (
    checkBasicFilters(notification, filter) &&
    checkNotificationTagFilter(notification.tags, filter.tags) &&
    checkNotificationDataFilter(notification.data, filter.data)
  );
}
