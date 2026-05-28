import type { CloudRegionEnum } from '../dev/enums';

export type ChannelChoice = 'slack' | 'email' | 'whatsapp' | 'telegram' | 'teams' | 'skip';

export const CHANNEL_CHOICES: readonly ChannelChoice[] = ['slack', 'email', 'whatsapp', 'telegram', 'teams', 'skip'];

export interface ConnectCommandOptions {
  secretKey?: string;
  region: CloudRegionEnum;
  apiUrl: string;
  dashboardUrl: string;
  /** Browser-auth UI for `novu connect` (e.g. connect.novu.co); distinct from `dashboardUrl`. */
  connectDashboardUrl: string;
  /** Pre-fill the agent description, skipping the input screen. Enables non-interactive runs. */
  prompt?: string;
  /** Pre-select the channel to connect, skipping the picker. Currently only `slack` is implemented. */
  channel?: ChannelChoice;
  /**
   * @deprecated Pass `--channel none` (or just skip the picker) instead. Kept so existing
   * scripts don't break; treated as `channel === 'none'`.
   */
  skipSlack?: boolean;
  /** Pre-fill the Slack App Configuration Token, skipping the paste screen. */
  slackConfigToken?: string;
  /** Force the non-interactive logging UI (no Ink TUI). Used in CI / piped-stdin shells. */
  ci?: boolean;
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
