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
