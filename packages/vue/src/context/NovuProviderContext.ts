import { Novu, NovuOptions } from '@novu/js';
import { inject, Ref } from 'vue';

export const NovuKey = Symbol('Novu');

export type NovuProviderProps = NovuOptions & { userAgentType: 'components' | 'hooks' };

/**
 * **useNovu** - Provides access to the Novu instance
 */
export function useNovu(): Ref<Novu> {
  const novu = inject(NovuKey) as Ref<Novu> | undefined;
  if (!novu?.value) {
    throw new Error('useNovu must be used within a <NovuProvider />');
  }

  return novu as Ref<Novu>;
}

/**
 * **useUnsafeNovu** - Provides access to the Novu instance without throwing an error if undefined
 */
export function useUnsafeNovu(): Ref<Novu> | undefined {
  return inject(NovuKey) as Ref<Novu> | undefined;
}
