import open from 'open';
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
import { type ResolvedConnectAuth, fallbackToAuthenticatedConnectAuth, resolveConnectAuth, shouldFallbackFromKeylessLimit } from '../auth/resolve-connect-auth';
import { buildConnectAgentDetailsUrl, channelDisplayName } from '../dashboard-urls';
import { ConnectChannelBackError } from '../errors';
import type { AgentSummary, ChannelChoice, ConnectCommandOptions } from '../types';
import type { ConnectUI } from '../ui/ui';
import { connectEmailForAgent } from './channels/email';
import { connectSlackForAgent } from './channels/slack';
import { connectTelegramForAgent } from './channels/telegram';
import { resolveAgentRuntimeIntegration, resolveRuntimeFromOptions } from './resolve-agent-runtime-integration';

export interface ConnectPipelineInput {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  onboardingSessionId?: string;
  onTrack?: (event: string, data?: Record<string, unknown>) => void;
  onIdentityResolved?: (user: NonNullable<ResolvedConnectAuth['user']>) => void;
}

export interface ConnectPipelineResult {
  exitCode: number;
}

interface ConnectRuntimeContext {
  auth: ResolvedConnectAuth;
  client: ConnectApiClient;
}

interface ConnectAuthCallbacks {
  onStatus: (message: string) => void;
  onDashboardUrl: (url: string | null) => void;
  onAuthStarted: () => void;
  onAuthFailed: (message: string) => void;
  onAuthCompleted: (envName: string | null) => void;
  trackAuthCompleted: (auth: ResolvedConnectAuth) => void;
  onIdentityResolved?: (user: NonNullable<ResolvedConnectAuth['user']>) => void;
  onboardingSessionId?: string;
}

