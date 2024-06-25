import { useNovu } from '../context';

export const fetchFeeds = async () => {
  const novu = useNovu();
  try {
    const response = await novu.feeds.fetch();

    return response.data;
  } catch (error) {
    console.error('Error fetching feeds:', error);
    throw error;
  }
};
