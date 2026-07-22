import type { GeneratedAgentSpec } from '../api/agents';
import type { BridgeScaffoldVariant } from '../pipeline/bridge/types';
import type { BridgeAdapterVariant } from '../pipeline/bridge-adapter/types';
import type { LlmAuthKind } from '../pipeline/llm-auth/types';
import type {
  AgentConnectMode,
  AgentSummary,
  AiSdkConnectOutcome,
  BridgeRequirement,
  ChannelChoice,
  ChatSdkConnectOutcome,
  CustomCodeConnectOutcome,
  LangChainConnectOutcome,
} from '../types';
import type { BridgeReconcileVariant } from './bridge-reconcile-variant';

export type PickResult = { action: 'new' } | { action: 'use'; agent: AgentSummary };

export type GeneratedAgentPreviewResult = { action: 'confirm'; spec: GeneratedAgentSpec } | { action: 'refine' };

export type PickAgentIntegrationResult = { kind: 'existing'; integrationId: string } | { kind: 'new' };

export type TelegramTokenDelivery = 'setup-page' | 'terminal';

export type BridgeTunnelOfferResult = 'accept' | 'skip';

export interface ConnectUI {
  /** True when running the Ink TUI; false for CI / non-TTY logging mode. */
  readonly interactive: boolean;
  /** Unmount Ink before long subprocesses. No-op in logging mode. */
  releaseTerminal(): Promise<void>;
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

  // Agent connect mode (managed runtime or Chat SDK)
  pickAgentConnectMode(opts: { preselected?: AgentConnectMode }): Promise<AgentConnectMode>;
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

  // Chat SDK project wiring
  promptForAgentName(defaultName: string): Promise<string>;
  confirmEnvSecretOverwrite(opts: { envPath: string; existingMasked: string; nextMasked: string }): Promise<boolean>;
  pickLlmAuthKind(opts: { connectMode: BridgeAdapterVariant }): Promise<LlmAuthKind>;
  confirmScaffold(opts: { projectDir: string; appName: string; variant?: BridgeScaffoldVariant }): Promise<boolean>;
  scaffoldingBridge(opts: { variant: BridgeScaffoldVariant }): void;
  bridgeScaffolded(opts: {
    variant: BridgeScaffoldVariant;
    projectDir: string;
    skippedInstall?: boolean;
    envPaths?: string[];
    agentFilePath?: string;
  }): void;
  confirmInstallBridgeDeps(opts: {
    projectDir: string;
    installCommand: string;
    packages: string[];
    variant?: BridgeReconcileVariant;
  }): Promise<boolean>;
  installingBridgeDeps(variant?: BridgeReconcileVariant): void;
  showBridgeReconcilePlan(opts: {
    projectDir: string;
    requirements: BridgeRequirement[];
    envPaths: string[];
    wiringInstructions?: string;
    requirementsFile?: string;
    agentPrompt?: string;
    variant?: BridgeReconcileVariant;
  }): Promise<void>;
  offerBridgeTunnel(opts: { projectDir: string; devCommand: string }): Promise<BridgeTunnelOfferResult>;

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
  /** Interactive only: choose between the QR/setup page or pasting the token in the terminal. */
  pickTelegramTokenDelivery(): Promise<TelegramTokenDelivery>;
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

  // Sendblue (iMessage) path
  addingSendblueIntegration(): void;
  /**
   * Intro screen before collecting credentials: links to the Sendblue API
   * settings page and notes a Sendblue account is required. Resolves when the
   * user hits Enter.
   */
  showSendblueIntro(opts: { dashboardUrl: string }): Promise<void>;
  /**
   * Prompt for one Sendblue credential (API Key → Secret Key → phone number).
   * Each call is its own phase so the input renders empty for every step. The
   * Sendblue dashboard link is shown alongside every prompt.
   */
  promptForSendblueCredential(opts: {
    field: 'apiKey' | 'secretKey' | 'from';
    step: number;
    total: number;
    title: string;
    hint: string;
    placeholder: string;
    dashboardUrl: string;
    secret?: boolean;
    verificationError?: string;
  }): Promise<string>;
  configuringSendblueWebhook(): void;
  /**
   * Shown when Sendblue rejects auto webhook registration: surfaces the callback
   * URL + signing secret for manual setup in the Sendblue dashboard. Resolves
   * when the user hits Enter.
   */
  showSendblueWebhookManualFallback(opts: { callbackUrl: string; webhookSecret?: string }): Promise<void>;
  /**
   * Prompt for the recipient phone (E.164) for the test message. Pre-fills with
   * the subscriber's saved phone when available, and offers a "message the bot"
   * iMessage link.
   */
  promptForSendblueTestPhone(opts: {
    defaultPhone?: string;
    fromNumber: string;
    imessageUrl: string;
    verificationError?: string;
  }): Promise<string>;
  sendingSendblueTestMessage(): void;
  /**
   * Transitions to the "we're waiting for your first inbound iMessage" view.
   * Renders the "message the bot" iMessage link. Fired right after the test
   * message is sent; the pipeline then polls for the inbound connection.
   */
  showSendblueTestWaiting(opts: { phone: string; fromNumber: string; imessageUrl: string }): void;
  sendblueConnected(): void;

  // WhatsApp path (Meta Embedded Signup via the dashboard signup page)
  addingWhatsAppIntegration(): void;
  /**
   * Consent gate before opening the dashboard Embedded Signup page. Resolves
   * when the user hits Enter — the pipeline then runs `open(signupUrl)`.
   * Non-interactive mode logs a machine-readable URL and resolves immediately.
   */
  awaitWhatsAppSignupOpen(opts: { signupUrl: string }): Promise<void>;
  /** Transitions to the stage-1 polling view (waiting for Embedded Signup to save credentials). */
  showWhatsAppSignupWaiting(opts: { signupUrl: string }): void;
  /**
   * Stage 2: prompt the user to message their business number on WhatsApp
   * (wa.me deep link when the display phone number is known). The pipeline
   * polls the agent-integration link for `connectedAt`.
   */
  showWhatsAppTest(opts: { waMeUrl?: string; waMeQr?: string; displayPhoneNumber?: string }): void;
  whatsappConnected(): void;

  // Slack path
  addingSlackIntegration(): void;
  /**
   * Ask the user to paste a Slack App Configuration Token (xoxe.xoxp-…)
   * because the chosen Slack integration has no OAuth client credentials
   * configured yet. `retry` is true when this prompt is following an earlier
   * failed quick-setup (so the UI can hint at the cause).
   */
  promptForSlackConfigToken(opts: { retry: boolean; verificationError?: string }): Promise<string>;
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
    isKeyless: boolean;
    claimUrl: string | null;
    connectMode?: AgentConnectMode;
    chatSdkOutcome?: ChatSdkConnectOutcome;
    aiSdkOutcome?: AiSdkConnectOutcome;
    langChainOutcome?: LangChainConnectOutcome;
    customCodeOutcome?: CustomCodeConnectOutcome;
  }): void;
  failure(message: string): void;

  /** Tear down (Ink unmount) and return the final exit code. */
  shutdown(): Promise<number>;
}
