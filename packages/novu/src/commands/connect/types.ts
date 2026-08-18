import type { CloudRegionEnum } from '../dev/enums';
import type { LlmAuthCliChoice } from './pipeline/llm-auth/types';

export type ChannelChoice = 'slack' | 'email' | 'whatsapp' | 'telegram' | 'teams' | 'sendblue' | 'agent-chat' | 'skip';

export const CHANNEL_CHOICES: readonly ChannelChoice[] = [
  'slack',
  'email',
  'whatsapp',
  'telegram',
  'teams',
  'sendblue',
  'agent-chat',
  'skip',
];

export type AgentChatSetupMode = 'scaffold' | 'embed' | 'skip';

export type AgentRuntimeChoice = 'demo' | 'claude' | 'claude-aws';

export const AGENT_RUNTIME_CHOICES: readonly AgentRuntimeChoice[] = ['demo', 'claude', 'claude-aws'];

export type CustomCodeConnectMode = 'ai-sdk' | 'langchain' | 'custom-code';

export const CUSTOM_CODE_CONNECT_MODES: readonly CustomCodeConnectMode[] = ['ai-sdk', 'langchain', 'custom-code'];

export type BridgeConnectMode = CustomCodeConnectMode | 'chat-sdk';

export const BRIDGE_CONNECT_MODES: readonly BridgeConnectMode[] = [...CUSTOM_CODE_CONNECT_MODES, 'chat-sdk'];

/** Unified agent setup mode — managed runtimes plus self-hosted bridge agents. */
export type AgentConnectMode = AgentRuntimeChoice | BridgeConnectMode;

export const AGENT_CONNECT_MODES: readonly AgentConnectMode[] = [...AGENT_RUNTIME_CHOICES, ...BRIDGE_CONNECT_MODES];

export function isBridgeConnectMode(mode: AgentConnectMode): mode is BridgeConnectMode {
  return (BRIDGE_CONNECT_MODES as readonly string[]).includes(mode);
}

export function isCustomCodeScaffoldMode(mode: AgentConnectMode): mode is CustomCodeConnectMode {
  return (CUSTOM_CODE_CONNECT_MODES as readonly string[]).includes(mode);
}

export function isAiSdkConnectMode(mode: AgentConnectMode): mode is 'ai-sdk' {
  return mode === 'ai-sdk';
}

export function isLangChainConnectMode(mode: AgentConnectMode): mode is 'langchain' {
  return mode === 'langchain';
}

export function isVanillaCustomCodeConnectMode(mode: AgentConnectMode): mode is 'custom-code' {
  return mode === 'custom-code';
}

export type BridgeProjectKind = 'empty' | 'project';

export type BridgeRequirementId = 'package' | 'env' | 'dev-script' | 'code-wiring' | 'provider-env';

export type BridgeReqStatus = 'ok' | 'autofixable' | 'manual';

export type BridgeRequirement = {
  id: BridgeRequirementId;
  status: BridgeReqStatus;
  detail: string;
};

export type AgentChatConnectOutcome = {
  mode: AgentChatSetupMode;
  projectDir?: string;
  scaffolded?: boolean;
  mergedIntoBridge?: boolean;
};

export type ConnectAgentChatHandoff = {
  dashboardUrl: string;
  embedPrompt: string;
  embedPromptFile?: string;
};

export type ChatSdkConnectOutcome = {
  projectKind: BridgeProjectKind;
  projectDir: string;
  scaffolded: boolean;
  envPaths?: string[];
  /** True when npm install was skipped (e.g. scaffolding inside a monorepo). */
  skippedInstall?: boolean;
  requirements?: BridgeRequirement[];
  /** Absolute path to a requirements summary file (CI / logging handoff). */
  requirementsFile?: string;
  /** package + env + dev-script satisfied after reconcile. */
  coreReady?: boolean;
  /** User accepted starting the dev tunnel at the end of connect. */
  tunnelAccepted?: boolean;
  /** Instructions for manual code wiring when adapter is not wired in source. */
  wiringInstructions?: string;
};

export type AiSdkConnectOutcome = {
  projectKind: BridgeProjectKind;
  projectDir: string;
  scaffolded: boolean;
  envPaths?: string[];
  skippedInstall?: boolean;
  requirements?: BridgeRequirement[];
  requirementsFile?: string;
  coreReady?: boolean;
  tunnelAccepted?: boolean;
  wiringInstructions?: string;
  agentFilePath?: string;
};

/** LangChain bridge setup shares the AI SDK outcome shape (same reconcile engine). */
export type LangChainConnectOutcome = AiSdkConnectOutcome;

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
  /** Sendblue API Key (from dashboard.sendblue.com/settings/api). CI-only escape hatch — omit to enter interactively. */
  sendblueApiKey?: string;
  /** Sendblue Secret Key. CI-only escape hatch — omit to enter interactively. */
  sendblueSecretKey?: string;
  /** Sendblue phone number in E.164 (e.g. +14155551234). CI-only escape hatch — omit to enter interactively. */
  sendblueFrom?: string;
  /** Recipient phone (E.164) for the Sendblue test message. CI-only escape hatch — omit to enter interactively. */
  sendblueTestPhone?: string;
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
  /**
   * LLM provider for ai-sdk / langchain fresh scaffolds only.
   * openai | anthropic | codex-subscription | claude-subscription | skip
   */
  llmAuth?: LlmAuthCliChoice;
  /** OpenAI API key for --llm-auth openai non-interactive scaffold runs. */
  openaiApiKey?: string;
  /** Agent Chat post-connect setup for --ci: scaffold | embed | skip (auto-detect when omitted). */
  agentChatSetup?: AgentChatSetupMode;
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
