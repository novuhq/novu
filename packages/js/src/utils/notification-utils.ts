import { NotificationFilter, NotificationStatus } from '../types';
import { arrayValuesEqual } from './arrays';

export const SEEN_OR_UNSEEN = [NotificationStatus.SEEN, NotificationStatus.UNSEEN];
export const READ_OR_UNREAD = [NotificationStatus.READ, NotificationStatus.UNREAD];

export const isSameFilter = (filter1: NotificationFilter, filter2: NotificationFilter) => {
  return (
    arrayValuesEqual(filter1.tags, filter2.tags) &&
    filter1.read === filter2.read &&
    filter1.archived === filter2.archived
  );
};
