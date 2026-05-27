import { atom, type WritableAtom } from 'nanostores';
import type { AgentSummary, ChannelChoice } from '../types';
import type { PickResult } from './ui';

export type Phase =
  | { kind: 'auth'; dashboardUrl: string | null; status: string }
  | { kind: 'listing-agents' }
  | { kind: 'loading-integrations' }
  | { kind: 'pick'; agents: AgentSummary[]; resolve: (pick: PickResult) => void }
  | { kind: 'describe'; resolve: (prompt: string) => void }
  | { kind: 'generating' }
  | { kind: 'creating'; name: string }
  | { kind: 'pick-channel'; resolve: (choice: ChannelChoice) => void }
  | { kind: 'adding-slack' }
  | {
      kind: 'paste-slack-token';
      retry: boolean;
      resolve: (token: string) => void;
      reject: (reason: Error) => void;
    }
  | { kind: 'running-slack-quick-setup' }
  | { kind: 'waiting-slack'; authorizeUrl: string; pollingStartedAt: number }
  | { kind: 'adding-telegram' }
  | {
      kind: 'telegram-intro';
      /** Pre-rendered ASCII QR for `t.me/botfather`. */
      botfatherQr: string;
      resolve: () => void;
    }
  | {
      kind: 'telegram-link-token';
      /** Pre-rendered ASCII QR for the signed mobile-link URL. */
      mobileQr: string;
      mobileUrl: string;
    }
  | {
      kind: 'telegram-test';
      /** Pre-rendered ASCII QR for the `t.me/<bot>?start=<code>` deep link. */
      deepLinkQr: string;
      deepLinkUrl: string;
      botUsername: string;
    }
  | { kind: 'sending-welcome' }
  | {
      kind: 'success';
      agent: AgentSummary;
      dashboardUrl: string;
      environmentSlug: string | null;
      /** Which channel ended up connected, if any. Drives the "check your bot" copy on the final screen. */
      connectedChannel: ChannelChoice | null;
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
