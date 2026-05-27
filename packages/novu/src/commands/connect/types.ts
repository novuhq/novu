export interface ConnectCommandOptions {
  secretKey?: string;
  apiUrl: string;
  dashboardUrl: string;
  region: 'us' | 'eu' | 'local';
  /** Pre-fill the agent description, skipping the input screen. Enables non-interactive runs. */
  prompt?: string;
  /** Create the agent only — skip the Slack OAuth step. */
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
