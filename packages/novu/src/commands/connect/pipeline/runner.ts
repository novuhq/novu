import open from 'open';
import QRCode from 'qrcode';
import { resolveAuth } from '../../wizard/auth/resolve-auth';
import type { ResolvedAuth, WizardCommandOptions } from '../../wizard/types';
import { CONNECT_EVENTS, trackConnect } from '../analytics/events';
import {
  type AgentIntegrationLink,
  type AgentRecord,
  addAgentIntegration,
  configureTelegramAgentWebhook,
  createManagedAgent,
  generateAgent,
  getTelegramMobileLinkStatus,
  issueTelegramMobileLink,
  issueTelegramSubscriberLink,
  listAgentIntegrations,
  listAgents,
  sendAgentWelcomeMessage,
} from '../api/agents';
import { type ConnectApiClient, createConnectApiClient, NovuApiError } from '../api/client';
import {
  countChannelConnectionsForIntegration,
  createSlackIntegration,
  createTelegramIntegration,
  generateConnectOauthUrl,
  type IntegrationRecord,
  listIntegrations,
  slackQuickSetup,
} from '../api/integrations';
import { upsertSubscriber } from '../api/subscribers';
import type { AgentSummary, ChannelChoice, ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';

const SLACK_POLL_INTERVAL_MS = 2_000;
const SLACK_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const TELEGRAM_POLL_INTERVAL_MS = 2_000;
const TELEGRAM_POLL_TIMEOUT_MS = 5 * 60 * 1000;
const BOTFATHER_URL = 'https://t.me/botfather';

// Provider identifiers — the source of truth lives in @novu/shared, but we
// duplicate the string literals here so the CLI does not gain a transitive
// dependency on the API-internal enums.
const NOVU_ANTHROPIC_PROVIDER_ID = 'novu-anthropic';
const SLACK_PROVIDER_ID = 'slack';
const TELEGRAM_PROVIDER_ID = 'telegram';
const TELEGRAM_CHANNEL = 'chat';
const AGENT_INTEGRATION_KIND = 'agent';

export interface ConnectPipelineInput {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  onTrack?: (event: string, data?: Record<string, unknown>) => void;
}

export interface ConnectPipelineResult {
  exitCode: number;
}

export async function runConnectPipeline(input: ConnectPipelineInput): Promise<ConnectPipelineResult> {
  const { options, ui, onTrack } = input;
  const track = onTrack ?? (() => undefined);

  try {
    // 0. Welcome screen — explicit consent gate so we never auto-open the
    //    user's browser. The Ink implementation also waits for the orb's
    //    entry animation to finish before revealing the welcome text, so the
    //    user lands on a fully-formed orb instead of mid-grow.
    await ui.showWelcome();

    // 1. Authenticate via the browser device-auth flow (reused from wizard).
    ui.authStarted();
    const auth = await resolveAuth(toWizardAuthOptions(options), {
      onStatus: (m) => ui.authStatus(m),
      onDashboardUrl: (u) => ui.authDashboardUrl(u),
    });
    track(CONNECT_EVENTS.AUTH_COMPLETED, { source: auth.source, region: options.region });
    ui.authCompleted(auth.environmentName ?? null);

    const client = createConnectApiClient({ apiUrl: auth.apiUrl, secretKey: auth.secretKey });

    // 2. List existing agents to branch between "use existing" and "create new".
    ui.listingAgents();
    const existingAgents = await listAgents(client);
    track(CONNECT_EVENTS.AGENT_LISTED, { count: existingAgents.length });

    let agent: AgentSummary;
    let flow: 'created' | 'reused';

    if (existingAgents.length > 0 && !options.prompt) {
      const pick = await ui.pickExistingOrCreate(existingAgents.map(toSummary));
      if (pick.action === 'use') {
        agent = pick.agent;
        flow = 'reused';
        track(CONNECT_EVENTS.AGENT_REUSED, { identifier: agent.identifier });
      } else {
        agent = await createAgentFlow(client, ui, options);
        flow = 'created';
        track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier });
      }
    } else {
      agent = await createAgentFlow(client, ui, options);
      flow = 'created';
      track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier });
    }

    ui.agentCreated(agent);

    // 3. Channel connect step (unless skipped). The picker today surfaces
    // `slack` and `telegram` as live options; everything else routes to the
    // friendly `channelComingSoon` no-op so the agent still ends up created.
    let channelConnected = false;
    let connectedChannel: ChannelChoice | null = null;
    let connectedIntegration: IntegrationRecord | null = null;

    // Resolution precedence: `--skip-slack` (legacy alias) → `--channel` flag
    // → interactive picker → default `slack` in non-interactive mode.
    const channel: ChannelChoice = options.skipSlack ? 'skip' : (options.channel ?? (await ui.pickChannel()));

    switch (channel) {
      case 'skip':
        ui.slackSkipped();
        break;
      case 'slack': {
        // The Slack OAuth callback creates the SLACK_USER endpoint only when
        // it has a `subscriberId`. We need a real subscriber the API can
        // attach that endpoint to, otherwise welcome-message later finds
        // nothing to DM. Match the dashboard's convention: `connect:<userId>`.
        const subscriberId = await ensureSubscriberForUser(client, auth);
        const result = await connectSlackForAgent(
          client,
          agent,
          ui,
          options,
          auth.environmentId,
          subscriberId,
          track
        );
        connectedIntegration = result.integration;
        channelConnected = result.connected;
        if (channelConnected) connectedChannel = 'slack';
        break;
      }
      case 'telegram': {
        const subscriberId = await ensureSubscriberForUser(client, auth);
        const result = await connectTelegramForAgent(
          client,
          agent,
          ui,
          auth.environmentId,
          subscriberId,
          track
        );
        connectedIntegration = result.integration;
        channelConnected = result.connected;
        if (channelConnected) connectedChannel = 'telegram';
        break;
      }
      default:
        ui.channelComingSoon(channel);
        break;
    }

    // 4. Trigger the welcome DM so the user sees the agent come alive.
    if (channelConnected && connectedIntegration) {
      ui.sendingWelcome();
      try {
        await sendAgentWelcomeMessage(client, agent.identifier, connectedIntegration.identifier);
        track(CONNECT_EVENTS.WELCOME_SENT, { agent: agent.identifier });
      } catch (err) {
        // A failed welcome DM is not fatal — surface it but don't blow up the run.
        ui.failure(`Could not send the welcome message: ${describeError(err)}`);
      }
    }

    ui.success({
      agent,
      dashboardUrl: auth.dashboardUrl.replace(/\/$/, ''),
      environmentSlug: auth.environmentSlug ?? null,
      connectedChannel,
    });

    track(CONNECT_EVENTS.COMPLETED, { flow, channel: connectedChannel ?? channel });

    const exitCode = await ui.shutdown();

    return { exitCode };
  } catch (err) {
    const message = describeError(err);
    ui.failure(message);
    track(CONNECT_EVENTS.ERROR, { message });
    const exitCode = await ui.shutdown();

    return { exitCode: exitCode || 1 };
  }
}

