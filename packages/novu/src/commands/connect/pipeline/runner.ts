import { CLI_DEVICE_SESSION_NAME_NOVU_CONNECT } from '@novu/shared';
import open from 'open';
import { CONNECT_EVENTS } from '../analytics/events';
import {
  type AgentRecord,
  createManagedAgent,
  type GeneratedAgentSpec,
  generateAgent,
  listAgents,
  sendAgentWelcomeMessage,
} from '../api/agents';
import { type ConnectApiClient, createConnectApiClient, NovuApiError } from '../api/client';
import { deleteIntegration, type IntegrationRecord } from '../api/integrations';
import { upsertSubscriber } from '../api/subscribers';
import { type ResolvedConnectAuth, resolveConnectAuth, resolveConnectAuthMethod } from '../auth/resolve-connect-auth';
import { type ConnectSession, upgradeKeylessSessionToDashboardAuth } from '../auth/upgrade-keyless-session';
import { buildConnectAgentDetailsUrl, buildConnectClaimUrl, channelDisplayName } from '../dashboard-urls';
import { ConnectChannelBackError } from '../errors';
import { shouldUpgradeFromKeylessGenerateLimit } from '../keyless-limit-errors';
import type {
  AgentConnectMode,
  AgentSummary,
  AiSdkConnectOutcome,
  ChannelChoice,
  ChatSdkConnectOutcome,
  ConnectCommandOptions,
  CustomCodeConnectOutcome,
  LangChainConnectOutcome,
} from '../types';
import {
  isAiSdkConnectMode,
  isBridgeConnectMode,
  isLangChainConnectMode,
  isVanillaCustomCodeConnectMode,
} from '../types';
import type { ConnectUI } from '../ui/ui';
import { maybeRunAiSdkTunnel, runAiSdkProjectSetup } from './ai-sdk';
import { createBridgeAgentFlow } from './bridge/create-bridge-agent';
import { connectEmailForAgent } from './channels/email';
import { connectSendblueForAgent } from './channels/sendblue';
import { connectSlackForAgent } from './channels/slack';
import { connectTelegramForAgent } from './channels/telegram';
import { connectWhatsAppForAgent } from './channels/whatsapp';
import { maybeRunChatSdkTunnel, runChatSdkProjectSetup } from './chat-sdk';
import { runCustomCodeProjectSetup } from './custom-code';
import { maybeRunLangChainTunnel, runLangChainProjectSetup } from './langchain';
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

/**
 * Cross-cutting pipeline state threaded through every flow: analytics,
 * identity callbacks, and the generated agent spec retained for
 * keyless→dashboard upgrades that must recreate the agent.
 */
interface PipelineContext {
  options: ConnectCommandOptions;
  ui: ConnectUI;
  track: (event: string, data?: Record<string, unknown>) => void;
  sessionProps: Record<string, unknown>;
  onboardingSessionId?: string;
  onIdentityResolved?: (user: NonNullable<ResolvedConnectAuth['user']>) => void;
  /** Set by {@link createAgentFlow} so a mid-flow upgrade can recreate the agent in the upgraded environment. */
  createdSpec?: GeneratedAgentSpec;
}

