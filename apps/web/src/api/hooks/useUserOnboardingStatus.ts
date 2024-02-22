import { useMutation, useQueryClient } from '@tanstack/react-query';

import { IUserEntity } from '@novu/shared';

import { updateUserOnBoarding } from '../user';
import { useAuthContext } from '@novu/shared-web';

interface IErrorResponseType {
  error: string;
  message: string;
  statusCode: number;
}

interface IRequestPayload {
  showOnboarding: boolean;
}

export const useUserOnboardingStatus = () => {
  const { currentUser, isUserLoading } = useAuthContext();
  const queryClient = useQueryClient();

  const mutationFunction = ({ showOnboarding }) => updateUserOnBoarding(showOnboarding);
  const {
    mutateAsync: updateOnBoardingStatus,
    isLoading: isLoadingUpdate,
    ...rest
  } = useMutation<IUserEntity, IErrorResponseType, IRequestPayload>(mutationFunction, {
    onSuccess: async (data) => {
      if (data) {
        queryClient.setQueryData(['/v1/users/me'], data);
      }
    },
  });

  return {
    updateOnboardingStatus: updateOnBoardingStatus,
    isLoading: isUserLoading || isLoadingUpdate,
    showOnboarding: shouldShowOnboarding(currentUser?.showOnBoarding),
  };
};

const shouldShowOnboarding = (showOnboarding: boolean | undefined): boolean => {
  return showOnboarding === true || showOnboarding === undefined;
};
