import { useMemo } from 'react';
import { buildApiHttpClient } from '@/api/api.client';
import { useEnvironment } from '@/context/environment/hooks';
import { getToken } from '@/utils/auth';

export const useNovuAPI = () => {
  const { currentEnvironment } = useEnvironment();
  const token = getToken();

  return useMemo(
    () => buildApiHttpClient({ jwt: token, environmentId: currentEnvironment?._id }),
    [currentEnvironment?._id, token]
  );
};
