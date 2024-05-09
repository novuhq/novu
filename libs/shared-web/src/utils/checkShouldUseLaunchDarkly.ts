import { LAUNCH_DARKLY_CLIENT_SIDE_ID } from '../config';

/** Determine if client-side LaunchDarkly should be enabled */
export const checkShouldUseLaunchDarkly = (): boolean => {
  return !!LAUNCH_DARKLY_CLIENT_SIDE_ID;
};
