import { UserProfileFlow } from './UserProfileFlow.const';

interface IUserProfilePageState {
  hasPassword: boolean;
  token?: string;
}

/** Determine which flow is active on the User Profile page based on supplied state */
export const selectUserProfileFlow = ({ hasPassword, token }: IUserProfilePageState): UserProfileFlow => {
  if (hasPassword) {
    return { rootFlow: 'UPDATE_PASSWORD' };
  }

  if (token) {
    return { rootFlow: 'SET_PASSWORD', subFlow: 'CREATE_PASSWORD' };
  }

  return { rootFlow: 'SET_PASSWORD', subFlow: 'EMAIL_VERIFICATION' };
};
