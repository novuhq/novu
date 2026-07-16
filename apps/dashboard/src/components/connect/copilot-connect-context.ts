import { createContext, useContext } from 'react';
import type { CopilotConnectContext } from '@/api/agents';

export const CopilotConnectContextValue = createContext<CopilotConnectContext | undefined>(undefined);

/**
 * Reads the server-minted tenant `context` + `contextHash` provided by
 * `CopilotConnectProvider`. Returns `undefined` until it has been fetched (or when
 * rendered outside the provider), so consumers should guard on it.
 */
export function useCopilotConnectContext(): CopilotConnectContext | undefined {
  return useContext(CopilotConnectContextValue);
}
