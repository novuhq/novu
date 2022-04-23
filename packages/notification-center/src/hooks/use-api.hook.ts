import { useContext } from 'react';
import { ApiContext, IApiContext } from '../store/api.context';

export function useApi() {
  const { api } = useContext<IApiContext>(ApiContext);

  return { api };
}
