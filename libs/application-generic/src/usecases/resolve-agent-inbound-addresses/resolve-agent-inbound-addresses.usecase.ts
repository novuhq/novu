import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  DomainRepository,
  DomainRouteRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { DomainRouteTypeEnum, EmailProviderIdEnum, slugify, type WorkflowAgentConfig } from '@novu/shared';
import {
  buildAgentSharedInbox,
  isAgentSharedInboxEnabled,
  isValidAgentEmailSlugPrefix,
} from '../../utils/agent-shared-inbox';

export type ResolveAgentInboundAddressesParams = {
  agentIdentifier: string;
  environmentId: string;
  organizationId: string;
};

export type AgentEmailContext = {
  replyTo?: string;
  senderName?: string;
  senderEmail?: string;
};

type AgentEmailContextParams = {
  agent: WorkflowAgentConfig;
  environmentId: string;
  organizationId: string;
};

type AgentEmailContextByIdParams = {
  agentId: string;
  environmentId: string;
  organizationId: string;
};

type AgentIdentity = Pick<AgentEntity, '_id' | 'identifier' | 'name'>;

/**
 * Collect Novu-digestible inbound addresses for an agent, ordered by
 * preference: shared inbox first (when enabled), then custom-domain agent routes.
 * Wildcard (`*@domain`) routes are excluded — they are not concrete Reply-To values.
 */
@Injectable()
export class ResolveAgentInboundAddresses {
  constructor(
    private agentRepository: AgentRepository,
    private agentIntegrationRepository: AgentIntegrationRepository,
    private integrationRepository: IntegrationRepository,
    private domainRouteRepository: DomainRouteRepository,
    private domainRepository: DomainRepository
  ) {}

  async execute(params: ResolveAgentInboundAddressesParams): Promise<string[]> {
    const agent = await this.findAgent(params.agentIdentifier, params.environmentId, params.organizationId);

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${params.agentIdentifier}" was not found.`);
    }

