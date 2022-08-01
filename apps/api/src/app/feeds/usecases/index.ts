import { CreateFeed } from './create-feed/create-feed.usecase';
import { GetFeeds } from './get-feeds/get-feeds.usecase';
import { DeleteFeed } from './delete-feed/delete-feed.usecase';

export const USE_CASES = [CreateFeed, GetFeeds, DeleteFeed];
