import { useContext } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { api } from '../../api/api.client';
import { AuthContext } from '../../store/authContext';

export function useAcceptInvite() {
  const { setToken } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const { isLoading, mutateAsync, error, isError } = useMutation<
    string,
    { error: string; message: string; statusCode: number },
    string
  >((tokenItem) => api.post(`/v1/invites/${tokenItem}/accept`, {}));

  const submitToken = async (token: string, refetch = false): Promise<boolean> => {
    const responseInvite = await mutateAsync(token);

    if (!responseInvite) return false;

    setToken(responseInvite);
    if (refetch) {
      await queryClient.refetchQueries({
        predicate: (query) => query.queryKey === '/v1/organizations',
      });
    }

    return true;
  };

  return {
    isLoading,
    mutateAsync,
    submitToken,
    error,
    isError,
  };
}
