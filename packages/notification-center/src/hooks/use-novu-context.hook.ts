import { useContext } from 'react';
import { INovuProviderContext } from '../index';
import { NovuContext } from '../store/novu-provider.context';
import { useProviderCheck } from './use-check-provider.hook';

export function useNovuContext() {
  const novuContext = useContext<INovuProviderContext>(NovuContext);
  const context = useProviderCheck<INovuProviderContext>(novuContext);

  return context;
}
