import { NotificationFilter, NotificationStatus } from '../types';
import { arrayValuesEqual } from './arrays';

export const SEEN_OR_UNSEEN = [NotificationStatus.SEEN, NotificationStatus.UNSEEN];
export const READ_OR_UNREAD = [NotificationStatus.READ, NotificationStatus.UNREAD];

export const areTagsEqual = (tags1?: string[], tags2?: string[]) => {
  return arrayValuesEqual(tags1, tags2) || (!tags1 && tags2?.length === 0) || (tags1?.length === 0 && !tags2);
};

export const isSameFilter = (filter1: NotificationFilter, filter2: NotificationFilter) => {
  return (
    areTagsEqual(filter1.tags, filter2.tags) && filter1.read === filter2.read && filter1.archived === filter2.archived
  );
};
