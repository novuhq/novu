export const checkShouldUseLaunchDarkly = (): boolean => {
  return !!process.env.REACT_APP_LAUNCH_DARKLY_CLIENT_SIDE_ID;
};