async function createAgentFlow(
  client: ConnectApiClient,
  ui: ConnectUI,
  options: ConnectCommandOptions
): Promise<AgentSummary> {
  ui.loadingIntegrations();
  const integrations = await listIntegrations(client);
  const novuAnthropic = integrations.find(
    (i) => i.providerId === NOVU_ANTHROPIC_PROVIDER_ID && i.kind === AGENT_INTEGRATION_KIND && i.active !== false
  );

  if (!novuAnthropic) {
    throw new Error(
      "This environment doesn't have a Novu-managed Claude integration. " +
        'Set one up in the dashboard, then re-run `npx novu connect`.'
    );
  }

  const prompt = await ui.promptForDescription(options.prompt);
  if (prompt.trim().length < 8) {
    throw new Error('Agent description must be at least 8 characters.');
  }

  ui.generatingAgent();
  const generated = await generateAgent(client, prompt.trim());

  ui.creatingAgent(generated.name);
  const created = await createManagedAgent(client, {
    name: generated.name,
    identifier: generated.identifier,
    integrationId: novuAnthropic._id,
    providerId: NOVU_ANTHROPIC_PROVIDER_ID,
    systemPrompt: generated.systemPrompt,
    tools: generated.tools,
    mcpServers: generated.mcpServers,
    skills: generated.skills,
  });

  return toSummary(created);
}

