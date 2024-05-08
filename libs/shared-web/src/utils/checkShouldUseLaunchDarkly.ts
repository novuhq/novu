import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

export const checkShouldUseLaunchDarkly = (): boolean => {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID;
};
