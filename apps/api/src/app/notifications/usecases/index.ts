import { GetActivityStats } from './get-activity-stats';
import { GetActivityFeed } from './get-activity-feed/get-activity-feed.usecase';
import { GetActivityGraphStats } from './get-activity-graph-states/get-activity-graph-states.usecase';
import { GetActivity } from './get-activity/get-activity.usecase';

export const USE_CASES = [
  GetActivityStats,
  GetActivityGraphStats,
  GetActivityFeed,
  GetActivity,
  //
];
