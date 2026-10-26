import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  IntegrationEntity,
  type IntegrationQuery,
  IntegrationRepository,
} from '@novu/dal';
import { ChannelTypeEnum, ChatProviderIdEnum, providers, slugify } from '@novu/shared';
import { ClientSession } from 'mongoose';
import shortid from 'shortid';

import type { AgentIntegrationResponseDto } from '../../../shared/dtos';
import { toAgentIntegrationResponse } from '../../../shared/mappers/agent-response.mapper';

export type FindOrCreateNovuVoiceResult = {
  response: AgentIntegrationResponseDto;
  provisionedNewLink: boolean;
};

/**
 * One `agent-voice-call` integration per environment, linked to a relay agent.
 * The row holds no secrets: the Twilio number and ElevenLabs ids are deployment config.
 */
@Injectable()
export class NovuVoiceProvisioningService {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  async execute(agentId: string, environmentId: string, organizationId: string): Promise<FindOrCreateNovuVoiceResult> {
    const agent = await this.agentRepository.findOne(
      { _id: agentId, _environmentId: environmentId, _organizationId: organizationId },
      ['_id', 'identifier', 'name']
    );

    if (!agent) {
      throw new NotFoundException(`Agent "${agentId}" was not found.`);
    }

    const existing = await this.findExistingLink(agent, environmentId, organizationId);
    if (existing) {
      return { response: existing, provisionedNewLink: false };
    }

    return this.agentIntegrationRepository.withTransaction(async (session) => {
      const recheck = await this.findExistingLink(agent, environmentId, organizationId);
      if (recheck) {
        return { response: recheck, provisionedNewLink: false };
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
        providerId: ChatProviderIdEnum.AgentVoiceCall,
      },
      '_id identifier name providerId channel active credentials'
    );

    if (existing) {
      return existing;
    }

    const displayName = providers.find((p) => p.id === ChatProviderIdEnum.AgentVoiceCall)?.displayName ?? 'Voice';
    const identifier = `${slugify(displayName)}-${shortid.generate()}`;

    const payload: IntegrationQuery = {
      providerId: ChatProviderIdEnum.AgentVoiceCall,
      channel: ChannelTypeEnum.CHAT,
      credentials: {},
      configurations: {},
      name: displayName,
      identifier,
      active: true,
      _environmentId: environmentId,
      _organizationId: organizationId,
    };

    return this.integrationRepository.create(payload, { session });
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

    const linkedIntegrationIds = links.map((link) => link._integrationId);
    const voiceIntegration = await this.integrationRepository.findOne(
      {
        _id: { $in: linkedIntegrationIds },
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: ChatProviderIdEnum.AgentVoiceCall,
      },
      '_id identifier name providerId channel active credentials'
    );

    if (!voiceIntegration) {
      return null;
    }

    const link = links.find((candidate) => candidate._integrationId === voiceIntegration._id);
    if (!link) {
      return null;
    }

    return toAgentIntegrationResponse(link, voiceIntegration, agent);
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

    return toAgentIntegrationResponse(link, integration, agent);
  }
}
