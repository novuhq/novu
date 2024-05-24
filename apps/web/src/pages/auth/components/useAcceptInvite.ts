import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import type { IResponseError } from '@novu/shared';

import { api } from '../../../api/api.client';
import { useAuth } from '@novu/shared-web';
import { ROUTES } from '../../../constants/routes.enum';
import { errorMessage } from '../../../utils/notifications';
import { LocationState } from './LoginForm';

export function useAcceptInvite() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const queryClient = useQueryClient();

  const { isLoading, mutateAsync, error, isError } = useMutation<string, IResponseError, string>((tokenItem) =>
    api.post(`/v1/invites/${tokenItem}/accept`, {})
  );

  const submitToken = useCallback(
    async (token: string, invitationToken: string, refetch = false) => {
      try {
        const newToken = await mutateAsync(invitationToken);
        login(newToken);
        // TODO: This refetch shouldn't be necessary anymore. Remove it after testing.
        if (refetch) {
          await queryClient.refetchQueries({
            predicate: (query) => query.queryKey.includes('/v1/organizations'),
          });
        }
        navigate(state?.redirectTo?.pathname || ROUTES.WORKFLOWS);
      } catch (e: unknown) {
        errorMessage('Failed to accept an invite.');

        Sentry.captureException(e);
      }
    },
    [mutateAsync, navigate, login, state?.redirectTo?.pathname, queryClient]
  );

  return {
    isLoading,
    mutateAsync,
    submitToken,
    error,
    isError,
  };
}
