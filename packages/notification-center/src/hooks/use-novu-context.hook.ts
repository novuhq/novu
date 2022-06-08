import { useContext } from 'react';
import { INovuProviderContext } from '../index';
import { NovuContext } from '../store/novu-provider.context';

export function useNovuContext() {
  const context = useContext<INovuProviderContext>(NovuContext);

  if (context === undefined) {
    throw new Error('Component must be wrapped within the NovuProvider');
  }

  return context;
}
