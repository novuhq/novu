import type { CloudRegionEnum } from '../dev/enums';

export type ChannelChoice = 'slack' | 'email' | 'whatsapp' | 'telegram' | 'teams' | 'skip';

export const CHANNEL_CHOICES: readonly ChannelChoice[] = ['slack', 'email', 'whatsapp', 'telegram', 'teams', 'skip'];

export type AgentRuntimeChoice = 'demo' | 'claude' | 'claude-aws';

export const AGENT_RUNTIME_CHOICES: readonly AgentRuntimeChoice[] = ['demo', 'claude', 'claude-aws'];

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
   * Agent runtime for new agents. `demo` uses Novu's demo Claude integration (default).
   * `claude` and `claude-aws` require your own credentials unless an integration already exists.
   */
  runtime?: AgentRuntimeChoice;
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
