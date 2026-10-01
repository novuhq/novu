import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  type ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  type ContextEntity,
  ContextRepository,
} from '@novu/dal';
import type { AgentContextPayload, AgentContextValue } from '@novu/framework';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { PLATFORM_ENDPOINT_CONFIG } from '../../shared/util/platform-endpoint-config';
import { WORKSPACE_ID_EXTRACTORS } from '../../shared/util/workspace-id';

function toContextValue(context: ContextEntity): AgentContextValue {
  if (context.data && Object.keys(context.data).length > 0) {
    return { id: context.id, data: context.data };
  }

  return context.id;
}

/**
 * The connect-time context resolved for an inbound turn, plus an optional per-context bridge URL
 * override. When `bridgeUrl` is set, the bridge executor routes this turn's bridge call there
 * instead of the agent's default bridge URL.
 */
export interface ResolvedInboundContext {
  context: AgentContextPayload | null;
  bridgeUrl?: string;
}

const EMPTY_RESOLVED_CONTEXT: ResolvedInboundContext = { context: null };

/**
 * Resolves the connect-time context bound to an inbound chat so a Novu-hosted multi-tenant agent
 * (e.g. NovuCopilot) can learn which customer tenant a turn belongs to. Two scopes are supported,
 * matching where the connect flow persisted the context:
 *
 *  - **Workspace scope** (Slack, Teams): one Novu-hosted app is installed across many customer
 *    workspaces, so the tenant rides on a per-workspace `ChannelConnection` (owned by Novu's prod
 *    org) keyed by `workspace.id`. Matched by (`integrationIdentifier`, workspace id from payload).
 *    Additionally the *author's* own `SLACK_USER` / `MS_TEAMS_USER` endpoint is resolved and its
 *    verified per-user context takes precedence over the workspace hint on conflict — the connection
 *    is only a tenant/routing fallback for unlinked authors.
 *
 *  - **Endpoint scope** (Telegram): there is no workspace — the subscriber links their chat via a
 *    `/start` deep link that binds the tenant to their per-subscriber `ChannelEndpoint`. Matched by
 *    the sender's platform identity (`endpoint.<identityField>` = `platformUserId`).
 *
 * The matched entity's `contextKeys` are rebuilt into the original `ContextPayload` and forwarded to
 * the bridge as `ctx.context`. Platforms with neither scope (WhatsApp, email) short-circuit to
 * `null`.
 *
 * Fails soft to `null`: a missing connection/endpoint or a lookup error must never crash the inbound
 * webhook — it just means the agent has no tenant and can fall back to a connect prompt.
 */
