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
import { type ResolvedConnectAuth, resolveConnectAuth } from '../auth/resolve-connect-auth';
import { type ConnectSession, upgradeKeylessSessionToDashboardAuth } from '../auth/upgrade-keyless-session';
import { buildConnectAgentDetailsUrl, buildConnectClaimUrl, channelDisplayName } from '../dashboard-urls';
import { ConnectChannelBackError } from '../errors';
import { shouldUpgradeFromKeylessGenerateLimit } from '../keyless-limit-errors';
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

export async function runConnectPipeline(input: ConnectPipelineInput): Promise<ConnectPipelineResult> {
  const { options, ui, onTrack, onboardingSessionId } = input;
  const track = onTrack ?? (() => undefined);
  const sessionProps = onboardingSessionId ? { onboardingSessionId } : {};

  try {
    await ui.showWelcome();

    ui.authStarted();
    const auth = await resolveConnectAuth(options, {
      onStatus: (m) => ui.authStatus(m),
      onDashboardUrl: (u) => ui.authDashboardUrl(u),
      name: 'novu-connect',
      authDashboardUrl: options.connectDashboardUrl,
      onboardingSessionId,
      onAuthStarted: () => track(CONNECT_EVENTS.AUTH_STARTED, sessionProps),
      onAuthFailed: (message) => track(CONNECT_EVENTS.AUTH_FAILED, { ...sessionProps, message }),
    });
    track(CONNECT_EVENTS.AUTH_COMPLETED, {
      source: auth.source,
      region: options.region,
      keyless: auth.isKeyless,
      ...sessionProps,
    });
    ui.authCompleted(auth.environmentName ?? null);

    if (auth.user?.id) {
      input.onIdentityResolved?.(auth.user);
    }

    const session: ConnectSession = {
      auth,
      client: auth.isKeyless
        ? createConnectApiClient({
            apiUrl: auth.apiUrl,
            keylessApplicationIdentifier: auth.keylessApplicationIdentifier,
          })
        : createConnectApiClient({ apiUrl: auth.apiUrl, secretKey: auth.secretKey }),
    };

    ui.listingAgents();
    const existingAgents = await listAgents(session.client);
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
        agent = await createAgentFlow(session, ui, options, track, sessionProps, onboardingSessionId, {
          onIdentityResolved: input.onIdentityResolved,
        });
        flow = 'created';
        track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier, ...sessionProps });
      }
    } else {
      agent = await createAgentFlow(session, ui, options, track, sessionProps, onboardingSessionId, {
        onIdentityResolved: input.onIdentityResolved,
      });
      flow = 'created';
      track(CONNECT_EVENTS.AGENT_CREATED, { identifier: agent.identifier, ...sessionProps });
    }

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
            const subscriberId = await ensureSubscriberForUser(session.client, session.auth);
            const result = await connectSlackForAgent(
              session.client,
              agent,
              ui,
              options,
              session.auth.environmentId,
              subscriberId,
              track
            );
            connectedIntegration = result.integration;
            channelConnected = result.connected;
            if (channelConnected) connectedChannel = 'slack';
            break;
          }
          case 'telegram': {
            const subscriberId = await ensureSubscriberForUser(session.client, session.auth);
            const result = await connectTelegramForAgent(
              session.client,
              agent,
              ui,
              options,
              session.auth.environmentId,
              subscriberId,
              track
            );
            connectedIntegration = result.integration;
            channelConnected = result.connected;
            if (channelConnected) connectedChannel = 'telegram';
            break;
          }
          case 'email': {
            await ensureSubscriberForUser(session.client, session.auth);
            const sendFromEmail = session.auth.user?.email?.trim() || undefined;
            const result = await connectEmailForAgent(session.client, agent, ui, track, {
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
              environmentSlug: session.auth.environmentSlug,
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

    let claimToken: string | null = null;

    if (channelConnected && connectedIntegration) {
      ui.sendingWelcome();
      try {
        const welcome = await sendAgentWelcomeMessage(
          session.client,
          agent.identifier,
          connectedIntegration.identifier
        );
        claimToken = welcome.claimToken ?? null;
        track(CONNECT_EVENTS.WELCOME_SENT, { agent: agent.identifier, ...sessionProps });
      } catch (err) {
        ui.failure(`Could not send the welcome message: ${describeError(err)}`);
      }
    }

    const claimUrl =
      session.auth.isKeyless && claimToken
        ? buildConnectClaimUrl({
            connectDashboardUrl: options.connectDashboardUrl.replace(/\/$/, ''),
            token: claimToken,
          })
        : null;

    ui.success({
      agent,
      dashboardUrl: session.auth.dashboardUrl.replace(/\/$/, ''),
      connectDashboardUrl: options.connectDashboardUrl.replace(/\/$/, ''),
      environmentSlug: session.auth.environmentSlug ?? null,
      connectedChannel,
      dashboardRedirectChannel,
      isKeyless: session.auth.isKeyless,
      claimUrl,
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
  session: ConnectSession,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  track: (event: string, data?: Record<string, unknown>) => void,
  sessionProps: Record<string, unknown>,
  onboardingSessionId?: string,
  callbacks?: {
    onIdentityResolved?: (user: NonNullable<ResolvedConnectAuth['user']>) => void;
  }
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

  ui.loadingIntegrations();
  let resolved = await resolveAgentRuntimeIntegration(session.client, ui, options, runtime, session.auth.environmentId);

  const prompt = await ui.promptForDescription(options.prompt);
  const generated = await generateAndPreviewAgent(
    session,
    ui,
    options,
    prompt.trim(),
    track,
    sessionProps,
    onboardingSessionId,
    callbacks,
    async () => {
      resolved = await resolveAgentRuntimeIntegration(session.client, ui, options, runtime, session.auth.environmentId);
    }
  );

  ui.creatingAgent(generated.name);

  try {
    const created = await createManagedAgent(session.client, {
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
        await deleteIntegration(session.client, resolved.integrationId);
      } catch {
        // Best-effort cleanup.
      }
    }

    throw err;
  }
}

async function withKeylessGenerateLimitFallback<T>(
  session: ConnectSession,
  options: ConnectCommandOptions,
  ui: ConnectUI,
  onboardingSessionId: string | undefined,
  track: (event: string, data?: Record<string, unknown>) => void,
  sessionProps: Record<string, unknown>,
  callbacks: { onIdentityResolved?: (user: NonNullable<ResolvedConnectAuth['user']>) => void } | undefined,
  onUpgraded: () => Promise<void>,
  run: () => Promise<T>
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!shouldUpgradeFromKeylessGenerateLimit(err, session.client, options)) {
      throw err;
    }

    track(CONNECT_EVENTS.KEYLESS_LIMIT_AUTH_UPGRADE_STARTED, sessionProps);

    await upgradeKeylessSessionToDashboardAuth(session, options, ui, {
      onboardingSessionId,
      onAuthStarted: () => track(CONNECT_EVENTS.AUTH_STARTED, { ...sessionProps, source: 'keyless_limit_upgrade' }),
      onAuthFailed: (message) =>
        track(CONNECT_EVENTS.AUTH_FAILED, { ...sessionProps, source: 'keyless_limit_upgrade', message }),
    });

    track(CONNECT_EVENTS.AUTH_COMPLETED, {
      source: 'keyless_limit_upgrade',
      region: options.region,
      keyless: false,
      ...sessionProps,
    });

    if (session.auth.user?.id) {
      callbacks?.onIdentityResolved?.(session.auth.user);
    }

    await onUpgraded();

    return run();
  }
}

async function generateAndPreviewAgent(
  session: ConnectSession,
  ui: ConnectUI,
  options: ConnectCommandOptions,
  initialPrompt: string,
  track: (event: string, data?: Record<string, unknown>) => void,
  sessionProps: Record<string, unknown>,
  onboardingSessionId?: string,
  callbacks?: {
    onIdentityResolved?: (user: NonNullable<ResolvedConnectAuth['user']>) => void;
  },
  onSessionUpgraded?: () => Promise<void>
): Promise<Awaited<ReturnType<typeof generateAgent>>> {
  let prompt = initialPrompt;

  while (true) {
    if (prompt.trim().length < 8) {
      throw new Error('Agent description must be at least 8 characters.');
    }

    ui.generatingAgent();

    const generated = await withKeylessGenerateLimitFallback(
      session,
      options,
      ui,
      onboardingSessionId,
      track,
      sessionProps,
      callbacks,
      onSessionUpgraded ?? (async () => undefined),
      () => generateAgent(session.client, prompt.trim())
    );
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
