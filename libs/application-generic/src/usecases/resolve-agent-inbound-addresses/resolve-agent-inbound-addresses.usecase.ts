import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  AgentRepository,
  DomainRepository,
  DomainRouteRepository,
  IntegrationRepository,
} from '@novu/dal';
import {
  DomainRouteTypeEnum,
  EmailProviderIdEnum,
  type WorkflowAgentConfig,
  slugify,
} from '@novu/shared';
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
    const agent = await this.agentRepository.findOne(
      {
        identifier: params.agentIdentifier,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      '*'
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${params.agentIdentifier}" was not found.`);
    }

    const addresses: string[] = [];

    const sharedInbox = await this.resolveSharedInbox({
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      agentName: agent.name,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });

    if (sharedInbox) {
      addresses.push(sharedInbox);
    }

    const customAddresses = await this.resolveCustomDomainAddresses({
      agentId: agent._id,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });

    for (const address of customAddresses) {
      if (!addresses.includes(address)) {
        addresses.push(address);
      }
    }

    return addresses;
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
   * Effective Reply-To for outbound email: prefer a still-valid saved value,
   * otherwise the primary inbound address (first in preference order).
   */
  async resolveEffectiveReplyTo(params: {
    agent: WorkflowAgentConfig;
    environmentId: string;
    organizationId: string;
  }): Promise<string | undefined> {
    const addresses = await this.execute({
      agentIdentifier: params.agent.identifier,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });

    if (addresses.length === 0) {
      return undefined;
    }

    const saved = params.agent.providers?.[EmailProviderIdEnum.NovuAgent]?.replyTo?.trim();

    if (saved && addresses.includes(saved)) {
      return saved;
    }

    return addresses[0];
  }

  /**
   * Default From display name / address for a workflow-assigned agent.
   * Mirrors agent email outbound precedence: override → inbound → outbound provider From.
   */
  async resolveAgentSenderDefaults(params: {
    agent: WorkflowAgentConfig;
    environmentId: string;
    organizationId: string;
  }): Promise<{ senderName?: string; senderEmail?: string }> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: params.agent.identifier,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      '*'
    );

    if (!agent) {
      return {};
    }

    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agent._id,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        disconnectedAt: null,
      },
      ['_integrationId']
    );

    if (links.length === 0) {
      return { senderName: agent.name };
    }

    const novuAgentIntegrations = await this.integrationRepository.find(
      {
        _id: { $in: links.map((link) => link._integrationId) },
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id credentials providerId'
    );

    const novuAgent = novuAgentIntegrations[0];
    const credentials = novuAgent?.credentials;
    const senderName = credentials?.senderName?.trim() || agent.name;

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

    const inboundAddresses = await this.execute({
      agentIdentifier: params.agent.identifier,
      environmentId: params.environmentId,
      organizationId: params.organizationId,
    });
    const agentInbound = inboundAddresses[0] || '';
    const senderEmail = (useOverride && overrideFrom ? overrideFrom : '') || agentInbound || outboundFrom || undefined;

    return { senderName, senderEmail };
  }

  private async resolveSharedInbox(params: {
    agentId: string;
    agentIdentifier: string;
    agentName: string;
    environmentId: string;
    organizationId: string;
  }): Promise<string | undefined> {
    if (!isAgentSharedInboxEnabled()) {
      return undefined;
    }

    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: params.agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        disconnectedAt: null,
      },
      ['_integrationId']
    );

    if (links.length === 0) {
      return undefined;
    }

    const integrations = await this.integrationRepository.find(
      {
        _id: { $in: links.map((link) => link._integrationId) },
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id credentials providerId'
    );

    const novuAgent = integrations[0];
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

function deriveFallbackSlug(identifier: string, name: string): string | undefined {
  const candidate = slugify(identifier || name || '')
    .slice(0, 32)
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return isValidAgentEmailSlugPrefix(candidate) ? candidate : undefined;
}