    return this.resolveInboundAddresses(agent, params.environmentId, params.organizationId);
  }

  /**
   * Validate workflow agent config. Throws when the agent is missing or when a
   * saved `replyTo` is not in the agent's current digestible inbound set.
   */
  async validateWorkflowAgentConfig(params: {
    agent: WorkflowAgentConfig;
    environmentId: string;
    organizationId: string;
  }): Promise<string[]> {
    const addresses = await this.execute({
      agentIdentifier: params.agent.identifier,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });

    const replyTo = params.agent.providers?.[EmailProviderIdEnum.NovuAgent]?.replyTo?.trim();

    if (replyTo && !addresses.includes(replyTo)) {
      throw new BadRequestException(
        `Reply-to address "${replyTo}" is not a digestible inbound address for agent "${params.agent.identifier}".`
      );
    }

    return addresses;
  }

  /**
   * Resolve reply-to / sender defaults for a workflow agent.
   */
  async resolveAgentEmailContext(params: AgentEmailContextParams): Promise<AgentEmailContext> {
    const agent = await this.findAgent(params.agent.identifier, params.environmentId, params.organizationId);

    if (!agent) {
      return {};
    }

    return this.buildEmailContext(agent, params.agent, params.environmentId, params.organizationId);
  }

  async resolveAgentEmailContextById(params: AgentEmailContextByIdParams): Promise<AgentEmailContext> {
    const agent = await this.findAgentById(params.agentId, params.environmentId, params.organizationId);

    if (!agent) {
      return {};
    }

    return this.buildEmailContext(agent, { identifier: agent.identifier }, params.environmentId, params.organizationId);
  }

  /**
   * Effective Reply-To for outbound email: prefer a still-valid saved value,
   * otherwise the primary inbound address (first in preference order).
   */
  async resolveEffectiveReplyTo(params: AgentEmailContextParams): Promise<string | undefined> {
    const { replyTo } = await this.resolveAgentEmailContext(params);

    return replyTo;
  }

  /**
   * Default From display name / address for a workflow-assigned agent.
   * Mirrors agent email outbound precedence: override → inbound → outbound provider From.
   */
  async resolveAgentSenderDefaults(
    params: AgentEmailContextParams
  ): Promise<{ senderName?: string; senderEmail?: string }> {
    const { senderName, senderEmail } = await this.resolveAgentEmailContext(params);

    return { senderName, senderEmail };
  }

  private async buildEmailContext(
    agent: AgentIdentity,
    agentConfig: WorkflowAgentConfig,
    environmentId: string,
    organizationId: string
  ): Promise<AgentEmailContext> {
    const { hasConnectedIntegrations, novuAgent, inboundAddresses } = await this.loadAgentInboundContext(
      agent,
      environmentId,
      organizationId
    );

    const senderDefaults = await this.buildSenderDefaults({
      agent,
      hasConnectedIntegrations,
      novuAgent,
      inboundAddresses,
      environmentId,
      organizationId,
    });

    return {
      replyTo: pickEffectiveReplyTo(agentConfig, inboundAddresses),
      ...senderDefaults,
    };
  }

  private async findAgent(
    agentIdentifier: string,
    environmentId: string,
    organizationId: string
  ): Promise<AgentIdentity | null> {
    return this.agentRepository.findOne(
      {
        identifier: agentIdentifier,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_id', 'identifier', 'name']
    );
  }

  private async findAgentById(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<AgentIdentity | null> {
    return this.agentRepository.findOne(
      {
        _id: agentId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_id', 'identifier', 'name']
    );
  }

  private async loadAgentInboundContext(
    agent: AgentIdentity,
    environmentId: string,
    organizationId: string
  ): Promise<{
    hasConnectedIntegrations: boolean;
    novuAgent?: IntegrationEntity;
    inboundAddresses: string[];
  }> {
    const { hasConnectedIntegrations, novuAgent } = await this.findConnectedNovuAgentIntegration(
      agent._id,
      environmentId,
      organizationId
    );
    const inboundAddresses = await this.resolveInboundAddresses(
      agent,
      environmentId,
      organizationId,
      novuAgent ?? null
    );

    return { hasConnectedIntegrations, novuAgent, inboundAddresses };
  }

  private async resolveInboundAddresses(
    agent: AgentIdentity,
    environmentId: string,
    organizationId: string,
    /**
     * `undefined` = not loaded yet (fetch inside shared-inbox).
     * `null` = already looked up, no Novu Agent integration.
     */
    preloadedNovuAgent?: IntegrationEntity | null
  ): Promise<string[]> {
    const addresses: string[] = [];

    const sharedInbox = await this.resolveSharedInbox({
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      agentName: agent.name,
      environmentId,
      organizationId,
      preloadedNovuAgent,
    });

    if (sharedInbox) {
      addresses.push(sharedInbox);
    }

    const customAddresses = await this.resolveCustomDomainAddresses({
      agentId: agent._id,
      environmentId,
      organizationId,
    });

    for (const address of customAddresses) {
      if (!addresses.includes(address)) {
        addresses.push(address);
      }
    }

    return addresses;
  }

  private async buildSenderDefaults(params: {
    agent: AgentIdentity;
    hasConnectedIntegrations: boolean;
    novuAgent?: IntegrationEntity;
    inboundAddresses: string[];
    environmentId: string;
    organizationId: string;
  }): Promise<{ senderName?: string; senderEmail?: string }> {
    if (!params.hasConnectedIntegrations) {
      return { senderName: params.agent.name };
    }

    const credentials = params.novuAgent?.credentials;
    const senderName = credentials?.senderName?.trim() || params.agent.name;

    const useOverride = Boolean(credentials?.useFromAddressOverride);
    const overrideFrom = credentials?.fromAddressOverride?.trim() || '';
    const outboundId = credentials?.outboundIntegrationId;
    let outboundFrom = '';

    if (outboundId) {
      const outbound = await this.integrationRepository.findOne(
        {
          _id: outboundId,
          _environmentId: params.environmentId,
          _organizationId: params.organizationId,
        },
        'credentials'
      );
      outboundFrom = outbound?.credentials?.from?.trim() || '';
    }

    const agentInbound = params.inboundAddresses[0] || '';
    const senderEmail = (useOverride && overrideFrom ? overrideFrom : '') || agentInbound || outboundFrom || undefined;

    return { senderName, senderEmail };
  }

  private async findConnectedNovuAgentIntegration(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<{ hasConnectedIntegrations: boolean; novuAgent?: IntegrationEntity }> {
    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agentId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        disconnectedAt: null,
      },
      ['_integrationId']
    );

    if (links.length === 0) {
      return { hasConnectedIntegrations: false };
    }

    const integrations = await this.integrationRepository.find(
      {
        _id: { $in: links.map((link) => link._integrationId) },
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id credentials'
    );

    return { hasConnectedIntegrations: true, novuAgent: integrations[0] };
  }

  private async resolveSharedInbox(params: {
    agentId: string;
    agentIdentifier: string;
    agentName: string;
    environmentId: string;
    organizationId: string;
    /**
     * `undefined` = not loaded yet (fetch).
     * `null` = already looked up, no Novu Agent integration.
     */
    preloadedNovuAgent?: IntegrationEntity | null;
  }): Promise<string | undefined> {
    if (!isAgentSharedInboxEnabled()) {
      return undefined;
    }

    let novuAgent: IntegrationEntity | undefined;

    if (params.preloadedNovuAgent !== undefined) {
      novuAgent = params.preloadedNovuAgent ?? undefined;
    } else {
      ({ novuAgent } = await this.findConnectedNovuAgentIntegration(
        params.agentId,
        params.environmentId,
        params.organizationId
      ));
    }

    if (!novuAgent) {
      return undefined;
    }

    if (novuAgent.credentials?.sharedInboxDisabled) {
      return undefined;
    }

    const rawSlug = novuAgent.credentials?.emailSlugPrefix;
    const slug =
      rawSlug && isValidAgentEmailSlugPrefix(rawSlug)
        ? rawSlug
        : deriveFallbackSlug(params.agentIdentifier, params.agentName);

    if (!slug) {
      return undefined;
    }

    const inboxRoutingKey = novuAgent.credentials?.inboxRoutingKey;
    if (!inboxRoutingKey) {
      return undefined;
    }

    try {
      return buildAgentSharedInbox(slug, inboxRoutingKey);
    } catch {
      return undefined;
    }
  }

  private async resolveCustomDomainAddresses(params: {
    agentId: string;
    environmentId: string;
    organizationId: string;
  }): Promise<string[]> {
    const routes = await this.domainRouteRepository.find(
      {
        destination: params.agentId,
        type: DomainRouteTypeEnum.AGENT,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_domainId', 'address']
    );

    if (routes.length === 0) {
      return [];
    }

    const domains = await this.domainRepository.find(
      {
        _id: { $in: [...new Set(routes.map((route) => route._domainId))] },
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_id', 'name']
    );

    const domainNamesById = new Map(domains.map((domain) => [domain._id, domain.name]));

    return routes
      .filter((route) => route.address && route.address !== '*')
      .map((route) => {
        const domain = domainNamesById.get(route._domainId);

        return domain ? `${route.address}@${domain}` : null;
      })
      .filter((address): address is string => Boolean(address));
  }
}

function pickEffectiveReplyTo(agent: WorkflowAgentConfig, addresses: string[]): string | undefined {
  if (addresses.length === 0) {
    return undefined;
  }

  const saved = agent.providers?.[EmailProviderIdEnum.NovuAgent]?.replyTo?.trim();

  if (saved && addresses.includes(saved)) {
    return saved;
  }

  return addresses[0];
}

function deriveFallbackSlug(identifier: string, name: string): string | undefined {
  const candidate = slugify(identifier || name || '')
    .slice(0, 32)
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return isValidAgentEmailSlugPrefix(candidate) ? candidate : undefined;
}
