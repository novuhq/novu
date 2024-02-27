import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import type { IResponseError } from '@novu/shared';

import { api } from '../../../api/api.client';
import { useAuthContext } from '../../../components/providers/AuthProvider';
import { applyToken } from '../../../hooks';
import { ROUTES } from '../../../constants/routes.enum';
import { errorMessage } from '../../../utils/notifications';

export function useAcceptInvite() {
  const { setToken } = useAuthContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { isLoading, mutateAsync, error, isError } = useMutation<string, IResponseError, string>((tokenItem) =>
    api.post(`/v1/invites/${tokenItem}/accept`, {})
  );

  const submitToken = useCallback(
    async (token: string, invitationToken: string, refetch = false) => {
      try {
        // just set the header, user is logged in after token is submitted
        applyToken(token);
        const newToken = await mutateAsync(invitationToken);
        if (!newToken) return;

        setToken(newToken, refetch);
        if (refetch) {
          await queryClient.refetchQueries({
            predicate: (query) => query.queryKey.includes('/v1/organizations'),
          });
        }

        navigate(ROUTES.WORKFLOWS);
      } catch (e: unknown) {
        errorMessage('Failed to accept an invite.');

        Sentry.captureException(e);
      }
    },
    [mutateAsync, navigate, queryClient, setToken]
  );

  return {
    isLoading,
    mutateAsync,
    submitToken,
    error,
    isError,
  };
}
