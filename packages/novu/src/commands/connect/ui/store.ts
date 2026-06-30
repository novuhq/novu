import { atom, type WritableAtom } from 'nanostores';
import type { GeneratedAgentSpec } from '../api/agents';
import type {
  AgentConnectMode,
  AgentSummary,
  ChannelChoice,
  ChatSdkConnectOutcome,
  ChatSdkRequirement,
  CustomCodeConnectOutcome,
} from '../types';
import type { BridgeScaffoldVariant } from '../pipeline/bridge/types';
import type {
  ChatSdkTunnelOfferResult,
  GeneratedAgentPreviewResult,
  PickAgentIntegrationResult,
  PickResult,
} from './ui';

export type Phase =
  | {
      kind: 'welcome';
      /** Called when the user hits Enter to begin. Pipeline awaits this before bootstrapping the session. */
      resolve: () => void;
    }
  | { kind: 'auth'; dashboardUrl: string | null; status: string }
  | { kind: 'listing-agents' }
  | { kind: 'loading-integrations' }
  | {
      kind: 'pick';
      agents: AgentSummary[];
      resolve: (pick: PickResult) => void;
    }
  | {
      kind: 'pick-connect-mode';
      preselected?: AgentConnectMode;
      resolve: (mode: AgentConnectMode) => void;
    }
  | {
      kind: 'pick-integration';
      providerLabel: string;
      integrations: Array<{ _id: string; name: string; identifier: string }>;
      resolve: (pick: PickAgentIntegrationResult) => void;
    }
  | {
      kind: 'prompt-secret';
      title: string;
      placeholder: string;
      hint?: string;
      secret?: boolean;
      verificationError?: string;
      resolve: (value: string) => void;
    }
  | {
      kind: 'pick-aws-region';
      resolve: (region: string) => void;
    }
  | { kind: 'verifying-credentials' }
  | {
      kind: 'describe';
      previousPrompt?: string;
      resolve: (prompt: string) => void;
    }
  | {
      kind: 'prompt-agent-name';
      defaultName: string;
      resolve: (name: string) => void;
    }
  | {
      kind: 'confirm-env-secret-overwrite';
      envPath: string;
      existingMasked: string;
      nextMasked: string;
      resolve: (overwrite: boolean) => void;
    }
  | {
      kind: 'confirm-scaffold';
      projectDir: string;
      appName: string;
      variant?: BridgeScaffoldVariant;
      resolve: (confirmed: boolean) => void;
    }
  | { kind: 'scaffolding-bridge'; variant: BridgeScaffoldVariant }
  | {
      kind: 'chat-sdk-reconcile-plan';
      projectDir: string;
      requirements: ChatSdkRequirement[];
      envPaths: string[];
      wiringInstructions?: string;
      requirementsFile?: string;
      resolve: () => void;
    }
  | { kind: 'chat-sdk-install-deps' }
  | {
      kind: 'chat-sdk-install-deps-confirm';
      projectDir: string;
      installCommand: string;
      packages: string[];
      resolve: (confirmed: boolean) => void;
    }
  | {
      kind: 'chat-sdk-tunnel-offer';
      projectDir: string;
      devCommand: string;
      resolve: (result: ChatSdkTunnelOfferResult) => void;
    }
  | { kind: 'generating' }
  | {
      kind: 'preview-generated';
      spec: GeneratedAgentSpec;
      resolve: (result: GeneratedAgentPreviewResult) => void;
    }
  | { kind: 'creating'; name: string }
  | { kind: 'pick-channel'; resolve: (choice: ChannelChoice) => void }
  | {
      kind: 'dashboard-channel-ready';
      channel: ChannelChoice;
      agentDetailsUrl: string;
      resolve: () => void;
    }
  | { kind: 'adding-slack' }
  | {
      kind: 'paste-slack-token';
      retry: boolean;
      verificationError?: string;
      resolve: (token: string) => void;
      reject: (reason: Error) => void;
    }
  | { kind: 'running-slack-quick-setup' }
  | {
      kind: 'slack-oauth-ready';
      authorizeUrl: string;
      /** True when Novu just created the Slack app via manifest quick-setup. */
      appCreated: boolean;
      /** Resolves when the user hits Enter — the pipeline then runs `open()`. */
      resolve: () => void;
    }
  | { kind: 'waiting-slack'; authorizeUrl: string; pollingStartedAt: number }
  | { kind: 'adding-email' }
  | {
      kind: 'email-ready';
      /** The unique per-agent inbound address (e.g. `agent-xyz@agentconnect.sh`). */
      inboundAddress: string;
      /** Pre-built mailto: URL with subject/body pre-filled; opening it launches the user's mail client. */
      mailtoUrl: string;
      sendFromEmail?: string;
      /** Resolves when the user hits Enter — the pipeline then runs `open()`. */
      resolve: () => void;
      onBack?: () => void;
    }
  | {
      kind: 'email-waiting';
      inboundAddress: string;
      sendFromEmail?: string;
    }
  | { kind: 'adding-telegram' }
  | {
      kind: 'telegram-intro';
      /** Pre-rendered ASCII QR for `t.me/botfather`. */
      botfatherQr: string;
      resolve: () => void;
    }
  | {
      kind: 'pick-telegram-token-delivery';
      resolve: (delivery: 'setup-page' | 'terminal') => void;
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
      connectDashboardUrl: string;
      environmentSlug: string | null;
      /** Which channel ended up connected, if any. Drives the "check your bot" copy on the final screen. */
      connectedChannel: ChannelChoice | null;
      /** Channel the user picked that continues in the Connect dashboard instead of the CLI. */
      dashboardRedirectChannel: ChannelChoice | null;
      isKeyless: boolean;
      claimUrl: string | null;
      connectMode?: AgentConnectMode;
      chatSdkOutcome?: ChatSdkConnectOutcome;
      customCodeOutcome?: CustomCodeConnectOutcome;
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
