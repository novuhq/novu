import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  areNovuEmailCredentialsSet,
  areNovuManagedClaudeCredentialsSet,
  areNovuSlackCredentialsSet,
  areNovuSmsCredentialsSet,
  decryptCredentials,
  encryptCredentials,
  PinoLogger,
  resolveAgentRuntime,
} from '@novu/application-generic';
import {
  DalException,
  EnvironmentRepository,
  IntegrationEntity,
  IntegrationQuery,
  IntegrationRepository,
} from '@novu/dal';
import {
  AgentRuntimeProviderIdEnum,
  CHANNELS_WITH_PRIMARY,
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  IntegrationKindEnum,
  providers,
  SmsProviderIdEnum,
  slugify,
} from '@novu/shared';
import shortid from 'shortid';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { ensureWhatsAppManagedCredentials } from '../whatsapp/whatsapp-credentials.utils';
import { CreateIntegrationCommand } from './create-integration.command';

@Injectable()
export class CreateIntegration {
  @Inject()
  private checkIntegration: CheckIntegration;
  constructor(
    private integrationRepository: IntegrationRepository,
    private analyticsService: AnalyticsService,
    private environmentRepository: EnvironmentRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(CreateIntegration.name);
  }

  private async calculatePriorityAndPrimary(command: CreateIntegrationCommand) {
    const result: { primary: boolean; priority: number } = {
      primary: false,
      priority: 0,
    };

    const highestPriorityIntegration = await this.integrationRepository.findHighestPriorityIntegration({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      channel: command.channel,
    });

    if (highestPriorityIntegration?.primary) {
      result.priority = highestPriorityIntegration.priority;
      await this.integrationRepository.update(
        {
          _id: highestPriorityIntegration._id,
          _organizationId: command.organizationId,
          _environmentId: command.environmentId,
        },
        {
          $set: {
            priority: highestPriorityIntegration.priority + 1,
          },
        }
      );
    } else {
      result.priority = highestPriorityIntegration ? highestPriorityIntegration.priority + 1 : 1;
      result.primary = true;
    }

    return result;
  }

  private async validate(command: CreateIntegrationCommand): Promise<void> {
    const isAgentKind = command.kind === IntegrationKindEnum.AGENT;

    if (command.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic && !areNovuManagedClaudeCredentialsSet()) {
      throw new BadRequestException(`Creating Novu integration for ${command.providerId} provider is not allowed`);
    }

    if (isAgentKind && command.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
      const count = await this.integrationRepository.count({
        _environmentId: command.environmentId,
        providerId: command.providerId,
        kind: IntegrationKindEnum.AGENT,
      });

      if (count > 0) {
        throw new ConflictException('Integration with novu provider for agent runtime already exists');
      }
    }

    if (!isAgentKind) {
      const existingIntegration = await this.integrationRepository.findOne({
        _environmentId: command.environmentId,
        providerId: command.providerId,
        channel: command.channel,
      });

      if (
        existingIntegration &&
        command.providerId === InAppProviderIdEnum.Novu &&
        command.channel === ChannelTypeEnum.IN_APP
      ) {
        throw new BadRequestException('One environment can only have one In app provider');
      }

      if (
        (command.providerId === SmsProviderIdEnum.Novu && !areNovuSmsCredentialsSet()) ||
        (command.providerId === EmailProviderIdEnum.Novu && !areNovuEmailCredentialsSet()) ||
        (command.providerId === ChatProviderIdEnum.Novu && !areNovuSlackCredentialsSet())
      ) {
        throw new BadRequestException(`Creating Novu integration for ${command.providerId} provider is not allowed`);
      }

      if (command.providerId === SmsProviderIdEnum.Novu || command.providerId === EmailProviderIdEnum.Novu) {
        const count = await this.integrationRepository.count({
          _environmentId: command.environmentId,
          providerId: command.providerId,
          channel: command.channel,
        });

        if (count > 0) {
          throw new ConflictException(
            `Integration with novu provider for ${command.channel?.toLowerCase()} channel already exists`
          );
        }
      }
    }

    if (command.identifier) {
      const existingIntegrationWithIdentifier = await this.integrationRepository.findOne({
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
        identifier: command.identifier,
      });

      if (existingIntegrationWithIdentifier) {
        throw new ConflictException('Integration with identifier already exists');
      }
    }
  }

