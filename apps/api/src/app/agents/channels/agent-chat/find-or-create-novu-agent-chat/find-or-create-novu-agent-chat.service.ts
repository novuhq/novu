import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, providers, slugify } from '@novu/shared';
import { ClientSession } from 'mongoose';
import shortid from 'shortid';

import type { AgentIntegrationResponseDto } from '../../../shared/dtos';
import { toAgentIntegrationResponse } from '../../../shared/mappers/agent-response.mapper';
import {
  agentLinkAwaitingInboundConnectionFilter,
  hasAgentInboundConnection,
} from '../../../shared/util/agent-inbound-connection';

export type FindOrCreateNovuAgentChatResult = {
  response: AgentIntegrationResponseDto;
  provisionedNewLink: boolean;
};

@Injectable()
export class NovuAgentChatProvisioningService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  /**
   * Ensure the environment has a `novu-agent-chat` integration and link the agent
   * to it. Idempotent — safe to call repeatedly for the same agent.
   */
  async execute(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<FindOrCreateNovuAgentChatResult> {
    const agent = await this.agentRepository.findOne(
      { _id: agentId, _environmentId: environmentId, _organizationId: organizationId },
      ['_id', 'identifier', 'name']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${agentId}" was not found.`);
    }

    const existing = await this.findExistingLink(agent, environmentId, organizationId);
    if (existing) {
      const response = await this.ensureConnectedAt(existing, environmentId, organizationId);

      return { response, provisionedNewLink: false };
    }

    return this.agentIntegrationRepository.withTransaction(async (session) => {
      const recheck = await this.findExistingLink(agent, environmentId, organizationId);
      if (recheck) {
        const response = await this.ensureConnectedAt(recheck, environmentId, organizationId, session);

        return { response, provisionedNewLink: false };
      }

      const integration = await this.findOrCreateEnvironmentIntegration(environmentId, organizationId, session);
      const response = await this.createLink(agent, integration, environmentId, organizationId, session);

      return { response, provisionedNewLink: true };
    });
  }

  private async findOrCreateEnvironmentIntegration(
    environmentId: string,
    organizationId: string,
    session: ClientSession | null
  ): Promise<IntegrationEntity> {
    const existing = await this.integrationRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: ChatProviderIdEnum.NovuAgentChat,
      },
      '_id identifier name providerId channel active credentials'
    );

    if (existing) {
      return existing;
    }

    const displayName =
      providers.find((p) => p.id === ChatProviderIdEnum.NovuAgentChat)?.displayName ?? 'Novu Agent Chat';
    const identifier = `${slugify(displayName)}-${shortid.generate()}`;

    return this.integrationRepository.create(
      {
        providerId: ChatProviderIdEnum.NovuAgentChat,
        channel: ChannelTypeEnum.CHAT,
        credentials: { hmac: false },
        configurations: {},
        name: displayName,
        identifier,
        active: true,
        _environmentId: environmentId,
        _organizationId: organizationId,
      } as any,
      { session }
    );
  }

  private async findExistingLink(
    agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>,
    environmentId: string,
    organizationId: string
  ): Promise<AgentIntegrationResponseDto | null> {
    const links = await this.agentIntegrationRepository.find(
      { _agentId: agent._id, _environmentId: environmentId, _organizationId: organizationId },
      '*'
    );

    if (links.length === 0) {
      return null;
    }

    const linkedIntegrationIds = links.map((l) => l._integrationId);
    const agentChatIntegration = await this.integrationRepository.findOne(
      {
        _id: { $in: linkedIntegrationIds } as unknown as string,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: ChatProviderIdEnum.NovuAgentChat,
      },
      '_id identifier name providerId channel active credentials'
    );

    if (!agentChatIntegration) {
      return null;
    }

    const link = links.find((l) => l._integrationId === agentChatIntegration._id);
    if (!link) {
      return null;
    }

    return toAgentIntegrationResponse(link, agentChatIntegration, agent);
  }

  private async createLink(
    agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'> &
      Partial<Pick<IntegrationEntity, 'credentials'>>,
    environmentId: string,
    organizationId: string,
    session: ClientSession | null
  ): Promise<AgentIntegrationResponseDto> {
    const existingLink = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: integration._id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_id']
    );

    if (existingLink) {
      throw new ConflictException('This integration is already linked to the agent.');
    }

    const link = await this.agentIntegrationRepository.createOrReviveLink({
      agentId: agent._id,
      integrationId: integration._id,
      environmentId,
      organizationId,
      session,
    });

    // Agent Chat has no third-party OAuth or credentials step — the channel is ready as soon as
    // the integration is linked. Stamp connectedAt at provision so the Dashboard shows Connected
    // instead of waiting for the first in-app message.
    const connectedAt = hasAgentInboundConnection(link.connectedAt) ? link.connectedAt : new Date();
    if (!hasAgentInboundConnection(link.connectedAt)) {
      await this.agentIntegrationRepository.update(
        {
          _id: link._id,
          _environmentId: environmentId,
          _organizationId: organizationId,
          ...agentLinkAwaitingInboundConnectionFilter(),
        },
        { $set: { connectedAt } },
        { session }
      );
    }

    return toAgentIntegrationResponse({ ...link, connectedAt }, integration, agent);
  }

  /**
   * Backfill connectedAt for Agent Chat links created before provision-time stamping.
   * Idempotent when the link is already connected.
   */
  private async ensureConnectedAt(
    response: AgentIntegrationResponseDto,
    environmentId: string,
    organizationId: string,
    session: ClientSession | null = null
  ): Promise<AgentIntegrationResponseDto> {
    if (hasAgentInboundConnection(response.connectedAt)) {
      return response;
    }

    const connectedAt = new Date();
    await this.agentIntegrationRepository.update(
      {
        _id: response._id,
        _environmentId: environmentId,
        _organizationId: organizationId,
        ...agentLinkAwaitingInboundConnectionFilter(),
      },
      { $set: { connectedAt } },
      { session }
    );

    return { ...response, connectedAt: connectedAt.toISOString() };
  }
}
