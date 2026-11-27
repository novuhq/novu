import { type Accessor, createMemo } from 'solid-js';
import type { Context } from '../../types';
import { useNovu } from '../context';
import { createIdentityKey } from '../core/stores/events';

export type SignedInIdentity = {
  subscriberId: string | undefined;
  context: Context | undefined;
  contextKeys: string[];
};

export const useSignedInIdentity = (): Accessor<SignedInIdentity> => {
  const novu = useNovu();
  const identityKey = createIdentityKey(novu);

  return createMemo(() => {
    identityKey();
    const current = novu();

    return {
      subscriberId: current.subscriberId,
      context: current.context,
      contextKeys: current.session?.contextKeys ?? [],
    };
  });
};

export const isMissingSharedContext = (identity: SignedInIdentity, contextProp: Context | undefined): boolean =>
  identity.subscriberId !== undefined && !(contextProp ?? identity.context) && identity.contextKeys.length === 0;
