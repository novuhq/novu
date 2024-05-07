export enum UserProfileSidebarTypeEnum {
  PASSWORD = 'password',
}

export const USER_PROFILE_SIDEBAR_TYPE_SET = new Set<UserProfileSidebarTypeEnum>(
  Object.values(UserProfileSidebarTypeEnum)
);
