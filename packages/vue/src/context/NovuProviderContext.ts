import { Novu, NovuOptions } from '@novu/js';
import { inject, Ref } from 'vue';

export const NovuKey = Symbol('Novu');

export type NovuProviderProps = NovuOptions & { userAgentType: 'components' | 'hooks' };

/**
 * **useNovu** - Provides access to the Novu instance
 */
export function useNovu(): Novu {
  const novu = inject(NovuKey, undefined) as Novu | undefined;
  if (!novu) throw new Error('useNovu must be used within a <NovuProvider />');

  return novu as Novu;
}

/**
 * **useUnsafeNovu** - Provides access to the Novu instance without throwing an error if undefined
 */
export function useUnsafeNovu(): Novu | undefined {
  return inject(NovuKey, undefined) as Novu | undefined;
}
