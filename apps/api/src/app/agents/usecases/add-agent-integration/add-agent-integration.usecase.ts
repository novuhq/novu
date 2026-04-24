import { randomBytes } from 'node:crypto';
import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { encryptSecret } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, CommunityOrganizationRepository, IntegrationRepository } from '@novu/dal';
import { ApiServiceLevelEnum, EmailProviderIdEnum, FeatureNameEnum, getFeatureForTierAsBoolean } from '@novu/shared';

import type { AgentIntegrationResponseDto } from '../../dtos';
import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';
import { AddAgentIntegrationCommand } from './add-agent-integration.command';

@Injectable()
export class AddAgentIntegration {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly organizationRepository: CommunityOrganizationRepository
  ) {}

  async execute(command: AddAgentIntegrationCommand): Promise<AgentIntegrationResponseDto> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    const integration = await this.integrationRepository.findOne(
      {
        identifier: command.integrationIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id identifier name providerId channel active'
    );

    if (!integration) {
      throw new NotFoundException(`Integration with identifier "${command.integrationIdentifier}" was not found.`);
    }

    const existingLink = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (existingLink) {
      throw new ConflictException('This integration is already linked to the agent.');
    }

    if (integration.providerId === EmailProviderIdEnum.NovuAgent) {
      await this.enforceEmailTier(command.organizationId);
      await this.prepareNovuEmailIntegration(agent._id, integration._id, command);
    }

    const link = await this.agentIntegrationRepository.create({
      _agentId: agent._id,
      _integrationId: integration._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    return toAgentIntegrationResponse(link, integration);
  }

  private async enforceEmailTier(organizationId: string): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
    const allowed = getFeatureForTierAsBoolean(FeatureNameEnum.AGENT_EMAIL_INTEGRATION, tier);

    if (!allowed) {
      throw new HttpException('Payment Required', HttpStatus.PAYMENT_REQUIRED);
    }
  }

  /**
   * Enforces the singleton constraint (one NovuAgent email integration per
   * agent) and seeds the `secretKey` credential the email adapter needs for
   * HMAC verification of inbound webhook payloads.
   */
  private async prepareNovuEmailIntegration(
    agentId: string,
    integrationId: string,
    command: AddAgentIntegrationCommand
  ): Promise<void> {
    await this.enforceSingletonEmail(agentId, command);
    await this.seedEmailSecretKey(integrationId, command.environmentId, command.organizationId);
  }

  private async enforceSingletonEmail(
    agentId: string,
    command: AddAgentIntegrationCommand
  ): Promise<void> {
    const existingLinks = await this.agentIntegrationRepository.find(
      {
        _agentId: agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (existingLinks.length === 0) return;

    const linkedIntegrationIds = existingLinks.map((link) => link._integrationId);
    const linkedEmailIntegrations = await this.integrationRepository.find(
      {
        _id: { $in: linkedIntegrationIds },
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id'
    );

    if (linkedEmailIntegrations.length > 0) {
      throw new ConflictException('Only one email integration per agent is allowed.');
    }
  }

  private async seedEmailSecretKey(
    integrationId: string,
    environmentId: string,
    organizationId: string
  ): Promise<void> {
    const dedicatedSecret = randomBytes(32).toString('hex');

    await this.integrationRepository.update(
      { _id: integrationId, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { 'credentials.secretKey': encryptSecret(dedicatedSecret) } }
    );
  }
}
