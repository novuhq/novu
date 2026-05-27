import type { AgentSummary, ChannelChoice } from '../types';

export type PickResult = { action: 'new' } | { action: 'use'; agent: AgentSummary };

export interface ConnectUI {
  // Welcome screen
  /**
   * First screen the user sees. Renders a welcome message and waits for the
   * user to hit Enter before resolving — this is the explicit consent gate
   * for opening the browser to authorize the CLI. The Ink implementation
   * delays the visible text until after the orb's entry animation finishes
   * so the welcome lands on a fully-formed orb instead of mid-grow.
   */
  showWelcome(): Promise<void>;

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

  // Channel selection
  pickChannel(): Promise<ChannelChoice>;
  /** Render a "coming soon" message for a channel that isn't wired up yet. */
  channelComingSoon(choice: ChannelChoice): void;

  // Email path
  addingEmailIntegration(): void;
  /**
   * Shows the inbound address + waits for the user to hit Enter. The
   * pipeline runs `open(mailtoUrl)` only after this resolves, so the mail
   * client never pops up without explicit user consent (some terminals /
   * sandboxes block silent `open()` anyway).
   */
  awaitEmailOpen(opts: { inboundAddress: string; mailtoUrl: string }): Promise<void>;
  /**
   * Transitions to the "we're polling for your email to arrive" view. Fired
   * by the pipeline right after `open()` returns.
   */
  showEmailWaiting(opts: { inboundAddress: string }): void;
  emailConnected(): void;

  // Telegram path
  addingTelegramIntegration(): void;
  /**
   * Step 1: walk the user through creating a bot with @BotFather. Renders a
   * scannable QR pointing at `t.me/botfather`. Resolves when the user hits
   * Enter to advance.
   */
  showTelegramIntro(opts: { botfatherQr: string }): Promise<void>;
  /**
   * Step 2: render the mobile-link QR. Fire-and-forget — the pipeline owns
   * the polling loop and transitions away from this phase when the bot token
   * lands on the integration.
   */
  showTelegramLinkToken(opts: { mobileQr: string; mobileUrl: string }): void;
  /**
   * Step 3: render the `t.me/<bot>?start=<code>` deep-link QR. Pipeline polls
   * the agent's Telegram integration link for `connectedAt`.
   */
  showTelegramTest(opts: { deepLinkQr: string; deepLinkUrl: string; botUsername: string }): void;
  telegramConnected(): void;

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
  success(result: {
    agent: AgentSummary;
    dashboardUrl: string;
    environmentSlug: string | null;
    connectedChannel: ChannelChoice | null;
  }): void;
  failure(message: string): void;

  /** Tear down (Ink unmount) and return the final exit code. */
  shutdown(): Promise<number>;
}
