import { useCallback } from 'react';
import { useNovuContext } from './useNovuContext';

export const useSetQueryKey = () => {
  const { subscriberId, subscriberHash, applicationIdentifier } = useNovuContext();
  const setQueryKey = useCallback(
    (queryKeys: Array<unknown>) => [...queryKeys, subscriberId, applicationIdentifier, subscriberHash],
    [subscriberId, subscriberHash, applicationIdentifier]
  );

  return setQueryKey;
};