@Injectable()
export class InboundConnectionContextResolver {
  constructor(
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly contextRepository: ContextRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * @param rawEvent Raw inbound platform payload — used for workspace-scoped platforms.
   * @param platformUserId The sender's platform identity (e.g. Telegram `chat.id`) — used for
   *   endpoint-scoped platforms.
   */
  async resolve(
    config: ResolvedAgentConfig,
    rawEvent: unknown,
    platformUserId?: string | null
  ): Promise<ResolvedInboundContext> {
    const extractWorkspaceId = WORKSPACE_ID_EXTRACTORS[config.platform];

    if (extractWorkspaceId) {
      return this.resolveByWorkspaceAndEndpoint(config, extractWorkspaceId(rawEvent), platformUserId ?? null);
    }

    return this.resolveByEndpoint(config, platformUserId ?? null);
  }

  /**
   * Endpoint-aware resolution for workspace-scoped platforms (Slack, Teams). The
   * acting identity and its per-user context come from the *author's* own
   * `SLACK_USER` / `MS_TEAMS_USER` endpoint (written with a verified context at
   * link time). The per-workspace `ChannelConnection` is demoted to a
   * tenant/routing hint and only fills keys the endpoint didn't provide, so an
   * unlinked author (no endpoint) still resolves the workspace tenant hint while
   * a linked author's verified per-user context always wins on conflict.
   */
  private async resolveByWorkspaceAndEndpoint(
    config: ResolvedAgentConfig,
    workspaceId: string | null,
    platformUserId: string | null
  ): Promise<ResolvedInboundContext> {
    // Resolve the workspace connection first so the per-user endpoint lookup can be scoped to it.
    const connection = await this.findWorkspaceConnection(config, workspaceId);

    const [workspaceResult, endpointResult] = await Promise.all([
      this.buildWorkspaceContext(config, connection, workspaceId),
      // Scope the per-user endpoint to the resolved workspace connection. Without it, a platform
      // user (e.g. a Slack `userId`) linked in another customer org — which shares Novu's hosted
      // env/integration — could match here and override the current workspace's tenant.
      platformUserId && connection
        ? this.resolveByEndpoint(config, platformUserId, connection.identifier)
        : Promise.resolve(EMPTY_RESOLVED_CONTEXT),
    ]);

    if (!workspaceResult.context && !endpointResult.context) {
      return EMPTY_RESOLVED_CONTEXT;
    }

    return {
      context: { ...(workspaceResult.context ?? {}), ...(endpointResult.context ?? {}) },
      // The verified per-user endpoint context takes precedence over the workspace hint, so its
      // bridge URL override wins on conflict; the workspace override is the fallback.
      bridgeUrl: endpointResult.bridgeUrl ?? workspaceResult.bridgeUrl,
    };
  }

  private async findWorkspaceConnection(
    config: ResolvedAgentConfig,
    workspaceId: string | null
  ): Promise<ChannelConnectionEntity | null> {
    if (!workspaceId) {
      return null;
    }

    try {
      return await this.channelConnectionRepository.findOne({
        _environmentId: config.environmentId,
        _organizationId: config.organizationId,
        integrationIdentifier: config.integrationIdentifier,
        'workspace.id': workspaceId,
      });
    } catch (err) {
      this.logResolveFailure(err, config, { scope: 'workspace', workspaceId });

      return null;
    }
  }

  private async buildWorkspaceContext(
    config: ResolvedAgentConfig,
    connection: ChannelConnectionEntity | null,
    workspaceId: string | null
  ): Promise<ResolvedInboundContext> {
    if (!connection) {
      return EMPTY_RESOLVED_CONTEXT;
    }

    try {
      return await this.buildContextFromKeys(config, connection.contextKeys);
    } catch (err) {
      this.logResolveFailure(err, config, { scope: 'workspace', workspaceId });

      return EMPTY_RESOLVED_CONTEXT;
    }
  }

  /**
   * Endpoint-scoped resolution for single-tenant platforms (Telegram): the tenant is bound to the
   * subscriber's `ChannelEndpoint` at link time, so we look it up by the sender's platform identity.
   * Only platforms with a {@link PLATFORM_ENDPOINT_CONFIG} entry are eligible; others return `null`.
   */
  private async resolveByEndpoint(
    config: ResolvedAgentConfig,
    platformUserId: string | null,
    connectionIdentifier?: string
  ): Promise<ResolvedInboundContext> {
    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[config.platform];

    if (!endpointConfig || !platformUserId) {
      return EMPTY_RESOLVED_CONTEXT;
    }

    try {
      const endpoint = await this.channelEndpointRepository.findByPlatformIdentity({
        _environmentId: config.environmentId,
        _organizationId: config.organizationId,
        integrationIdentifier: config.integrationIdentifier,
        type: endpointConfig.endpointType,
        endpointField: endpointConfig.identityField,
        endpointValue: platformUserId,
        connectionIdentifier,
      });

      return await this.buildContextFromKeys(config, endpoint?.contextKeys);
    } catch (err) {
      this.logResolveFailure(err, config, { scope: 'endpoint', platformUserId });

      return EMPTY_RESOLVED_CONTEXT;
    }
  }

  private async buildContextFromKeys(
    config: ResolvedAgentConfig,
    contextKeys: string[] | undefined
  ): Promise<ResolvedInboundContext> {
    if (!contextKeys?.length) {
      return EMPTY_RESOLVED_CONTEXT;
    }

    const contexts = await this.contextRepository.findByKeys(config.environmentId, config.organizationId, contextKeys);

    if (!contexts.length) {
      return EMPTY_RESOLVED_CONTEXT;
    }

    // Deterministic order so bridge URL selection and conflict logging are stable across turns.
    const sorted = [...contexts].sort((a, b) => a.key.localeCompare(b.key));

    const payload: AgentContextPayload = {};

    for (const context of sorted) {
      payload[context.type] = toContextValue(context);
    }

    return {
      context: payload,
      bridgeUrl: this.selectBridgeUrlOverride(config, sorted),
    };
  }

  /**
   * Any resolved context may carry a `bridgeUrl` override. When several within the same scope set
   * one, pick the first by sorted key (stable) and warn on divergent values so misconfiguration is
   * diagnosable.
   */
  private selectBridgeUrlOverride(config: ResolvedAgentConfig, sortedContexts: ContextEntity[]): string | undefined {
    const withBridgeUrl = sortedContexts.filter((context) => !!context.bridgeUrl);

    if (!withBridgeUrl.length) {
      return undefined;
    }

    const selected = withBridgeUrl[0];
    const distinct = new Set(withBridgeUrl.map((context) => context.bridgeUrl));

    if (distinct.size > 1) {
      this.logger.warn(
        {
          platform: config.platform,
          integrationIdentifier: config.integrationIdentifier,
          selectedContextKey: selected.key,
          conflictingContextKeys: withBridgeUrl.map((context) => context.key),
        },
        'Multiple resolved contexts define different bridge URLs; using the first by sorted key'
      );
      captureAgentWarning(new Error('Conflicting context bridge URL overrides'), {
        component: 'inbound-connection-context-resolver',
        operation: 'select-bridge-url-override',
        platform: config.platform,
        integrationIdentifier: config.integrationIdentifier,
      });
    }

    return selected.bridgeUrl;
  }

  private logResolveFailure(err: unknown, config: ResolvedAgentConfig, extra: Record<string, unknown>): void {
    this.logger.warn(
      { err, platform: config.platform, integrationIdentifier: config.integrationIdentifier, ...extra },
      'Failed to resolve inbound connection context; continuing without a tenant'
    );
    captureAgentWarning(err, {
      component: 'inbound-connection-context-resolver',
      operation: 'resolve-context',
      platform: config.platform,
      integrationIdentifier: config.integrationIdentifier,
    });
  }
}
