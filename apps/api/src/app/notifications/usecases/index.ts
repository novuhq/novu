import { GetActivity } from './get-activity/get-activity.usecase';
import { GetActivityFeed } from './get-activity-feed/get-activity-feed.usecase';
import { GetActivityGraphStats } from './get-activity-graph-states/get-activity-graph-states.usecase';
import { GetActivityStats } from './get-activity-stats';

export const USE_CASES = [
  GetActivityStats,
  GetActivityGraphStats,
  GetActivityFeed,
  GetActivity,
  //
];