  async execute(command: CreateIntegrationCommand): Promise<IntegrationEntity> {
    const environment = await this.environmentRepository.findByIdAndOrganization(
      command.environmentId,
      command.organizationId
    );
    if (!environment) {
      throw new NotFoundException(`Environment with id ${command.environmentId} not found`);
    }

    await this.validate(command);

    this.analyticsService.track('Create Integration - [Integrations]', command.userId, {
      providerId: command.providerId,
      channel: command.channel,
      kind: command.kind,
      _organization: command.organizationId,
    });

    try {
      const isAgentKind = command.kind === IntegrationKindEnum.AGENT;

      if (command.check && !isAgentKind) {
        await this.checkIntegration.execute(
          CheckIntegrationCommand.create({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            providerId: command.providerId,
            channel: command.channel,
            credentials: command.credentials,
          })
        );
      }

      const providerIdCapitalized = `${command.providerId.charAt(0).toUpperCase()}${command.providerId.slice(1)}`;
      const defaultName =
        providers.find((provider) => provider.id === command.providerId)?.displayName ?? providerIdCapitalized;
      const name = command.name ?? defaultName;
      const identifier = command.identifier ?? `${slugify(name)}-${shortid.generate()}`;

      const managedCredentials = ensureWhatsAppManagedCredentials({
        providerId: command.providerId,
        nextCredentials: command.credentials ?? {},
      });

      const query: IntegrationQuery = {
        name,
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: command.providerId,
        credentials: encryptCredentials(managedCredentials),
        active: command.active,
        conditions: command.conditions,
        configurations: command.configurations,
        kind: command.kind ?? IntegrationKindEnum.DELIVERY,
      };

      if (!isAgentKind && command.channel) {
        query.channel = command.channel;
      }

      const isActiveAndChannelSupportsPrimary =
        !isAgentKind && command.active && command.channel && CHANNELS_WITH_PRIMARY.includes(command.channel);

      if (isActiveAndChannelSupportsPrimary) {
        const { primary, priority } = await this.calculatePriorityAndPrimary(command);

        query.primary = primary;
        query.priority = priority;
      }

      const integrationEntity = await this.integrationRepository.create(query);

      const shouldProvisionAgentRuntime =
        isAgentKind && command.providerId !== AgentRuntimeProviderIdEnum.NovuAnthropic;

      if (shouldProvisionAgentRuntime) {
        await this.provisionAgentRuntimeIntegration(integrationEntity._id, identifier, command);
      }

      return integrationEntity;
    } catch (e) {
      if (e instanceof DalException) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  private async provisionAgentRuntimeIntegration(
    integrationId: string,
    integrationName: string,
    command: CreateIntegrationCommand
  ): Promise<void> {
    const providerId = command.providerId as AgentRuntimeProviderIdEnum;
    const resolved = resolveAgentRuntime(providerId, command.credentials ?? {});

    if (!resolved) {
      throw new BadRequestException(
        `Integration "${integrationId}" has incomplete runtime credentials. Complete setup before provisioning.`
      );
    }

    const provider = resolved.provider;

    try {
      await provider.validateCredentials(resolved.validateCredentialsInput);
      const result = await provider.provisionIntegration({ integrationName });

      const updatedCredentials = encryptCredentials({
        ...(command.credentials ?? {}),
        ...result.credentialsUpdate,
      });

      await this.integrationRepository.update(
        {
          _id: integrationId,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { $set: { credentials: updatedCredentials } }
      );
    } catch (provisionError) {
      this.logger.error(
        { err: provisionError, integrationId, providerId: command.providerId },
        'Failed to provision agent runtime integration; rolling back integration record'
      );

      try {
        await this.integrationRepository.delete({
          _id: integrationId,
          _organizationId: command.organizationId,
        });
      } catch (deleteError) {
        this.logger.error(
          { err: deleteError, integrationId },
          'Failed to delete integration during rollback — manual cleanup required'
        );
      }

      throw provisionError;
    }
  }
}