export async function runConnectPipeline(input: ConnectPipelineInput): Promise<ConnectPipelineResult> {
  const { options, ui, onTrack, onboardingSessionId } = input;
  const track = onTrack ?? (() => undefined);
  const sessionProps = onboardingSessionId ? { onboardingSessionId } : {};

  try {
    await ui.showWelcome();

    ui.authStarted();
    const authCallbacks = buildAuthCallbacks(input);
    let auth = await resolveConnectAuth(options, {
      onStatus: authCallbacks.onStatus,
      onDashboardUrl: authCallbacks.onDashboardUrl,
      name: 'novu-connect',
      authDashboardUrl: options.connectDashboardUrl,
      onboardingSessionId,
      onAuthStarted: authCallbacks.onAuthStarted,
      onAuthFailed: authCallbacks.onAuthFailed,
    });
    authCallbacks.trackAuthCompleted(auth);
    authCallbacks.onAuthCompleted(auth.environmentName ?? null);

    if (auth.user?.id) {
      authCallbacks.onIdentityResolved?.(auth.user);
    }

    const runtimeContext: ConnectRuntimeContext = {
      auth,
      client: createClientFromAuth(auth),
    };

    ui.listingAgents();
    const existingAgents = await listAgents(runtimeContext.client);
    track(CONNECT_EVENTS.AGENT_LISTED, { count: existingAgents.length, ...sessionProps });

    let agent: AgentSummary;
    let flow: 'created' | 'reused';

    if (existingAgents.length > 0 && !options.prompt) {
      const pick = await ui.pickExistingOrCreate(existingAgents.map(toSummary));
      if (pick.action === 'use') {
        agent = pick.agent;
        flow = 'reused';
        track(CONNECT_EVENTS.AGENT_REUSED, { identifier: agent.identifier, ...sessionProps });
      } else {
        agent = await createAgentFlow(runtimeContext, ui, options, track, sessionProps, authCallbacks);
        flow = 'created';
        track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier, ...sessionProps });
      }
    } else {
      agent = await createAgentFlow(runtimeContext, ui, options, track, sessionProps, authCallbacks);
      flow = 'created';
      track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier, ...sessionProps });
    }

    auth = runtimeContext.auth;
    const { client } = runtimeContext;

    ui.agentCreated(agent);

    let channelConnected = false;
    let connectedChannel: ChannelChoice | null = null;
    let dashboardRedirectChannel: ChannelChoice | null = null;
    let connectedIntegration: IntegrationRecord | null = null;

    const isChannelPreset = Boolean(options.skipSlack || options.channel);
    const allowChannelPickerBack = !isChannelPreset;
    const presetChannel: ChannelChoice | undefined = options.skipSlack ? 'skip' : options.channel;
    let channel: ChannelChoice = presetChannel ?? 'skip';

    while (true) {
      if (!isChannelPreset) {
        channel = await ui.pickChannel();
      }

      if (channel === 'skip') {
        track(CONNECT_EVENTS.CHANNEL_SKIPPED, sessionProps);
      } else {
        track(CONNECT_EVENTS.CHANNEL_SELECTED, { channel, ...sessionProps });
      }

      try {
        switch (channel) {
          case 'skip':
            ui.slackSkipped();
            break;
          case 'slack': {
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
            const result = await connectTelegramForAgent(client, agent, ui, auth.environmentId, subscriberId, track);
            connectedIntegration = result.integration;
            channelConnected = result.connected;
            if (channelConnected) connectedChannel = 'telegram';
            break;
          }
          case 'email': {
            await ensureSubscriberForUser(client, auth);
            const sendFromEmail = auth.user?.email?.trim() || undefined;
            const result = await connectEmailForAgent(client, agent, ui, track, {
              sendFromEmail,
              canGoBack: allowChannelPickerBack,
            });
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

            track(CONNECT_EVENTS.DASHBOARD_REDIRECT_OPENED, {
              channel,
              agent: agent.identifier,
              ...sessionProps,
            });

            await ui.awaitDashboardChannelOpen({ channel, agentDetailsUrl });
            void open(agentDetailsUrl).catch(() => undefined);
            dashboardRedirectChannel = channel;
            break;
          }
          default:
            throw new Error(`${channelDisplayName(channel)} is not supported in the connect CLI yet.`);
        }

        break;
      } catch (err) {
        if (err instanceof ConnectChannelBackError && allowChannelPickerBack) {
          continue;
        }

        throw err;
      }
    }

    if (channelConnected && connectedIntegration) {
      ui.sendingWelcome();
      try {
        await sendAgentWelcomeMessage(client, agent.identifier, connectedIntegration.identifier);
        track(CONNECT_EVENTS.WELCOME_SENT, { agent: agent.identifier, ...sessionProps });
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

    track(CONNECT_EVENTS.COMPLETED, {
      flow,
      channel: connectedChannel ?? channel,
      dashboardRedirectChannel,
      setupComplete: channelConnected,
      source: 'cli',
      ...sessionProps,
    });

    const exitCode = await ui.shutdown();

    return { exitCode };
  } catch (err) {
    const message = describeError(err);
    ui.failure(message);
    track(CONNECT_EVENTS.ERROR, { message, ...sessionProps });
    const exitCode = await ui.shutdown();

    return { exitCode: exitCode || 1 };
  }
}