/**
 * Wire Slack to the given agent.
 *
 * Each agent gets its OWN Slack integration so the Slack app's name/branding
 * matches the agent (otherwise the user sees "Allow Linear Manager to access
 * Slack" when installing for a brand-new "Support Bot" agent). The flow:
 *
 * 1. Check the agent's existing integrations.
 *    a. If a Slack link with `connectedAt` is present → reuse it, skip OAuth.
 *    b. If a Slack link exists but isn't connected → keep using it (could be
 *       a previous half-finished run on the same agent).
 *    c. Otherwise → create a fresh Slack integration named after the agent.
 *
 * 2. Ensure that integration is linked to the agent (idempotent).
 * 3. Try `generateConnectOauthUrl`. On the API's "missing credentials" 404,
 *    walk the user through the quick-setup paste-token flow, retry the URL.
 * 4. Open the install URL in the user's browser; poll until `connectedAt`
 *    appears on the agent integration link.
 */
async function connectSlackForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  environmentId: string,
  subscriberId: string,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{ connected: boolean; integration: IntegrationRecord }> {
  ui.addingSlackIntegration();

  const slackIntegration = await resolveSlackIntegrationForAgent(client, agent, environmentId);

  // Ensure the link exists. The agent integrations list we used to pick the
  // existing link may have been stale; the API rejects duplicate links with
  // 409, which we treat as a no-op.
  const links = await listAgentIntegrations(client, agent.identifier);
  const existingLink = links.find((l) => l.integrationIdentifier === slackIntegration.identifier);
  if (!existingLink) {
    try {
      await addAgentIntegration(client, agent.identifier, slackIntegration.identifier);
    } catch (err) {
      if (!(err instanceof NovuApiError) || err.status !== 409) throw err;
    }
  }

  // Snapshot the channel-connection count BEFORE opening the install URL. The
  // OAuth callback creates a new ChannelConnection record; the count goes up
  // by one when the user finishes. The agent_integration link's `connectedAt`
  // doesn't help here — it only flips on the first inbound webhook message.
  const baselineConnections = await countChannelConnectionsForIntegration(client, slackIntegration.identifier);
  if (baselineConnections > 0) {
    // Already had a Slack workspace connected (re-run on an existing setup).
    ui.slackConnected();
    track(CONNECT_EVENTS.SLACK_CONNECTED, { agent: agent.identifier, alreadyConnected: true });

    return { connected: true, integration: slackIntegration };
  }

  const authorizeUrl = await getAuthorizeUrlWithQuickSetupFallback(
    client,
    agent,
    slackIntegration,
    ui,
    options,
    subscriberId
  );
  track(CONNECT_EVENTS.SLACK_OAUTH_OPENED, { agent: agent.identifier });
  ui.showSlackOAuthUrl(authorizeUrl);

  // Best-effort browser open. If the user's OS won't open a browser they can
  // still copy the URL from the screen.
  void open(authorizeUrl).catch(() => undefined);

  ui.pollingForSlackConnection();
  const connected = await pollForSlackConnection(client, slackIntegration.identifier, baselineConnections);
  if (!connected) {
    throw new Error(
      `Slack OAuth was not completed within ${Math.round(SLACK_POLL_TIMEOUT_MS / 1000)} seconds. ` +
        'Re-run `npx novu connect` once you have authorized the Slack app.'
    );
  }

  ui.slackConnected();
  track(CONNECT_EVENTS.SLACK_CONNECTED, { agent: agent.identifier, alreadyConnected: false });

  return { connected: true, integration: slackIntegration };
}

