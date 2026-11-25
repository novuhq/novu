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
  EnvironmentEntity,
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
  EnvironmentTypeEnum,
  IConfigurations,
  ICredentialsDto,
  InAppProviderIdEnum,
  IntegrationKindEnum,
  providers,
  SmsProviderIdEnum,
  slugify,
} from '@novu/shared';
import shortid from 'shortid';
import { assertValidIntegrationRules } from '../../utils/assert-integration-rules';
import {
  restoreMaskedIntegrationConfigurations,
  restoreMaskedIntegrationCredentials,
} from '../../utils/restore-masked-integration-credentials';
import { validateOutboundIntegrationCredentials } from '../../utils/validate-outbound-integration-credentials';
import { CheckIntegrationCommand } from '../check-integration/check-integration.command';
import { CheckIntegration } from '../check-integration/check-integration.usecase';
import { applyManagedCredentialsOnCreate } from '../managed-credentials';
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

    this.assertNovuAnthropicCredentials(command);

    if (isAgentKind && command.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic) {
      await this.assertSingleAgentRuntime(command);
    }

    if (!isAgentKind) {
      await this.assertDeliveryProvider(command);
    }

    await this.assertIdentifierAvailable(command);
  }

  private assertNovuAnthropicCredentials(command: CreateIntegrationCommand): void {
    if (command.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic && !areNovuManagedClaudeCredentialsSet()) {
      throw new BadRequestException(`Creating Novu integration for ${command.providerId} provider is not allowed`);
    }
  }

  private async assertSingleAgentRuntime(command: CreateIntegrationCommand): Promise<void> {
    const count = await this.integrationRepository.count({
      _environmentId: command.environmentId,
      providerId: command.providerId,
      kind: IntegrationKindEnum.AGENT,
    });

    if (count > 0) {
      throw new ConflictException('Integration with novu provider for agent runtime already exists');
    }
  }

  private async assertDeliveryProvider(command: CreateIntegrationCommand): Promise<void> {
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

    if (this.isUnconfiguredNovuDeliveryProvider(command.providerId)) {
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

  private isUnconfiguredNovuDeliveryProvider(providerId: string): boolean {
    return (
      (providerId === SmsProviderIdEnum.Novu && !areNovuSmsCredentialsSet()) ||
      (providerId === EmailProviderIdEnum.Novu && !areNovuEmailCredentialsSet()) ||
      (providerId === ChatProviderIdEnum.Novu && !areNovuSlackCredentialsSet())
    );
  }

  private async assertIdentifierAvailable(command: CreateIntegrationCommand): Promise<void> {
    if (!command.identifier) {
      return;
    }

    const existingIntegrationWithIdentifier = await this.integrationRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      identifier: command.identifier,
    });

    if (existingIntegrationWithIdentifier) {
      throw new ConflictException('Integration with identifier already exists');
    }
  }

  /**
   * The stored secrets of the integration being duplicated. Secrets of a live environment stay there, so a copy
   * into a development environment gets none.
   */
  private async getSecretsToCopy(
    command: CreateIntegrationCommand,
    targetEnvironment: EnvironmentEntity
  ): Promise<{ credentials: ICredentialsDto; configurations: IConfigurations | undefined } | undefined> {
    if (!command.secretsSourceIntegrationId) {
      return undefined;
    }

    const source = await this.integrationRepository.findOne({
      _id: command.secretsSourceIntegrationId,
      _organizationId: command.organizationId,
      providerId: command.providerId,
    });
    if (!source) {
      throw new NotFoundException(`Integration with id ${command.secretsSourceIntegrationId} not found`);
    }

    const sourceEnvironment = await this.environmentRepository.findByIdAndOrganization(
      source._environmentId,
      command.organizationId
    );
    const leavesLiveEnvironment =
      sourceEnvironment?.type === EnvironmentTypeEnum.PROD && targetEnvironment.type !== EnvironmentTypeEnum.PROD;

    if (leavesLiveEnvironment) {
      return undefined;
    }

    return { credentials: decryptCredentials(source.credentials ?? {}), configurations: source.configurations };
  }

  /** Masked values in the request stand for the secrets of the integration being duplicated; put those in. */
  private async restoreMaskedSecrets(command: CreateIntegrationCommand, environment: EnvironmentEntity): Promise<void> {
    const secretsToCopy = await this.getSecretsToCopy(command, environment);

    if (command.credentials) {
      command.credentials = restoreMaskedIntegrationCredentials(
        command.providerId,
        command.credentials,
        secretsToCopy?.credentials
      );
    }

    if (command.configurations) {
      command.configurations = restoreMaskedIntegrationConfigurations(
        command.configurations,
        secretsToCopy?.configurations
      );
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

    await this.restoreMaskedSecrets(command, environment);

    await this.validate(command);
    assertValidIntegrationRules(command.rules);

    const isAgentKind = command.kind === IntegrationKindEnum.AGENT;

    if (!isAgentKind) {
      await validateOutboundIntegrationCredentials(command.providerId, command.credentials);
    }

    this.analyticsService.track('Create Integration - [Integrations]', command.userId, {
      providerId: command.providerId,
      channel: command.channel,
      kind: command.kind,
      _organization: command.organizationId,
    });

    try {
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

      const managedCredentials = applyManagedCredentialsOnCreate(command.providerId, command.credentials ?? {});

      const query: IntegrationQuery = {
        name,
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        providerId: command.providerId,
        credentials: encryptCredentials(managedCredentials),
        active: command.active,
        conditions: command.conditions,
        rules: command.rules ?? undefined,
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
