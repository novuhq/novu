import type { FetchCountArgs, FetchFeedArgs, MarkAllNotificationsAsArgs } from '../../feeds';
import { useNovu } from '../context';

export const fetchFeeds = async (options?: FetchFeedArgs) => {
  const novu = useNovu();
  try {
    const response = await novu.feeds.fetch(options);

    return response;
  } catch (error) {
    console.error('Error fetching feeds:', error);
    throw error;
  }
};

export const fetchCount = async (feedIdentifier?: FetchCountArgs) => {
  const novu = useNovu();
  try {
    const count = await novu.feeds.fetchCount(feedIdentifier);

    return count;
  } catch (error) {
    console.error('Error fetching feeds count:', error);
    throw error;
  }
};

export const markAllAs = async (options: MarkAllNotificationsAsArgs) => {
  const novu = useNovu();
  try {
    const response = await novu.feeds.markAllNotificationsAs(options);

    return response;
  } catch (error) {
    console.error(`Error marking all as: ${options.status}`, error);
    throw error;
  }
};
