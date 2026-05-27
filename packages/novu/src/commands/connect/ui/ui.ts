import type { AgentSummary } from '../types';

export type PickResult = { action: 'new' } | { action: 'use'; agent: AgentSummary };

export interface ConnectUI {
  // Auth phase
  authStarted(): void;
  authDashboardUrl(url: string | null): void;
  authStatus(message: string): void;
  authCompleted(envName: string | null): void;

  // Agents listing / branching
  listingAgents(): void;
  loadingIntegrations(): void;
  pickExistingOrCreate(agents: AgentSummary[]): Promise<PickResult>;

  // Create-new path
  promptForDescription(defaultPrompt?: string): Promise<string>;
  generatingAgent(): void;
  creatingAgent(name: string): void;
  agentCreated(agent: AgentSummary): void;

  // Slack path
  addingSlackIntegration(): void;
  /**
   * Ask the user to paste a Slack App Configuration Token (xoxe.xoxp-…)
   * because the chosen Slack integration has no OAuth client credentials
   * configured yet. `retry` is true when this prompt is following an earlier
   * failed quick-setup (so the UI can hint at the cause).
   */
  promptForSlackConfigToken(opts: { retry: boolean }): Promise<string>;
  runningSlackQuickSetup(): void;
  showSlackOAuthUrl(url: string): void;
  pollingForSlackConnection(): void;
  slackConnected(): void;
  slackSkipped(): void;

  // Welcome message
  sendingWelcome(): void;

  // Outcome
  success(result: { agent: AgentSummary; dashboardUrl: string; environmentSlug: string | null; slackConnected: boolean }): void;
  failure(message: string): void;

  /** Tear down (Ink unmount) and return the final exit code. */
  shutdown(): Promise<number>;
}