/**
 * Pick the Slack integration for this agent. Reuses one already linked to the
 * agent if present; otherwise creates a fresh, agent-branded integration.
 *
 * We deliberately do NOT scan the environment for any unlinked Slack
 * integration and reuse it — that's what gave us the "Linear Manager" install
 * screen when connecting an unrelated agent. Slack credentials are inherently
 * per-app and per-agent in our model.
 */
async function resolveSlackIntegrationForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  environmentId: string
): Promise<IntegrationRecord> {
  const links = await listAgentIntegrations(client, agent.identifier);
  const alreadyLinkedSlack = links.find((l) => l.providerId === SLACK_PROVIDER_ID && l.active !== false);
  if (alreadyLinkedSlack) {
    // The link only carries the integration identifier; resolve to the full
    // integration record (we need `_id` for quick-setup).
    const integrations = await listIntegrations(client);
    const integration = integrations.find((i) => i.identifier === alreadyLinkedSlack.integrationIdentifier);
    if (integration) return integration;
    // Stale link with no matching integration — fall through to create a new one.
  }

  return createSlackIntegration(client, { name: agent.name, environmentId });
}

/**
 * Slack OAuth URL generation fails with `404 "Slack integration missing
 * credentials"` when the integration record has no clientId/clientSecret. The
 * dashboard recovers from this by walking the user through `slack-quick-setup`
 * (paste a Slack App Configuration Token → Novu provisions a fresh Slack app
 * via Slack's manifest API). This helper mirrors that recovery: try once, on
 * missing-credentials run the quick-setup, then try again.
 */
async function getAuthorizeUrlWithQuickSetupFallback(
  client: ConnectApiClient,
  agent: AgentSummary,
  slackIntegration: IntegrationRecord,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  subscriberId: string
): Promise<string> {
  const buildUrl = () =>
    generateConnectOauthUrl(client, {
      integrationIdentifier: slackIntegration.identifier,
      agentIdentifier: agent.identifier,
      subscriberId,
    });

  try {
    return await buildUrl();
  } catch (err) {
    if (!isMissingSlackCredentialsError(err)) throw err;

    await runSlackQuickSetup(client, agent, slackIntegration, ui, options, { retry: false });

    try {
      return await buildUrl();
    } catch (retryErr) {
      if (!isMissingSlackCredentialsError(retryErr)) throw retryErr;

      // The first quick-setup run somehow didn't take. Give the user one more
      // attempt with the dedicated "previous token rejected" prompt — useful
      // when Slack throws an obscure manifest validation error and the token
      // they pasted was actually fine but the manifest needs a retry.
      await runSlackQuickSetup(client, agent, slackIntegration, ui, options, { retry: true });

      return await buildUrl();
    }
  }
}

/**
 * Returns the subscriber id used to scope the Slack OAuth flow. Matches the
 * dashboard's convention (`connect:<userId>`) so a user running the CLI and
 * the dashboard ends up with the same subscriber rather than two parallel
 * records. Upserts the subscriber on every call so its name/email stay fresh.
 *
 * Falls back to an org-scoped id when the CLI auth path didn't yield a user
 * (e.g. `--secret-key` / `NOVU_SECRET_KEY`). Without a user we can't match the
 * dashboard subscriber, but we still need a stable id to attach the OAuth
 * channel endpoint to.
 */
async function ensureSubscriberForUser(client: ConnectApiClient, auth: ResolvedAuth): Promise<string> {
  if (auth.user?.id) {
    const subscriberId = `connect:${auth.user.id}`;
    await upsertSubscriber(client, {
      subscriberId,
      firstName: auth.user.firstName ?? undefined,
      lastName: auth.user.lastName ?? undefined,
      email: auth.user.email ?? undefined,
    });

    return subscriberId;
  }

  const fallback = `cli:${auth.organizationId ?? 'anonymous'}:${Date.now()}`;
  await upsertSubscriber(client, { subscriberId: fallback });

  return fallback;
}

