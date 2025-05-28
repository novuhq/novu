import { NotificationFilter, NotificationStatus } from '../types';
import { arrayValuesEqual } from './arrays';

export const SEEN_OR_UNSEEN = [NotificationStatus.SEEN, NotificationStatus.UNSEEN];
export const READ_OR_UNREAD = [NotificationStatus.READ, NotificationStatus.UNREAD];

export const areTagsEqual = (tags1?: string[], tags2?: string[]) => {
  return arrayValuesEqual(tags1, tags2) || (!tags1 && tags2?.length === 0) || (tags1?.length === 0 && !tags2);
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
    filter1.snoozed === filter2.snoozed
  );
};
