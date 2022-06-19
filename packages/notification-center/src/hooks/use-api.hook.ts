import { useContext } from 'react';
import { ApiContext, IApiContext } from '../store/api.context';
import { useProviderCheck } from './use-check-provider.hook';

export function useApi() {
  const context = useContext<IApiContext>(ApiContext);
  const api = useProviderCheck(context.api);

  return { api };
}