async function runSlackQuickSetup(
  client: ConnectApiClient,
  agent: AgentSummary,
  slackIntegration: IntegrationRecord,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  flags: { retry: boolean }
): Promise<void> {
  const configToken = options.slackConfigToken?.trim()
    ? options.slackConfigToken.trim()
    : await ui.promptForSlackConfigToken({ retry: flags.retry });

  ui.runningSlackQuickSetup();
  await slackQuickSetup(client, slackIntegration._id, {
    configToken,
    agentId: agent.id,
  });
}

function isMissingSlackCredentialsError(err: unknown): boolean {
  if (!(err instanceof NovuApiError)) return false;
  if (err.status !== 404) return false;

  return /missing credentials/i.test(err.message);
}

async function pollForSlackConnection(
  client: ConnectApiClient,
  slackIntegrationIdentifier: string,
  baselineConnections: number
): Promise<boolean> {
  const deadline = Date.now() + SLACK_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const count = await countChannelConnectionsForIntegration(client, slackIntegrationIdentifier);
      if (count > baselineConnections) return true;
    } catch {
      // Transient failures during polling are non-fatal; keep trying until the deadline.
    }
    await sleep(SLACK_POLL_INTERVAL_MS);
  }

  return false;
}

// ---- Telegram -------------------------------------------------------------

/**
 * Wire Telegram to the given agent — mirrors `connectSlackForAgent` in shape
 * but the OAuth-equivalent here is a 3-step phone dance:
 *
 *  1. Walk the user through creating a bot in BotFather (no API call).
 *  2. Issue a short-lived mobile-link URL, render it as a QR, and poll the
 *     integration for `credentials.token` — set by the public mobile-consume
 *     endpoint once the user pastes the BotFather token on their phone. The
 *     consume endpoint also runs `configure-webhook` server-side, so we don't
 *     need to call configure ourselves after polling completes.
 *  3. Issue a subscriber-link deep link, render it as a QR, and poll the
 *     agent's Telegram integration link for `connectedAt` — set on first
 *     inbound webhook message, which is the `/start <code>` that Telegram
 *     sends when the user taps Start on the bot.
 *
 * Re-runs against an agent that already has a connected Telegram link
 * short-circuit straight to the welcome step.
 */
