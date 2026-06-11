import type { GeneratedAgentSpec } from '../api/agents';
import type { AgentRuntimeChoice, AgentSummary, ChannelChoice } from '../types';

export type PickResult = { action: 'new' } | { action: 'use'; agent: AgentSummary };

export type GeneratedAgentPreviewResult = { action: 'confirm'; spec: GeneratedAgentSpec } | { action: 'refine' };

export type PickAgentIntegrationResult = { kind: 'existing'; integrationId: string } | { kind: 'new' };

export interface ConnectUI {
  // Welcome screen
  /**
   * First screen the user sees. Renders a welcome message and waits for the
   * user to hit Enter before resolving — this is the explicit consent gate
   * before the connect pipeline starts. The Ink implementation
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

  // Agent runtime / credentials (new-agent path)
  pickAgentRuntime(opts: { preselected?: AgentRuntimeChoice }): Promise<AgentRuntimeChoice>;
  pickAgentIntegration(opts: {
    providerLabel: string;
    integrations: Array<{ _id: string; name: string; identifier: string }>;
  }): Promise<PickAgentIntegrationResult>;
  promptForSecretInput(opts: {
    title: string;
    placeholder: string;
    hint?: string;
    secret?: boolean;
    /** Shown when re-prompting after credential verification failed. */
    verificationError?: string;
  }): Promise<string>;
  pickAwsClaudeRegion(): Promise<string>;
  verifyingCredentials(): void;
  credentialsVerified(): void;

  // Create-new path
  promptForDescription(defaultPrompt?: string): Promise<string>;
  /**
   * Re-prompt for the agent description after the user chooses to refine a
   * generated preview. Shows the previous prompt for context.
   */
  refineDescription(previousPrompt: string): Promise<string>;
  generatingAgent(): void;
  /**
   * Preview and optionally edit the AI-generated agent spec before provisioning.
   * Resolves with the confirmed spec or a request to refine the source description.
   */
  previewGeneratedAgent(spec: GeneratedAgentSpec): Promise<GeneratedAgentPreviewResult>;
  creatingAgent(name: string): void;
  agentCreated(agent: AgentSummary): void;

  // Channel selection
  pickChannel(): Promise<ChannelChoice>;
  /**
   * Unsupported-in-CLI channels open the Connect dashboard agent page so the
   * user can finish setup there. Resolves when the user hits Enter — the
   * pipeline then runs `open(agentDetailsUrl)`.
   */
  awaitDashboardChannelOpen(opts: { channel: ChannelChoice; agentDetailsUrl: string }): Promise<void>;

  // Email path
  addingEmailIntegration(): void;
  /**
   * Shows the inbound address + waits for the user to hit Enter. The
   * pipeline runs `open(mailtoUrl)` only after this resolves, so the mail
   * client never pops up without explicit user consent (some terminals /
   * sandboxes block silent `open()` anyway).
   */
  awaitEmailOpen(opts: {
    inboundAddress: string;
    mailtoUrl: string;
    sendFromEmail?: string;
    canGoBack?: boolean;
  }): Promise<void>;
  /**
   * Transitions to the "we're polling for your email to arrive" view. Fired
   * by the pipeline right after `open()` returns.
   */
  showEmailWaiting(opts: { inboundAddress: string; sendFromEmail?: string }): void;
  emailConnected(): void;

  // Telegram path
  addingTelegramIntegration(): void;
  /**
   * Step 1: walk the user through creating a bot with @BotFather. Renders a
   * scannable QR pointing at `t.me/botfather`. Resolves when the user hits
   * Enter to advance.
   */
  showTelegramIntro(opts: { botfatherQr: string; botfatherUrl: string }): Promise<void>;
  /**
   * Render the signed mobile-link QR. Fire-and-forget — the pipeline owns
   * the polling loop and transitions away from this phase when the bot token
   * lands on the integration.
   */
  showTelegramLinkToken(opts: { mobileQr: string; mobileUrl: string }): void;
  /**
   * Alternative to steps 1–2: the bot token was supplied up front via
   * `--telegram-bot-token`, so the CLI saves it directly instead of waiting
   * for the mobile-link page. Renders a short progress state.
   */
  savingTelegramBotToken(): void;
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
   *
   * @deprecated Prefer {@link showSlackSetupLink} — the secure setup page keeps
   * tokens out of the terminal and agent chat.
   */
  promptForSlackConfigToken(opts: { retry: boolean }): Promise<string>;
  /**
   * Show the signed Slack setup-link URL. Fire-and-forget — the pipeline
   * polls until the user pastes their config token on the secure page.
   */
  showSlackSetupLink(opts: { setupUrl: string }): void;
  runningSlackQuickSetup(): void;
  /**
   * Consent gate before opening Slack OAuth. When `appCreated` is true, confirms
   * the manifest quick-setup succeeded before asking the user to install the app
   * in their workspace. Resolves when the user hits Enter — the pipeline then
   * runs `open()`.
   */
  awaitSlackOAuthOpen(opts: { authorizeUrl: string; appCreated: boolean }): Promise<void>;
  /**
   * Transitions to the polling view. Fired by the pipeline right after `open()`.
   */
  showSlackWaiting(opts: { authorizeUrl: string }): void;
  slackConnected(): void;
  slackSkipped(): void;

  // Welcome message
  sendingWelcome(): void;

  // Outcome
  success(result: {
    agent: AgentSummary;
    dashboardUrl: string;
    connectDashboardUrl: string;
    environmentSlug: string | null;
    connectedChannel: ChannelChoice | null;
    dashboardRedirectChannel: ChannelChoice | null;
  }): void;
  failure(message: string): void;

  /** Tear down (Ink unmount) and return the final exit code. */
  shutdown(): Promise<number>;
}
