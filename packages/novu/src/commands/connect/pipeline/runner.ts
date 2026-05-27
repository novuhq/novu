import open from 'open';
import { resolveAuth } from '../../wizard/auth/resolve-auth';
import type { ResolvedAuth, WizardCommandOptions } from '../../wizard/types';
import { CONNECT_EVENTS, trackConnect } from '../analytics/events';
import {
  type AgentIntegrationLink,
  type AgentRecord,
  addAgentIntegration,
  createManagedAgent,
  generateAgent,
  listAgentIntegrations,
  listAgents,
  sendAgentWelcomeMessage,
} from '../api/agents';
import { type ConnectApiClient, createConnectApiClient, NovuApiError } from '../api/client';
import { generateConnectOauthUrl, type IntegrationRecord, listIntegrations } from '../api/integrations';
import type { AgentSummary, ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';

const SLACK_POLL_INTERVAL_MS = 2_000;
const SLACK_POLL_TIMEOUT_MS = 5 * 60 * 1000;

// Provider identifiers — the source of truth lives in @novu/shared, but we
// duplicate the string literals here so the CLI does not gain a transitive
// dependency on the API-internal enums.
const NOVU_ANTHROPIC_PROVIDER_ID = 'novu-anthropic';
const NOVU_SLACK_PROVIDER_ID = 'novu';
const SLACK_CHANNEL = 'chat';
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

    // 3. Slack connect step (unless skipped).
    let slackConnected = false;
    let slackIntegration: IntegrationRecord | null = null;

    if (options.skipSlack) {
      ui.slackSkipped();
    } else {
      slackIntegration = await locateSlackIntegration(client);
      slackConnected = await connectSlack(client, agent, slackIntegration, ui, track);
    }

    // 4. Trigger the welcome DM so the user sees the agent come alive.
    if (slackConnected && slackIntegration) {
      ui.sendingWelcome();
      try {
        await sendAgentWelcomeMessage(client, agent.identifier, slackIntegration.identifier);
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
      slackConnected,
    });

    track(CONNECT_EVENTS.COMPLETED, { flow, slackConnected });

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

async function locateSlackIntegration(client: ConnectApiClient): Promise<IntegrationRecord> {
  const integrations = await listIntegrations(client);
  const slack = integrations.find(
    (i) => i.providerId === NOVU_SLACK_PROVIDER_ID && i.channel === SLACK_CHANNEL && i.active !== false
  );
  if (!slack) {
    throw new Error(
      "This environment doesn't have a Novu-managed Slack integration. " +
        'Set one up in the dashboard, then re-run `npx novu connect`.'
    );
  }

  return slack;
}

async function connectSlack(
  client: ConnectApiClient,
  agent: AgentSummary,
  slackIntegration: IntegrationRecord,
  ui: ConnectUI,
  track: (event: string, data?: Record<string, unknown>) => void
): Promise<boolean> {
  ui.addingSlackIntegration();

  // Idempotency: if the agent already has a link to this Slack integration we
  // skip re-creating it (the API rejects duplicates).
  const existingLinks = await listAgentIntegrations(client, agent.identifier);
  const alreadyLinked = existingLinks.find((l) => l.integrationIdentifier === slackIntegration.identifier);
  if (!alreadyLinked) {
    try {
      await addAgentIntegration(client, agent.identifier, slackIntegration.identifier);
    } catch (err) {
      if (err instanceof NovuApiError && err.status === 409) {
        // Race-condition: link was created between list and add. Ignore.
      } else {
        throw err;
      }
    }
  }

  if (alreadyLinked?.connectedAt) {
    ui.slackConnected();
    track(CONNECT_EVENTS.SLACK_CONNECTED, { agent: agent.identifier, alreadyConnected: true });

    return true;
  }

  const authorizeUrl = await generateConnectOauthUrl(client, slackIntegration.identifier);
  track(CONNECT_EVENTS.SLACK_OAUTH_OPENED, { agent: agent.identifier });
  ui.showSlackOAuthUrl(authorizeUrl);

  // Best-effort browser open. If the user's OS won't open a browser they can
  // still copy the URL from the screen.
  void open(authorizeUrl).catch(() => undefined);

  ui.pollingForSlackConnection();
  const connected = await pollForSlackConnection(client, agent.identifier, slackIntegration.identifier);
  if (!connected) {
    throw new Error(
      `Slack OAuth was not completed within ${Math.round(SLACK_POLL_TIMEOUT_MS / 1000)} seconds. ` +
        'Re-run `npx novu connect` once you have authorized the Slack app.'
    );
  }

  ui.slackConnected();
  track(CONNECT_EVENTS.SLACK_CONNECTED, { agent: agent.identifier, alreadyConnected: false });

  return true;
}

async function pollForSlackConnection(
  client: ConnectApiClient,
  agentIdentifier: string,
  slackIntegrationIdentifier: string
): Promise<boolean> {
  const deadline = Date.now() + SLACK_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const links = await listAgentIntegrations(client, agentIdentifier);
      const slack = links.find((l) => l.integrationIdentifier === slackIntegrationIdentifier);
      if (slack?.connectedAt) return true;
    } catch {
      // Transient failures during polling are non-fatal; keep trying until the deadline.
    }
    await sleep(SLACK_POLL_INTERVAL_MS);
  }

  return false;
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