async function createAgentFlow(
  runtimeContext: ConnectRuntimeContext,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  track: (event: string, data?: Record<string, unknown>) => void,
  sessionProps: Record<string, unknown>,
  authCallbacks: ConnectAuthCallbacks
): Promise<AgentSummary> {
  const runtime =
    resolveRuntimeFromOptions(options) ??
    (await ui.pickAgentRuntime({ preselected: options.runtime ?? 'demo' }).then((picked) => {
      track(CONNECT_EVENTS.RUNTIME_SELECTED, { runtime: picked, ...sessionProps });

      return picked;
    }));

  if (resolveRuntimeFromOptions(options)) {
    track(CONNECT_EVENTS.RUNTIME_SELECTED, { runtime, ...sessionProps });
  }

  const prompt = await ui.promptForDescription(options.prompt);

  while (true) {
    ui.loadingIntegrations();
    const resolved = await resolveAgentRuntimeIntegration(
      runtimeContext.client,
      ui,
      options,
      runtime,
      runtimeContext.auth.environmentId
    );

    try {
      const generated = await generateAndPreviewAgent(runtimeContext.client, ui, prompt.trim(), track, sessionProps);

      ui.creatingAgent(generated.name);

      const created = await createManagedAgent(runtimeContext.client, {
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
      if (runtimeContext.auth.isKeyless && shouldFallbackFromKeylessLimit(err)) {
        await cleanupCreatedIntegration(runtimeContext.client, resolved);

        runtimeContext.auth = await switchToAuthenticatedAuth(options, authCallbacks);
        runtimeContext.client = createClientFromAuth(runtimeContext.auth);

        continue;
      }

      await cleanupCreatedIntegration(runtimeContext.client, resolved);

      throw err;
    }
  }
}

async function generateAndPreviewAgent(
  client: ConnectApiClient,
  ui: ConnectUI,
  initialPrompt: string,
  track: (event: string, data?: Record<string, unknown>) => void,
  sessionProps: Record<string, unknown>
): Promise<Awaited<ReturnType<typeof generateAgent>>> {
  let prompt = initialPrompt;

  while (true) {
    if (prompt.trim().length < 8) {
      throw new Error('Agent description must be at least 8 characters.');
    }

    ui.generatingAgent();
    const generated = await generateAgent(client, prompt.trim());
    track(CONNECT_EVENTS.AGENT_PROMPT_GENERATED, {
      promptLength: prompt.trim().length,
      toolsCount: generated.tools.length,
      mcpsCount: generated.mcpServers.length,
      skillsCount: generated.skills.length,
      ...sessionProps,
    });
    const result = await ui.previewGeneratedAgent(generated);

    if (result.action === 'confirm') {
      return result.spec;
    }

    prompt = await ui.refineDescription(prompt.trim());
  }
}

async function ensureSubscriberForUser(client: ConnectApiClient, auth: ResolvedConnectAuth): Promise<string> {
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

  if (auth.isKeyless && auth.keylessApplicationIdentifier) {
    const subscriberId = `connect-keyless:${auth.keylessApplicationIdentifier}`;
    await upsertSubscriber(client, { subscriberId });

    return subscriberId;
  }

  const fallback = `cli:${auth.organizationId ?? 'anonymous'}:${Date.now()}`;
  await upsertSubscriber(client, { subscriberId: fallback });

  return fallback;
}

function buildAuthCallbacks(input: ConnectPipelineInput): ConnectAuthCallbacks {
  const { ui, onTrack, onboardingSessionId, onIdentityResolved, options } = input;
  const sessionProps = onboardingSessionId ? { onboardingSessionId } : {};
  const track = onTrack ?? (() => undefined);

  return {
    onStatus: (message) => ui.authStatus(message),
    onDashboardUrl: (url) => ui.authDashboardUrl(url),
    onAuthStarted: () => track(CONNECT_EVENTS.AUTH_STARTED, sessionProps),
    onAuthFailed: (message) => track(CONNECT_EVENTS.AUTH_FAILED, { ...sessionProps, message }),
    onAuthCompleted: (envName) => ui.authCompleted(envName),
    trackAuthCompleted: (auth) =>
      track(CONNECT_EVENTS.AUTH_COMPLETED, {
        source: auth.source,
        region: options.region,
        keyless: auth.isKeyless,
        ...sessionProps,
      }),
    onIdentityResolved,
    onboardingSessionId,
  };
}

async function switchToAuthenticatedAuth(
  options: ConnectCommandOptions,
  authCallbacks: ConnectAuthCallbacks
): Promise<ResolvedConnectAuth> {
  const auth = await fallbackToAuthenticatedConnectAuth(options, {
    onStatus: authCallbacks.onStatus,
    onDashboardUrl: authCallbacks.onDashboardUrl,
    name: 'novu-connect',
    authDashboardUrl: options.connectDashboardUrl,
    onboardingSessionId: authCallbacks.onboardingSessionId,
    onAuthStarted: authCallbacks.onAuthStarted,
    onAuthFailed: authCallbacks.onAuthFailed,
  });

  authCallbacks.trackAuthCompleted(auth);
  authCallbacks.onAuthCompleted(auth.environmentName ?? null);

  if (auth.user?.id) {
    authCallbacks.onIdentityResolved?.(auth.user);
  }

  return auth;
}

function createClientFromAuth(auth: ResolvedConnectAuth): ConnectApiClient {
  if (auth.isKeyless) {
    return createConnectApiClient({
      apiUrl: auth.apiUrl,
      keylessApplicationIdentifier: auth.keylessApplicationIdentifier,
    });
  }

  return createConnectApiClient({ apiUrl: auth.apiUrl, secretKey: auth.secretKey });
}

async function cleanupCreatedIntegration(
  client: ConnectApiClient,
  resolved: { createdInThisFlow: boolean; integrationId: string }
): Promise<void> {
  if (!resolved.createdInThisFlow) {
    return;
  }

  try {
    await deleteIntegration(client, resolved.integrationId);
  } catch {
    // Best-effort cleanup.
  }
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
