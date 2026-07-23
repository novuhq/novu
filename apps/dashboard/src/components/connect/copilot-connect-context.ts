import { createContext, useContext } from 'react';
import type { NovuConnectContext } from '@/api/novu-context';

export const CopilotConnectContextValue = createContext<NovuConnectContext | undefined>(undefined);

/**
 * Reads the server-minted tenant `context` + `contextHash` provided by
 * `CopilotConnectProvider`. Returns `undefined` until it has been fetched (or when
 * rendered outside the provider), so consumers should guard on it.
 */
export function useCopilotConnectContext(): NovuConnectContext | undefined {
  return useContext(CopilotConnectContextValue);
}
