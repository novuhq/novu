import open from 'open';
import { resolveAuth } from '../../wizard/auth/resolve-auth';
import type { ResolvedAuth, WizardCommandOptions } from '../../wizard/types';
import { CONNECT_EVENTS } from '../analytics/events';
import {
  type AgentRecord,
  createManagedAgent,
  generateAgent,
  listAgents,
  sendAgentWelcomeMessage,
} from '../api/agents';
import { type ConnectApiClient, createConnectApiClient, NovuApiError } from '../api/client';
import { deleteIntegration, type IntegrationRecord } from '../api/integrations';
import { upsertSubscriber } from '../api/subscribers';
import { buildConnectAgentDetailsUrl, channelDisplayName } from '../dashboard-urls';
import type { AgentSummary, ChannelChoice, ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';
import { connectEmailForAgent } from './channels/email';
import { connectSlackForAgent } from './channels/slack';
import { connectTelegramForAgent } from './channels/telegram';
import { resolveAgentRuntimeIntegration, resolveRuntimeFromOptions } from './resolve-agent-runtime-integration';

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
    await ui.showWelcome();

    ui.authStarted();
    const auth = await resolveAuth(toWizardAuthOptions(options), {
      onStatus: (m) => ui.authStatus(m),
      onDashboardUrl: (u) => ui.authDashboardUrl(u),
      name: 'novu-connect',
      authDashboardUrl: options.connectDashboardUrl,
    });
    track(CONNECT_EVENTS.AUTH_COMPLETED, { source: auth.source, region: options.region });
    ui.authCompleted(auth.environmentName ?? null);

    const client = createConnectApiClient({ apiUrl: auth.apiUrl, secretKey: auth.secretKey });

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
        agent = await createAgentFlow(client, ui, options, auth.environmentId);
        flow = 'created';
        track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier });
      }
    } else {
      agent = await createAgentFlow(client, ui, options, auth.environmentId);
      flow = 'created';
      track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier });
    }

    ui.agentCreated(agent);

    let channelConnected = false;
    let connectedChannel: ChannelChoice | null = null;
    let dashboardRedirectChannel: ChannelChoice | null = null;
    let connectedIntegration: IntegrationRecord | null = null;

    const channel: ChannelChoice = options.skipSlack ? 'skip' : (options.channel ?? (await ui.pickChannel()));

    switch (channel) {
      case 'skip':
        ui.slackSkipped();
        break;
      case 'slack': {
        const subscriberId = await ensureSubscriberForUser(client, auth);
        const result = await connectSlackForAgent(client, agent, ui, options, auth.environmentId, subscriberId, track);
        connectedIntegration = result.integration;
        channelConnected = result.connected;
        if (channelConnected) connectedChannel = 'slack';
        break;
      }
      case 'telegram': {
        const subscriberId = await ensureSubscriberForUser(client, auth);
        const result = await connectTelegramForAgent(client, agent, ui, auth.environmentId, subscriberId, track);
        connectedIntegration = result.integration;
        channelConnected = result.connected;
        if (channelConnected) connectedChannel = 'telegram';
        break;
      }
      case 'email': {
        const result = await connectEmailForAgent(client, agent, ui, track);
        connectedIntegration = result.integration;
        channelConnected = result.connected;
        if (channelConnected) connectedChannel = 'email';
        break;
      }
      case 'whatsapp':
      case 'teams': {
        const agentDetailsUrl = buildConnectAgentDetailsUrl({
          connectDashboardUrl: options.connectDashboardUrl,
          environmentSlug: auth.environmentSlug,
          agentIdentifier: agent.identifier,
          tab: 'integrations',
        });

        await ui.awaitDashboardChannelOpen({ channel, agentDetailsUrl });
        void open(agentDetailsUrl).catch(() => undefined);
        dashboardRedirectChannel = channel;
        break;
      }
      default:
        throw new Error(`${channelDisplayName(channel)} is not supported in the connect CLI yet.`);
    }

    if (channelConnected && connectedIntegration) {
      ui.sendingWelcome();
      try {
        await sendAgentWelcomeMessage(client, agent.identifier, connectedIntegration.identifier);
        track(CONNECT_EVENTS.WELCOME_SENT, { agent: agent.identifier });
      } catch (err) {
        ui.failure(`Could not send the welcome message: ${describeError(err)}`);
      }
    }

    ui.success({
      agent,
      dashboardUrl: auth.dashboardUrl.replace(/\/$/, ''),
      connectDashboardUrl: options.connectDashboardUrl.replace(/\/$/, ''),
      environmentSlug: auth.environmentSlug ?? null,
      connectedChannel,
      dashboardRedirectChannel,
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
  options: ConnectCommandOptions,
  environmentId: string
): Promise<AgentSummary> {
  const runtime =
    resolveRuntimeFromOptions(options) ?? (await ui.pickAgentRuntime({ preselected: options.runtime ?? 'demo' }));

  ui.loadingIntegrations();
  const resolved = await resolveAgentRuntimeIntegration(client, ui, options, runtime, environmentId);

  const prompt = await ui.promptForDescription(options.prompt);
  const generated = await generateAndPreviewAgent(client, ui, prompt.trim());

  ui.creatingAgent(generated.name);

  try {
    const created = await createManagedAgent(client, {
      name: generated.name,
      identifier: generated.identifier,
      integrationId: resolved.integrationId,
      providerId: resolved.providerId,
      systemPrompt: generated.systemPrompt,
      tools: generated.tools,
      mcpServers: generated.mcpServers,
      skills: generated.skills,
    });

    return toSummary(created);
  } catch (err) {
    if (resolved.createdInThisFlow) {
      try {
        await deleteIntegration(client, resolved.integrationId);
      } catch {
        // Best-effort cleanup.
      }
    }

    throw err;
  }
}

async function generateAndPreviewAgent(
  client: ConnectApiClient,
  ui: ConnectUI,
  initialPrompt: string
): Promise<Awaited<ReturnType<typeof generateAgent>>> {
  let prompt = initialPrompt;

  while (true) {
    if (prompt.trim().length < 8) {
      throw new Error('Agent description must be at least 8 characters.');
    }

    ui.generatingAgent();
    const generated = await generateAgent(client, prompt.trim());
    const result = await ui.previewGeneratedAgent(generated);

    if (result.action === 'confirm') {
      return result.spec;
    }

    prompt = await ui.refineDescription(prompt.trim());
  }
}

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
  return {
    secretKey: options.secretKey,
    apiUrl: options.apiUrl,
    dashboardUrl: options.dashboardUrl,
    region: options.region,
    yes: false,
    ci: !!options.ci,
  };
}
