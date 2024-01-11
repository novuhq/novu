import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { IUserEntity } from '@novu/shared';

import { updateUserOnBoarding } from '../user';
import { useAuthContext } from '../../components/providers/AuthProvider';

interface IErrorResponseType {
  error: string;
  message: string;
  statusCode: number;
}

interface IRequestPayload {
  showOnBoarding: boolean;
}

export const useUserOnBoarding = () => {
  const { currentUser } = useAuthContext();
  const queryClient = useQueryClient();

  const [isUserLoading, setIsUserLoading] = useState<boolean>(true);
  const [show, setShow] = useState<boolean>(isShowOnBoarding(currentUser?.showOnBoarding));

  const mutationFunction = ({ showOnBoarding }) => updateUserOnBoarding(showOnBoarding);
  const {
    mutateAsync: updateOnBoardingStatus,
    isLoading: isLoadingUpdate,
    ...rest
  } = useMutation<IUserEntity, IErrorResponseType, IRequestPayload>(mutationFunction, {
    onSuccess: async (data, variables, context) => {
      if (data) {
        await queryClient.refetchQueries({ queryKey: ['/v1/users/me'], exact: true });
        setShow(isShowOnBoarding(data.showOnBoarding));
      }
    },
  });

  useEffect(() => {
    if (currentUser) {
      setIsUserLoading(false);
      setShow(isShowOnBoarding(currentUser?.showOnBoarding));
    }
  }, [currentUser, currentUser?.showOnBoarding]);

  return {
    updateOnBoardingStatus,
    isLoading: isUserLoading || isLoadingUpdate,
    showOnBoarding: show,
  };
};

const isShowOnBoarding = (showOnBoarding: boolean | undefined): boolean => {
  return showOnBoarding === true || showOnBoarding === undefined;
};
