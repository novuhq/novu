import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { encryptSecret } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  CommunityOrganizationRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  EmailProviderIdEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  providers,
  slugify,
} from '@novu/shared';
import { ClientSession } from 'mongoose';
import shortid from 'shortid';

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
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    if (command.providerId === EmailProviderIdEnum.NovuAgent) {
      return this.findOrCreateNovuEmailLink(agent._id, command);
    }

    return this.linkExistingIntegration(agent._id, command);
  }

  /**
   * Standard path: link an existing integration (by identifier) to the agent.
   * Used for Slack, Teams, WhatsApp, and any provider where the Integration
   * document already exists.
   */
  private async linkExistingIntegration(
    agentId: string,
    command: AddAgentIntegrationCommand
  ): Promise<AgentIntegrationResponseDto> {
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

    if (integration.providerId === EmailProviderIdEnum.NovuAgent) {
      await this.enforceEmailTier(command.organizationId);
      await this.enforceSingletonEmail(agentId, command);
      await this.seedEmailSecretKey(integration._id, command.environmentId, command.organizationId);
    }

    return this.createLink(agentId, integration, command);
  }

  /**
   * Auto-creation path for NovuAgent email: find the agent's existing
   * NovuAgent integration link, or create a new Integration + link atomically.
   * Idempotent — safe to call multiple times for the same agent.
   */
  private async findOrCreateNovuEmailLink(
    agentId: string,
    command: AddAgentIntegrationCommand
  ): Promise<AgentIntegrationResponseDto> {
    await this.enforceEmailTier(command.organizationId);

    const existingLink = await this.findExistingNovuEmailLink(agentId, command);
    if (existingLink) {
      return existingLink;
    }

    return this.agentIntegrationRepository.withTransaction(async (session) => {
      const recheck = await this.findExistingNovuEmailLink(agentId, command);
      if (recheck) {
        return recheck;
      }

      const displayName = providers.find((p) => p.id === EmailProviderIdEnum.NovuAgent)?.displayName ?? 'Novu Email';
      const identifier = `${slugify(displayName)}-${shortid.generate()}`;

      const integration = await this.integrationRepository.create(
        {
          providerId: EmailProviderIdEnum.NovuAgent,
          channel: ChannelTypeEnum.EMAIL,
          credentials: { secretKey: encryptSecret(randomBytes(32).toString('hex')) },
          configurations: {},
          name: displayName,
          identifier,
          active: true,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        } as any,
        { session }
      );

      return this.createLink(agentId, integration, command, session);
    });
  }

  private async findExistingNovuEmailLink(
    agentId: string,
    command: AddAgentIntegrationCommand
  ): Promise<AgentIntegrationResponseDto | null> {
    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (links.length === 0) return null;

    const linkedIntegrationIds = links.map((l) => l._integrationId);
    const emailIntegration = await this.integrationRepository.findOne(
      {
        _id: { $in: linkedIntegrationIds } as unknown as string,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id identifier name providerId channel active'
    );

    if (!emailIntegration) return null;

    const link = links.find((l) => l._integrationId === emailIntegration._id);
    if (!link) return null;

    return toAgentIntegrationResponse(link, emailIntegration);
  }

  private async createLink(
    agentId: string,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'>,
    command: AddAgentIntegrationCommand,
    session: ClientSession | null = null
  ): Promise<AgentIntegrationResponseDto> {
    const existingLink = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agentId,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id'],
      { session }
    );

    if (existingLink) {
      throw new ConflictException('This integration is already linked to the agent.');
    }

    const link = await this.agentIntegrationRepository.create(
      {
        _agentId: agentId,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { session }
    );

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

  private async seedEmailSecretKey(
    integrationId: string,
    environmentId: string,
    organizationId: string
  ): Promise<void> {
    await this.integrationRepository.update(
      { _id: integrationId, _environmentId: environmentId, _organizationId: organizationId },
      { $set: { 'credentials.secretKey': encryptSecret(randomBytes(32).toString('hex')) } }
    );
  }
}
