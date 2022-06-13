import { useContext } from 'react';
import { INovuProviderContext } from '../index';
import { NovuContext } from '../store/novu-provider.context';
import { useProviderCheck } from './use-check-provider.hook';

/**
 * custom hook for accessing NovuContext
 * @returns INovuProviderContext
 */
export function useNovuContext(): INovuProviderContext {
  const novuContext = useContext<INovuProviderContext>(NovuContext);
  const context = useProviderCheck<INovuProviderContext>(novuContext);

  return context;
}
