import type { CloudRegionEnum } from '../dev/enums';

export type ChannelChoice = 'slack' | 'email' | 'whatsapp' | 'telegram' | 'teams' | 'skip';

export const CHANNEL_CHOICES: readonly ChannelChoice[] = ['slack', 'email', 'whatsapp', 'telegram', 'teams', 'skip'];

export type AgentRuntimeChoice = 'demo' | 'claude' | 'claude-aws';

export const AGENT_RUNTIME_CHOICES: readonly AgentRuntimeChoice[] = ['demo', 'claude', 'claude-aws'];

export type CustomCodeConnectMode = 'ai-sdk' | 'langchain' | 'custom-code';

export const CUSTOM_CODE_CONNECT_MODES: readonly CustomCodeConnectMode[] = ['ai-sdk', 'langchain', 'custom-code'];

export type BridgeConnectMode = CustomCodeConnectMode | 'chat-sdk';

export const BRIDGE_CONNECT_MODES: readonly BridgeConnectMode[] = [...CUSTOM_CODE_CONNECT_MODES, 'chat-sdk'];

/** Unified agent setup mode — managed runtimes plus self-hosted bridge agents. */
export type AgentConnectMode = AgentRuntimeChoice | BridgeConnectMode;

export const AGENT_CONNECT_MODES: readonly AgentConnectMode[] = [
  ...AGENT_RUNTIME_CHOICES,
  ...BRIDGE_CONNECT_MODES,
];

export function isBridgeConnectMode(mode: AgentConnectMode): mode is BridgeConnectMode {
  return (BRIDGE_CONNECT_MODES as readonly string[]).includes(mode);
}

export function isCustomCodeScaffoldMode(mode: AgentConnectMode): mode is CustomCodeConnectMode {
  return (CUSTOM_CODE_CONNECT_MODES as readonly string[]).includes(mode);
}

export type ChatSdkProjectKind = 'empty' | 'project';

export type ChatSdkRequirementId = 'package' | 'env' | 'dev-script' | 'code-wiring';

export type ChatSdkReqStatus = 'ok' | 'autofixable' | 'manual';

export type ChatSdkRequirement = {
  id: ChatSdkRequirementId;
  status: ChatSdkReqStatus;
  detail: string;
};

export type ChatSdkConnectOutcome = {
  projectKind: ChatSdkProjectKind;
  projectDir: string;
  scaffolded: boolean;
  envPaths?: string[];
  /** True when npm install was skipped (e.g. scaffolding inside a monorepo). */
  skippedInstall?: boolean;
  requirements?: ChatSdkRequirement[];
  /** Absolute path to a requirements summary file (CI / logging handoff). */
  requirementsFile?: string;
  /** package + env + dev-script satisfied after reconcile. */
  coreReady?: boolean;
  /** User accepted starting the dev tunnel at the end of connect. */
  tunnelAccepted?: boolean;
  /** Instructions for manual code wiring when adapter is not wired in source. */
  wiringInstructions?: string;
};

export type CustomCodeConnectOutcome = {
  projectDir: string;
  scaffolded: boolean;
  skippedInstall?: boolean;
  agentFilePath?: string;
};

export interface ConnectCommandOptions {
  secretKey?: string;
  region: CloudRegionEnum;
  apiUrl: string;
  dashboardUrl: string;
  /** Browser-auth UI for `novu connect` (e.g. dashboard.novu.co). Defaults to `dashboardUrl` per region. */
  connectDashboardUrl: string;
  /** Pre-fill the agent description, skipping the input screen. Enables non-interactive runs. */
  prompt?: string;
  /**
   * Agent connect mode: managed runtimes (`demo`, `claude`, `claude-aws`) or bridge agents
   * (`ai-sdk`, `langchain`, `custom-code`, `chat-sdk`). `demo` uses Novu's demo Claude integration (default).
   */
  runtime?: AgentConnectMode;
  /** Use an existing agent-runtime integration instead of creating one. */
  agentIntegrationId?: string;
  /** Anthropic API key for `--runtime claude` non-interactive runs. */
  anthropicApiKey?: string;
  /** AWS Claude API key for `--runtime claude-aws` non-interactive runs. */
  awsClaudeApiKey?: string;
  /** AWS Claude region for `--runtime claude-aws` non-interactive runs. */
  awsClaudeRegion?: string;
  /** AWS Claude workspace ID for `--runtime claude-aws` non-interactive runs. */
  awsClaudeWorkspaceId?: string;
  /** Pre-select the channel to connect, skipping the picker. Currently only `slack` is implemented. */
  channel?: ChannelChoice;
  /**
   * @deprecated Pass `--channel none` (or just skip the picker) instead. Kept so existing
   * scripts don't break; treated as `channel === 'none'`.
   */
  skipSlack?: boolean;
  /** Pre-fill the Slack App Configuration Token, skipping the paste screen. */
  slackConfigToken?: string;
  /**
   * Telegram bot token from @BotFather (`123456:ABC-…`). When provided, the CLI
   * saves it on the integration directly, skipping the dashboard mobile-link
   * handoff (which keyless users cannot access).
   */
  telegramBotToken?: string;
  /** Force the non-interactive logging UI (no Ink TUI). Used in CI / piped-stdin shells. */
  ci?: boolean;
  /** Use a temporary keyless workspace instead of dashboard OAuth (the default). */
  keyless?: boolean;
  /**
   * Agent connect mode. Managed values (`demo`, `claude`, `claude-aws`) use Novu's AI runtime;
   * `chat-sdk` provisions a self-hosted bridge agent backed by your Chat SDK app.
   * @deprecated Prefer `--runtime chat-sdk` or selecting Chat SDK in the connect-mode picker.
   */
  brain?: 'chat-sdk';
  /** Shorthand for `--runtime chat-sdk`. */
  chatSdk?: boolean;
  /** Project directory to inspect for an existing Chat SDK app (defaults to cwd). */
  projectDir?: string;
  /** When scaffolding into a non-empty parent, use this subdirectory name. */
  scaffoldDir?: string;
  /** Skip scaffolding even when the target directory is empty. */
  noScaffold?: boolean;
}

export interface AgentSummary {
  id: string;
  identifier: string;
  name: string;
}

export interface ConnectFlowResult {
  agent: AgentSummary;
  flow: 'created' | 'reused';
  slackConnected: boolean;
}