async function connectTelegramForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  ui: ConnectUI,
  environmentId: string,
  subscriberId: string,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<{ connected: boolean; integration: IntegrationRecord }> {
  ui.addingTelegramIntegration();

  const integration = await resolveTelegramIntegrationForAgent(client, agent, environmentId);

  const links = await listAgentIntegrations(client, agent.identifier);
  const existingLink = links.find((l) => l.integrationIdentifier === integration.identifier);
  if (!existingLink) {
    try {
      await addAgentIntegration(client, agent.identifier, integration.identifier);
    } catch (err) {
      if (!(err instanceof NovuApiError) || err.status !== 409) throw err;
    }
  } else if (existingLink.connectedAt) {
    ui.telegramConnected();
    track(CONNECT_EVENTS.SLACK_CONNECTED, {
      agent: agent.identifier,
      channel: 'telegram',
      alreadyConnected: true,
    });

    return { connected: true, integration };
  }

  // ---- Step 1: BotFather intro ----
  const botfatherQr = await renderQR(BOTFATHER_URL);
  await ui.showTelegramIntro({ botfatherQr });

  // ---- Step 2: mobile-link → poll the public status endpoint ----
  // ApiKey-authed callers can't see `credentials.token` on the integration
  // (it's stripped by canUserAccessCredentials for security), so we instead
  // poll the public mobile-link status endpoint: when the user pastes the
  // bot token on their phone, the server marks the JWT's jti as consumed,
  // and `reason: 'used'` is our completion signal.
  const mobileLink = await issueTelegramMobileLink(client, agent.identifier, integration._id, subscriberId);
  const mobileQr = await renderQR(mobileLink.url);
  ui.showTelegramLinkToken({ mobileQr, mobileUrl: mobileLink.url });

  const tokenSaved = await pollForTelegramTokenSaved(client, mobileLink.token);
  if (!tokenSaved) {
    throw new Error(
      `The bot token wasn't saved within ${Math.round(TELEGRAM_POLL_TIMEOUT_MS / 1000)} seconds. ` +
        'Re-run `npx novu connect` to get a fresh setup link.'
    );
  }

  // The mobile consume endpoint runs configure-webhook for us. As a defensive
  // fallback (in case the user pasted a token directly via some other path and
  // the webhook never got registered), trigger configure here and ignore the
  // 409/400 noise that an already-configured webhook would produce.
  try {
    await configureTelegramAgentWebhook(client, agent.identifier, integration._id);
  } catch (err) {
    if (err instanceof NovuApiError && (err.status === 400 || err.status === 409)) {
      // Already configured by the consume endpoint — fine.
    } else {
      throw err;
    }
  }

  // ---- Step 3: subscriber-link → poll for connectedAt ----
  const subscriberLink = await issueTelegramSubscriberLink(client, agent.identifier, integration._id, subscriberId);
  const deepLinkQr = await renderQR(subscriberLink.deepLinkUrl);
  ui.showTelegramTest({
    deepLinkQr,
    deepLinkUrl: subscriberLink.deepLinkUrl,
    botUsername: subscriberLink.botUsername,
  });

  const connected = await pollForTelegramConnected(client, agent.identifier, integration.identifier);
  if (!connected) {
    throw new Error(
      `We didn't see a /start message on @${subscriberLink.botUsername} within ` +
        `${Math.round(TELEGRAM_POLL_TIMEOUT_MS / 1000)} seconds. Re-run \`npx novu connect\` once you've ` +
        'opened the bot in Telegram and tapped Start.'
    );
  }

  ui.telegramConnected();
  track(CONNECT_EVENTS.SLACK_CONNECTED, {
    agent: agent.identifier,
    channel: 'telegram',
    alreadyConnected: false,
  });

  return { connected: true, integration };
}

/**
 * Pick the Telegram integration for this agent. Reuses one already linked to
 * the agent if present; otherwise creates a fresh, agent-branded integration.
 * Same isolation model as Slack: each agent gets its OWN Telegram bot so the
 * `@<botname>` shown in Telegram matches the agent.
 */
async function resolveTelegramIntegrationForAgent(
  client: ConnectApiClient,
  agent: AgentSummary,
  environmentId: string
): Promise<IntegrationRecord> {
  const links = await listAgentIntegrations(client, agent.identifier);
  const alreadyLinked = links.find(
    (l) => l.providerId === TELEGRAM_PROVIDER_ID && l.channel === TELEGRAM_CHANNEL && l.active !== false
  );
  if (alreadyLinked) {
    const integrations = await listIntegrations(client);
    const integration = integrations.find((i) => i.identifier === alreadyLinked.integrationIdentifier);
    if (integration) return integration;
    // Stale link with no matching integration — fall through and create new.
  }

  return createTelegramIntegration(client, { name: agent.name, environmentId });
}

/**
 * Poll the public mobile-link status endpoint. The JWT we issued in step 2
 * becomes `reason: 'used'` after the user's phone successfully POSTs the bot
 * token to the consume endpoint. `'expired'` means the 5-minute TTL elapsed
 * before the user finished — treat as timeout. `'invalid'` shouldn't happen
 * for a freshly-issued token; surface as timeout too.
 */
async function pollForTelegramTokenSaved(client: ConnectApiClient, mobileLinkToken: string): Promise<boolean> {
  const deadline = Date.now() + TELEGRAM_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const status = await getTelegramMobileLinkStatus(client, mobileLinkToken);
      if (!status.valid && status.reason === 'used') return true;
      if (!status.valid) return false;
    } catch {
      // transient — keep polling
    }
    await sleep(TELEGRAM_POLL_INTERVAL_MS);
  }

  return false;
}

