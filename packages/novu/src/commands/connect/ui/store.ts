import { atom, type WritableAtom } from 'nanostores';
import type { AgentSummary, ChannelChoice } from '../types';
import type { PickResult } from './ui';

export type Phase =
  | {
      kind: 'welcome';
      /** Called when the user hits Enter to authorize. Pipeline awaits this before opening the browser. */
      resolve: () => void;
    }
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
  | { kind: 'adding-email' }
  | {
      kind: 'email-ready';
      /** The unique per-agent inbound address (e.g. `agent-xyz@agentconnect.sh`). */
      inboundAddress: string;
      /** Pre-built mailto: URL with subject/body pre-filled; opening it launches the user's mail client. */
      mailtoUrl: string;
      /** Resolves when the user hits Enter — the pipeline then runs `open()`. */
      resolve: () => void;
    }
  | {
      kind: 'email-waiting';
      inboundAddress: string;
    }
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
  // Start on the welcome screen with a no-op resolver — the pipeline replaces
  // it with the real resolver in `ui.showWelcome()` as the first thing it
  // does. The no-op covers the microsecond window before that happens.
  return {
    phase: atom<Phase>({ kind: 'welcome', resolve: () => undefined }),
  };
}