export async function runConnectPipeline(input: ConnectPipelineInput): Promise<ConnectPipelineResult> {
  const { options, ui, onTrack, onboardingSessionId } = input;
  const track = onTrack ?? (() => undefined);
  const authMethod = resolveConnectAuthMethod(options);
  const sessionProps = {
    ...(onboardingSessionId ? { onboardingSessionId } : {}),
    authMethod,
    ci: !!options.ci,
    keyless: !!options.keyless,
    hasPrompt: !!options.prompt,
    channel: options.channel ?? (options.skipSlack ? 'skip' : undefined),
  };
  const ctx: PipelineContext = {
    options,
    ui,
    track,
    sessionProps,
    onboardingSessionId,
    onIdentityResolved: input.onIdentityResolved,
  };

  try {
    await ui.showWelcome();

    track(CONNECT_EVENTS.PIPELINE_STARTED, sessionProps);

    ui.authStarted();
    const auth = await resolveConnectAuth(options, {
      onStatus: (m) => ui.authStatus(m),
      onDashboardUrl: (u) => ui.authDashboardUrl(u),
      name: CLI_DEVICE_SESSION_NAME_NOVU_CONNECT,
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
        : createConnectApiClient({
            apiUrl: auth.apiUrl,
            secretKey: auth.secretKey,
          }),
    };

    ui.listingAgents();
    const existingAgents = await listAgents(session.client);
    track(CONNECT_EVENTS.AGENT_LISTED, {
      count: existingAgents.length,
      ...sessionProps,
    });

    const connectMode = await resolveAgentConnectMode(ctx);

    // Bridge modes need the user's real environment up front, so a keyless
    // session is upgraded before the agent is created.
    const needsPreCreationUpgrade = isBridgeConnectMode(connectMode) && session.auth.isKeyless;

    if (needsPreCreationUpgrade) {
      await upgradeKeylessWithTracking(session, ctx, { source: 'bridge_agent_upgrade' });
    }

    let agent: AgentSummary;
    let flow: 'created' | 'reused';
    let chatSdkOutcome: ChatSdkConnectOutcome | undefined;
    let aiSdkOutcome: AiSdkConnectOutcome | undefined;
    let langChainOutcome: LangChainConnectOutcome | undefined;
    let customCodeOutcome: CustomCodeConnectOutcome | undefined;

    if (isBridgeConnectMode(connectMode)) {
      const bridgeResult = await createBridgeAgentFlow(session.client, ui, options);
      agent = bridgeResult.agent;
      flow = bridgeResult.flow;
      track(CONNECT_EVENTS.AGENT_CREATED, {
        identifier: agent.identifier,
        connectMode,
        flow,
        ...sessionProps,
      });
    } else if (existingAgents.length > 0 && !options.prompt) {
      const pick = await ui.pickExistingOrCreate(existingAgents.map(toSummary));
      if (pick.action === 'use') {
        agent = pick.agent;
        flow = 'reused';
        track(CONNECT_EVENTS.AGENT_REUSED, {
          identifier: agent.identifier,
          ...sessionProps,
        });
      } else {
        agent = await createAgentFlow(session, ctx, connectMode);
        flow = 'created';
        track(CONNECT_EVENTS.AGENT_CREATED, {
          identifier: agent.identifier,
          ...sessionProps,
        });
      }
    } else {
      agent = await createAgentFlow(session, ctx, connectMode);
      flow = 'created';
      track(CONNECT_EVENTS.AGENT_CREATED, {
        identifier: agent.identifier,
        ...sessionProps,
      });
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

    const openDashboardChannelHandoff = async (handoffChannel: ChannelChoice) => {
      // Finishing setup in the dashboard needs a real account: a keyless
      // workspace has no dashboard to sign into and no environment to link to,
      // so the agent is moved into the user's own environment first.
      if (session.auth.isKeyless) {
        agent = await upgradeKeylessSessionForChannel(session, ctx, agent, connectMode, {
          source: `${handoffChannel}_dashboard_handoff_upgrade`,
          statusMessage: `${channelDisplayName(handoffChannel)} setup happens in the Novu dashboard. Opening Novu dashboard sign-in to continue…`,
        });
      }

      const agentDetailsUrl = buildConnectAgentDetailsUrl({
        connectDashboardUrl: options.connectDashboardUrl,
        environmentSlug: session.auth.environmentSlug,
        agentIdentifier: agent.identifier,
        tab: 'integrations',
      });

      track(CONNECT_EVENTS.DASHBOARD_REDIRECT_OPENED, {
        channel: handoffChannel,
        agent: agent.identifier,
        ...sessionProps,
      });

      await ui.awaitDashboardChannelOpen({ channel: handoffChannel, agentDetailsUrl });
      void open(agentDetailsUrl).catch(() => undefined);
      dashboardRedirectChannel = handoffChannel;
    };

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
          case 'sendblue': {
            const subscriberId = await ensureSubscriberForUser(session.client, session.auth);
            const result = await connectSendblueForAgent(
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
            if (channelConnected) connectedChannel = 'sendblue';
            break;
          }
          case 'whatsapp': {
            // The tokenized Embedded Signup flow works for keyless sessions
            // too, so try it with the current session first.
            let result = await connectWhatsAppForAgent(
              session.client,
              agent,
              ui,
              { environmentId: session.auth.environmentId },
              (event, data) => track(event, { ...data, ...sessionProps })
            );

            if (result.kind === 'unavailable' && session.auth.isKeyless) {
              // Embedded signup isn't available for the keyless workspace
              // (flag off, self-hosted, older API) — fall back to a real
              // account and retry in the upgraded environment.
              agent = await upgradeKeylessSessionForChannel(session, ctx, agent, connectMode, {
                source: 'whatsapp_upgrade',
                statusMessage:
                  'WhatsApp needs a Novu account on this deployment. Opening Novu dashboard sign-in to continue…',
              });

              result = await connectWhatsAppForAgent(
                session.client,
                agent,
                ui,
                { environmentId: session.auth.environmentId },
                (event, data) => track(event, { ...data, ...sessionProps })
              );
            }

            if (result.kind === 'unavailable') {
              // Embedded signup is off for this deployment — today's behavior
              // exactly: open the agent integrations tab and hand off.
              await openDashboardChannelHandoff('whatsapp');
              break;
            }

            connectedIntegration = result.integration;
            channelConnected = result.connected;
            if (channelConnected) connectedChannel = 'whatsapp';
            break;
          }
          case 'teams': {
            await openDashboardChannelHandoff('teams');
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

    // Sendblue's test message doubles as the welcome, so we skip the separate
    // welcome-message call (which would send a second text).
    if (channelConnected && connectedIntegration && connectedChannel !== 'sendblue') {
      ui.sendingWelcome();
      try {
        const welcome = await sendAgentWelcomeMessage(
          session.client,
          agent.identifier,
          connectedIntegration.identifier
        );
        claimToken = welcome.claimToken ?? null;
        track(CONNECT_EVENTS.WELCOME_SENT, {
          agent: agent.identifier,
          ...sessionProps,
        });
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

    if (connectMode === 'chat-sdk') {
      chatSdkOutcome = await runChatSdkProjectSetup({
        options,
        ui,
        auth: session.auth,
        agent,
      });
    } else if (isAiSdkConnectMode(connectMode)) {
      aiSdkOutcome = await runAiSdkProjectSetup({
        options,
        ui,
        auth: session.auth,
        agent,
      });
    } else if (isLangChainConnectMode(connectMode)) {
      langChainOutcome = await runLangChainProjectSetup({
        options,
        ui,
        auth: session.auth,
        agent,
      });
    } else if (isVanillaCustomCodeConnectMode(connectMode)) {
      customCodeOutcome = await runCustomCodeProjectSetup({
        options,
        ui,
        auth: session.auth,
        agent,
      });
    }

    ui.success({
      agent,
      dashboardUrl: session.auth.dashboardUrl.replace(/\/$/, ''),
      connectDashboardUrl: options.connectDashboardUrl.replace(/\/$/, ''),
      environmentSlug: session.auth.environmentSlug ?? null,
      connectedChannel,
      dashboardRedirectChannel,
      isKeyless: session.auth.isKeyless,
      claimUrl,
      connectMode,
      chatSdkOutcome,
      aiSdkOutcome,
      langChainOutcome,
      customCodeOutcome,
    });

    track(CONNECT_EVENTS.COMPLETED, {
      flow,
      channel: connectedChannel ?? channel,
      dashboardRedirectChannel,
      setupComplete: channelConnected,
      source: 'cli',
      connectMode,
      ...sessionProps,
    });

    // Tear down Ink before starting the bridge server so its stdout/console
    // output does not trigger a second orb render while the TUI is still mounted.
    const exitCode = await ui.shutdown();

    if (await maybeRunChatSdkTunnel({ outcome: chatSdkOutcome, ci: options.ci })) {
      return { exitCode: 0 };
    }

    if (await maybeRunAiSdkTunnel({ outcome: aiSdkOutcome, ci: options.ci })) {
      return { exitCode: 0 };
    }

    if (await maybeRunLangChainTunnel({ outcome: langChainOutcome, ci: options.ci })) {
      return { exitCode: 0 };
    }

    return { exitCode };
  } catch (err) {
    const message = describeError(err);
    ui.failure(message);
    track(CONNECT_EVENTS.ERROR, { message, ...sessionProps });

    return { exitCode: (await ui.shutdown()) || 1 };
  }
}

async function resolveAgentConnectMode(ctx: PipelineContext): Promise<AgentConnectMode> {
  const { options, ui, track, sessionProps } = ctx;

  if (options.runtime) {
    track(CONNECT_EVENTS.RUNTIME_SELECTED, {
      connectMode: options.runtime,
      ...sessionProps,
    });

    return options.runtime;
  }

  const picked = await ui.pickAgentConnectMode({
    preselected: options.runtime,
  });
  track(CONNECT_EVENTS.RUNTIME_SELECTED, {
    connectMode: picked,
    ...sessionProps,
  });

  return picked;
}

/**
 * Upgrades a keyless session to dashboard auth with the standard analytics
 * envelope (upgrade-started → auth started/failed → auth completed →
 * identity callback). `source` distinguishes the upgrade trigger in analytics.
 */
async function upgradeKeylessWithTracking(
  session: ConnectSession,
  ctx: PipelineContext,
  upgrade: { source: string; statusMessage?: string }
): Promise<void> {
  const { options, ui, track, sessionProps, onboardingSessionId } = ctx;

  track(CONNECT_EVENTS.KEYLESS_LIMIT_AUTH_UPGRADE_STARTED, sessionProps);
  await upgradeKeylessSessionToDashboardAuth(session, options, ui, {
    onboardingSessionId,
    ...(upgrade.statusMessage ? { statusMessage: upgrade.statusMessage } : {}),
    onAuthStarted: () =>
      track(CONNECT_EVENTS.AUTH_STARTED, {
        ...sessionProps,
        source: upgrade.source,
      }),
    onAuthFailed: (message) =>
      track(CONNECT_EVENTS.AUTH_FAILED, {
        ...sessionProps,
        source: upgrade.source,
        message,
      }),
  });
  track(CONNECT_EVENTS.AUTH_COMPLETED, {
    source: upgrade.source,
    region: options.region,
    keyless: false,
    ...sessionProps,
  });

  if (session.auth.user?.id) {
    ctx.onIdentityResolved?.(session.auth.user);
  }
}

function resolveAgentRuntime(connectMode: AgentConnectMode | undefined, options: ConnectCommandOptions) {
  return (
    (connectMode && !isBridgeConnectMode(connectMode) ? connectMode : undefined) ??
    resolveRuntimeFromOptions(options) ??
    'demo'
  );
}

function createManagedAgentFromSpec(
  client: ConnectApiClient,
  spec: GeneratedAgentSpec,
  resolved: { integrationId: string; providerId: string }
): ReturnType<typeof createManagedAgent> {
  return createManagedAgent(client, {
    name: spec.name,
    identifier: spec.identifier,
    integrationId: resolved.integrationId,
    providerId: resolved.providerId,
    systemPrompt: spec.systemPrompt,
    tools: spec.tools,
    mcpServers: spec.mcpServers,
    skills: spec.skills,
  });
}

/**
 * Moves a keyless run into a real account mid-flow, for channels that cannot
 * complete in the temporary workspace — WhatsApp when the tokenized Embedded
 * Signup flow is unavailable (flag off, self-hosted without Meta credentials,
 * older API), or any channel that hands off to the dashboard. The keyless agent
 * lives in a temporary workspace the upgraded session can no longer reach, so
 * the agent is recreated in the upgraded environment from the retained
 * generated spec.
 */
async function upgradeKeylessSessionForChannel(
  session: ConnectSession,
  ctx: PipelineContext,
  agent: AgentSummary,
  connectMode: AgentConnectMode | undefined,
  upgrade: { source: string; statusMessage: string }
): Promise<AgentSummary> {
  const { options, ui, track, sessionProps, createdSpec } = ctx;

  await upgradeKeylessWithTracking(session, ctx, upgrade);

  // The upgraded environment may already hold this agent from a previous run.
  ui.listingAgents();
  const agents = await listAgents(session.client);
  const existing = agents.find((candidate) => candidate.identifier === agent.identifier);
  if (existing) {
    return toSummary(existing);
  }

  if (!createdSpec) {
    throw new Error(
      `Signed in, but the agent "${agent.name}" was created in the temporary keyless workspace and can't be moved ` +
        'automatically. Re-run `npx novu connect` to set it up in your account.'
    );
  }

  const runtime = resolveAgentRuntime(connectMode, options);
  ui.loadingIntegrations();
  const resolved = await resolveAgentRuntimeIntegration(
    session.client,
    ui,
    options,
    runtime,
    session.auth.environmentId
  );

  ui.creatingAgent(createdSpec.name);
  const created = await createManagedAgentFromSpec(session.client, createdSpec, resolved);
  track(CONNECT_EVENTS.AGENT_CREATED, {
    identifier: created.identifier,
    ...sessionProps,
  });

  return toSummary(created);
}

async function createAgentFlow(
  session: ConnectSession,
  ctx: PipelineContext,
  connectMode?: AgentConnectMode
): Promise<AgentSummary> {
  const { options, ui, track, sessionProps } = ctx;
  const runtime = resolveAgentRuntime(connectMode, options);

  if (resolveRuntimeFromOptions(options) || connectMode) {
    track(CONNECT_EVENTS.RUNTIME_SELECTED, { runtime, ...sessionProps });
  }

  ui.loadingIntegrations();
  let resolved = await resolveAgentRuntimeIntegration(session.client, ui, options, runtime, session.auth.environmentId);

  const prompt = await ui.promptForDescription(options.prompt);
  const generated = await generateAndPreviewAgent(session, ctx, prompt.trim(), async () => {
    resolved = await resolveAgentRuntimeIntegration(session.client, ui, options, runtime, session.auth.environmentId);
  });
  ctx.createdSpec = generated;

  ui.creatingAgent(generated.name);

  try {
    const created = await createManagedAgentFromSpec(session.client, generated, resolved);

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
  ctx: PipelineContext,
  onUpgraded: () => Promise<void>,
  run: () => Promise<T>
): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (!shouldUpgradeFromKeylessGenerateLimit(err, session.client, ctx.options)) {
      throw err;
    }

    await upgradeKeylessWithTracking(session, ctx, { source: 'keyless_limit_upgrade' });

    await onUpgraded();

    return run();
  }
}

async function generateAndPreviewAgent(
  session: ConnectSession,
  ctx: PipelineContext,
  initialPrompt: string,
  onSessionUpgraded?: () => Promise<void>
): Promise<Awaited<ReturnType<typeof generateAgent>>> {
  const { ui, track, sessionProps } = ctx;
  let prompt = initialPrompt;

  while (true) {
    if (prompt.trim().length < 8) {
      throw new Error('Agent description must be at least 8 characters.');
    }

    ui.generatingAgent();

    const generated = await withKeylessGenerateLimitFallback(
      session,
      ctx,
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
    const subscriberId = auth.user.id;
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