async function pollForTelegramConnected(
  client: ConnectApiClient,
  agentIdentifier: string,
  telegramIntegrationIdentifier: string
): Promise<boolean> {
  const deadline = Date.now() + TELEGRAM_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const links = await listAgentIntegrations(client, agentIdentifier);
      const link = links.find((l) => l.integrationIdentifier === telegramIntegrationIdentifier);
      if (link?.connectedAt) return true;
    } catch {
      // transient — keep polling
    }
    await sleep(TELEGRAM_POLL_INTERVAL_MS);
  }

  return false;
}

/**
 * Half-block ASCII QR for terminal rendering.
 *
 * We tried denser glyph packings (quadrant blocks `▘▝▖▗`, braille `⠁⠂⠄`)
 * to shrink the QR's terminal footprint. Both worked visually but failed
 * to scan on phones:
 *
 * - Quadrant blocks make modules 2× taller than wide on standard 2:1
 *   terminal cells — phone scanners want square modules.
 * - Braille dots render with visible gaps between them in most terminal
 *   fonts, so "dark" QR cells aren't solid enough for scanners.
 *
 * Half-blocks (`▀ ▄ █`) fill cells solidly and give square modules (1
 * module = 1 char column wide × half a char row tall, which equals the
 * cell width on a 2:1 cell). They're what `qrcode-terminal` and similar
 * libraries use by default precisely because they scan reliably.
 *
 * The tradeoff is width: a Version-11 QR (the smallest that fits the
 * mobile-link's signed JWT at `L` error correction) is ~57 modules,
 * which renders as ~61 chars wide with our 2-module quiet zone. If
 * that's still too wide, the right fix is shortening the URL server-side
 * (e.g. swap the JWT for an opaque DB-resolved token), not denser glyphs.
 *
 * Defaults to `L` error correction (7%) because terminal display is
 * lossless — extra redundancy only adds modules without scan benefit.
 */
async function renderQR(text: string, errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'L'): Promise<string> {
  const qr = QRCode.create(text, { errorCorrectionLevel });
  const { data, size } = qr.modules;

  // Quiet zone — spec asks for 4 modules of margin; 2 is the practical
  // minimum that still scans on modern phone cameras and saves 4 chars of
  // width over the spec default.
  const QUIET = 2;
  const total = size + QUIET * 2;
  // Pad height to an even module count so half-block packing (2 modules
  // per terminal row) doesn't drop a ragged last row.
  const paddedH = total + (total % 2);

  const isDark = (col: number, row: number): boolean => {
    const c = col - QUIET;
    const r = row - QUIET;
    if (c < 0 || c >= size || r < 0 || r >= size) return false;

    return data[r * size + c] === 1;
  };

  const lines: string[] = [];
  for (let row = 0; row < paddedH; row += 2) {
    let line = '';
    for (let col = 0; col < total; col++) {
      const top = isDark(col, row);
      const bot = isDark(col, row + 1);
      if (top && bot) line += '█';
      else if (top) line += '▀';
      else if (bot) line += '▄';
      else line += ' ';
    }
    lines.push(line);
  }

  return lines.join('\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSummary(agent: AgentRecord | AgentSummary): AgentSummary {
  const id = '_id' in agent ? agent._id : agent.id;

  return { id, identifier: agent.identifier, name: agent.name };
}

function describeError(err: unknown): string {
  if (err instanceof NovuApiError) {
    return `${err.message} (${err.status} ${err.url})`;
  }
  if (err instanceof Error) return err.message;

  return String(err);
}

function toWizardAuthOptions(options: ConnectCommandOptions): WizardCommandOptions {
  // resolve-auth was built for the wizard; it only reads secretKey, apiUrl,
  // dashboardUrl, and region. Shim into its shape rather than duplicating the
  // browser-auth wiring.
  return {
    secretKey: options.secretKey,
    apiUrl: options.apiUrl,
    dashboardUrl: options.dashboardUrl,
    region: options.region,
    yes: false,
    ci: !!options.ci,
  };
}

// Re-export for the Ink UI to render the connected slack integration metadata
// if needed in future.
export type { AgentIntegrationLink };
