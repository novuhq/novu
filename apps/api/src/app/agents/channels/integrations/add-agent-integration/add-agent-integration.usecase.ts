import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService, encryptSecret, isAgentSharedInboxEnabled } from '@novu/application-generic';
import {
  type AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  CommunityOrganizationRepository,
  EnvironmentRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  EnvironmentTypeEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
} from '@novu/shared';
import { NovuEmailProvisioningService } from '../../../email/novu-email/find-or-create-novu-email/find-or-create-novu-email.service';
import { trackAgentIntegrationConnected } from '../../../shared/analytics/agent-analytics';
import type { AgentIntegrationResponseDto } from '../../../shared/dtos';
import { toAgentIntegrationResponse } from '../../../shared/mappers/agent-response.mapper';
import { AddAgentIntegrationCommand } from './add-agent-integration.command';

@Injectable()
export class AddAgentIntegration {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly findOrCreateNovuEmail: NovuEmailProvisioningService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: AddAgentIntegrationCommand): Promise<AgentIntegrationResponseDto> {
    await this.assertNotProductionEnvironment(command.environmentId, command.organizationId);

    if (!command.integrationIdentifier && !command.providerId) {
      throw new BadRequestException('Either integrationIdentifier or providerId must be provided.');
    }

    if (command.integrationIdentifier && command.providerId) {
      throw new BadRequestException('Provide exactly one of integrationIdentifier or providerId, not both.');
    }

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier', 'name']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    if (command.providerId === EmailProviderIdEnum.NovuAgent) {
      const { response, provisionedNewLink } = await this.findOrCreateNovuEmail.execute(
        agent._id,
        command.environmentId,
        command.organizationId
      );

      if (provisionedNewLink) {
        trackAgentIntegrationConnected(this.analyticsService, {
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          agentId: agent._id,
          agentIdentifier: command.agentIdentifier,
          integrationId: response.integration._id,
          integrationIdentifier: response.integration.identifier,
          providerId: response.integration.providerId,
          channel: response.integration.channel,
          connectionSource: 'novu_email_provisioned',
        });
      }

      return response;
    }

    if (!command.integrationIdentifier) {
      throw new BadRequestException('integrationIdentifier is required when providerId is not NovuAgent.');
    }

    return this.linkExistingIntegration(agent, command);
  }

  private async linkExistingIntegration(
    agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>,
    command: AddAgentIntegrationCommand
  ): Promise<AgentIntegrationResponseDto> {
    const integration = await this.integrationRepository.findOne(
      {
        identifier: command.integrationIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '_id identifier name providerId channel active credentials'
    );

    if (!integration) {
      throw new NotFoundException(`Integration with identifier "${command.integrationIdentifier}" was not found.`);
    }

    if (integration.providerId === EmailProviderIdEnum.NovuAgent) {
      await this.enforceEmailTier(command.organizationId);
      await this.enforceSingletonEmail(agent._id, command);
      await this.seedEmailSecretKey(integration._id, command.environmentId, command.organizationId);
    }

    return this.createLink(agent, integration, command);
  }

  private async createLink(
    agent: Pick<AgentEntity, '_id' | 'identifier' | 'name'>,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'>,
    command: AddAgentIntegrationCommand
  ): Promise<AgentIntegrationResponseDto> {
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

    if (integration.providerId === ChatProviderIdEnum.Telegram) {
      const linkedElsewhere = await this.agentIntegrationRepository.findOne(
        {
          _integrationId: integration._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        ['_agentId']
      );

      if (linkedElsewhere && linkedElsewhere._agentId !== agent._id) {
        throw new ConflictException('Integration is already linked to a different agent');
      }
    }

    // Revives a tombstoned (disconnected) link when one exists for this pair —
    // a plain create would violate the unique (_agentId, _integrationId) index.
    const link = await this.agentIntegrationRepository.createOrReviveLink({
      agentId: agent._id,
      integrationId: integration._id,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const response = toAgentIntegrationResponse(link, integration, agent);

    trackAgentIntegrationConnected(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.agentIdentifier,
      integrationId: integration._id,
      integrationIdentifier: integration.identifier,
      providerId: integration.providerId,
      channel: integration.channel,
      connectionSource: 'existing_integration',
    });

    return response;
  }

  private async enforceEmailTier(organizationId: string): Promise<void> {
    if (!isAgentSharedInboxEnabled()) {
      throw new ForbiddenException('Agent Novu Email is not available in this deployment.');
    }

    const organization = await this.organizationRepository.findById(organizationId);
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
    const allowed = getFeatureForTierAsBoolean(FeatureNameEnum.AGENT_EMAIL_INTEGRATION, tier);

    if (!allowed) {
      throw new HttpException('Payment Required', HttpStatus.PAYMENT_REQUIRED);
    }
  }

  private async enforceSingletonEmail(agentId: string, command: AddAgentIntegrationCommand): Promise<void> {
    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (links.length === 0) return;

    const linkedIntegrationIds = links.map((l) => l._integrationId);
    const existing = await this.integrationRepository.find(
      {
        _id: { $in: linkedIntegrationIds },
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id'
    );

    if (existing.length > 0) {
      throw new ConflictException('Only one email integration per agent is allowed.');
    }
  }

  private async assertNotProductionEnvironment(environmentId: string, organizationId: string): Promise<void> {
    const environment = await this.environmentRepository.findOne(
      { _id: environmentId, _organizationId: organizationId },
      ['type', 'name']
    );

    if (environment?.type === EnvironmentTypeEnum.PROD) {
      throw new ForbiddenException('Agent integrations cannot be added in production environments.');
    }
  }

  private async seedEmailSecretKey(
    integrationId: string,
    environmentId: string,
    organizationId: string
  ): Promise<void> {
    await this.integrationRepository.update(
      {
        _id: integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        'credentials.secretKey': { $exists: false },
      },
      { $set: { 'credentials.secretKey': encryptSecret(randomBytes(32).toString('hex')) } }
    );
  }
}
