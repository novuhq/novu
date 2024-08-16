import { useQuery } from '@tanstack/react-query';
import { IApiKey } from '@novu/shared';
import { QueryKeys } from '../api/query.keys';
import { getApiKeys } from '../api/environment';
import { useEnvironment } from '../components/providers/EnvironmentProvider';

export function useApiKeys() {
  const { environment } = useEnvironment();

  return useQuery<IApiKey[]>([QueryKeys.getApiKeys, environment?._id], getApiKeys);
}
