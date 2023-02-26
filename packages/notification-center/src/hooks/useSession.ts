import { useQuery } from '@tanstack/react-query';

import { SESSION_QUERY_KEY } from './queryKeys';
import type { ISession } from '../shared/interfaces';
import { useNovuContext } from './useNovuContext';

export const useSession = ({ onSuccess }: { onSuccess?: (session: ISession) => void }) => {
  const { apiService, applicationIdentifier, subscriberId, subscriberHash } = useNovuContext();

  const result = useQuery<ISession, Error, ISession>(
    [...SESSION_QUERY_KEY, applicationIdentifier, subscriberId, subscriberHash],
    () => apiService.initializeSession(applicationIdentifier, subscriberId, subscriberHash),
    {
      enabled: !!applicationIdentifier && !!subscriberId,
      cacheTime: Infinity,
      staleTime: Infinity,
      onSuccess,
      onError: (error: Error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize the session', error.message);
      },
    }
  );

  return result;
};
