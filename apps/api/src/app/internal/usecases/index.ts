import { HandleSchedulerCallback } from './handle-scheduler-callback/handle-scheduler-callback.usecase';
import { UpdateSubscriberOnlineState } from './update-subscriber-online-state/update-subscriber-online-state.usecase';

export const USE_CASES = [UpdateSubscriberOnlineState, HandleSchedulerCallback];

export { HandleSchedulerCallback, UpdateSubscriberOnlineState };
