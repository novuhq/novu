import { UserProfileFlow } from './UserProfileFlow.const';

interface IUserProfilePageState {
  hasPassword: boolean;
  token?: string;
}

export const selectUserProfileFlow = ({ hasPassword, token }: IUserProfilePageState): UserProfileFlow => {
  if (hasPassword) {
    return { rootFlow: 'UPDATE_PASSWORD' };
  }

  if (token) {
    return { rootFlow: 'SET_PASSWORD', subFlow: 'CREATE_PASSWORD' };
  }

  return { rootFlow: 'SET_PASSWORD', subFlow: 'EMAIL_VERIFICATION' };
};
