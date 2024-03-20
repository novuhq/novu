export enum UserProfilePasswordSidebarEnum {
  SET_PASSWORD = 'set-password',
  UPDATE_PASSWORD = 'update-password',
}

export const USER_PROFILE_PASSWORD_SIDEBAR_VALUE_SET = new Set<UserProfilePasswordSidebarEnum>(
  Object.values(UserProfilePasswordSidebarEnum)
);
