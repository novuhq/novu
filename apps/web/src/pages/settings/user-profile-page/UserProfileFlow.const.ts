/*
 * export enum UserProfileRootFlowEnum {
 *   SET_PASSWORD = 'SET_PASSWORD',
 *   UPDATE_PASSWORD = 'UPDATE_PASSWORD',
 * }
 */

export type UserProfileRootFlow = 'SET_PASSWORD' | 'UPDATE_PASSWORD';

export interface IUserProfileBaseFlow {
  rootFlow: UserProfileRootFlow;
  subFlow?: string;
}

export type UserProfileSetPasswordSubFlow = 'EMAIL_VERIFICATION' | 'CREATE_PASSWORD';
interface IUserProfileSetPasswordFlow extends IUserProfileBaseFlow {
  rootFlow: 'SET_PASSWORD';
  subFlow: UserProfileSetPasswordSubFlow;
}

interface IUserProfileUpdatePasswordFlow extends IUserProfileBaseFlow {
  rootFlow: 'UPDATE_PASSWORD';
  subFlow?: never;
}

export type UserProfileFlow = IUserProfileSetPasswordFlow | IUserProfileUpdatePasswordFlow;

/** The different possible flows / pages states for */
/*
 * export type UserProfileFlow =
 *   | UserProfileRootFlowEnum.UPDATE_PASSWORD
 *   | `${UserProfileRootFlowEnum.SET_PASSWORD}_${UserProfileSetPasswordSubFlow}`;
 */

// export const USER_PROFILE_SIDEBAR_TYPE_SET = new Set<UserProfileFlowEnum>(Object.values(UserProfileFlowEnum));
