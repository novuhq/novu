import { atom, type WritableAtom } from 'nanostores';
import type { AgentSummary } from '../types';
import type { PickResult } from './ui';

export type Phase =
  | { kind: 'auth'; dashboardUrl: string | null; status: string }
  | { kind: 'listing-agents' }
  | { kind: 'loading-integrations' }
  | { kind: 'pick'; agents: AgentSummary[]; resolve: (pick: PickResult) => void }
  | { kind: 'describe'; resolve: (prompt: string) => void }
  | { kind: 'generating' }
  | { kind: 'creating'; name: string }
  | { kind: 'adding-slack' }
  | { kind: 'waiting-slack'; authorizeUrl: string; pollingStartedAt: number }
  | { kind: 'sending-welcome' }
  | {
      kind: 'success';
      agent: AgentSummary;
      dashboardUrl: string;
      environmentSlug: string | null;
      slackConnected: boolean;
    }
  | { kind: 'error'; message: string };

export interface ConnectStore {
  phase: WritableAtom<Phase>;
}

export function createConnectStore(): ConnectStore {
  return {
    phase: atom<Phase>({ kind: 'auth', dashboardUrl: null, status: 'Authorizing via the Novu Dashboard…' }),
  };
}
