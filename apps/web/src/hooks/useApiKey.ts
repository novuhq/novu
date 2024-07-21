import { useQuery } from '@tanstack/react-query';
import { getApiKeys } from '../api/environment';

export const useAPIKeys = () => {
  const res = useQuery<{ key: string }[]>(['getApiKeys'], getApiKeys);
  const { data: apiKeys } = res;
  const apiKey = apiKeys?.length ? apiKeys[0].key : '';

  return { ...res, apiKey };
};
