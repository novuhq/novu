import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  CompileTemplate,
  CompileTemplateCommand,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  GetDecryptedIntegrations,
  GetDecryptedIntegrationsCommand,
  GetNovuProviderCredentials,
  InstrumentUsecase,
  SelectIntegration,
  SelectVariant,
  SignalsFactory,
} from '@novu/application-generic';
import { IntegrationEntity, MessageEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import { ChannelTypeEnum, ExecutionDetailsSourceEnum, ExecutionDetailsStatusEnum } from '@novu/shared';
import { addBreadcrumb } from '@sentry/node';
import { PlatformException } from '../../../shared/utils';
import { SendMessageBase } from './send-message.base';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus } from './send-message-type.usecase';

const LOG_CONTEXT = 'SendMessageSignals';

type SignalsStepOutputs = {
  body?: string;
  enabledIntegrations?: string[];
};

export function filterSignalsIntegrationsByEnabledIdentifiers<T extends { identifier: string }>(
  integrations: T[],
  enabledIntegrations?: string[]
): T[] {
  if (!enabledIntegrations || enabledIntegrations.length === 0) {
    return integrations;
  }

  const selectedIdentifiers = new Set(enabledIntegrations);

  return integrations.filter((integration) => selectedIdentifiers.has(integration.identifier));
}

@Injectable()
export class SendMessageSignals extends SendMessageBase {
  channelType = ChannelTypeEnum.SIGNALS;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef,
    private getDecryptedIntegrations: GetDecryptedIntegrations
  ) {
    super(
      messageRepository,
      createExecutionDetails,
      subscriberRepository,
      selectIntegration,
      getNovuProviderCredentials,
      selectVariant,
      moduleRef
    );
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageChannelCommand): Promise<SendMessageResult> {
    addBreadcrumb({
      message: 'Sending Signals',
    });

    const bridgeOutputs = command.bridgeData?.outputs as SignalsStepOutputs | undefined;
    const { content, enabledIntegrations } = await this.resolveContentAndProviders(command, bridgeOutputs);

    if (!content) {
      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.MESSAGE_CONTENT_NOT_GENERATED,
      };
    }

    const integrations = await this.getDecryptedIntegrations.execute(
      GetDecryptedIntegrationsCommand.create({
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userId: command.userId,
        channelType: ChannelTypeEnum.SIGNALS,
        active: true,
        scopeToEnvironment: true,
      })
    );

    const selectedIntegrations = filterSignalsIntegrationsByEnabledIdentifiers(integrations, enabledIntegrations);

    if (selectedIntegrations.length === 0) {
      const noActiveIntegrations = integrations.length === 0;

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: noActiveIntegrations
              ? 'no_active_signals_integrations'
              : 'enabled_integrations_filter_matched_none',
            requestedEnabledIntegrations: enabledIntegrations ?? [],
            availableIdentifiers: integrations.map((integration) => integration.identifier),
          }),
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
      };
    }

    let status: SendMessageStatus = SendMessageStatus.SUCCESS;
    const signalsFactory = new SignalsFactory();

    for (const integration of selectedIntegrations) {
      const result = await this.sendToIntegration(command, integration, content, signalsFactory);
      status = this.mergeStatus(status, result.status);
    }

    if (status === SendMessageStatus.FAILED) {
      return {
        status,
        errorMessage: DetailEnum.PROVIDER_ERROR,
      };
    }

    return { status };
  }

  private async resolveContentAndProviders(
    command: SendMessageChannelCommand,
    bridgeOutputs?: SignalsStepOutputs
  ): Promise<{ content: string; enabledIntegrations?: string[] }> {
    const enabledIntegrations = bridgeOutputs?.enabledIntegrations;
    let content = bridgeOutputs?.body || '';

    if (command.bridgeData) {
      return { content, enabledIntegrations };
    }

    const { step } = command;
    if (!step?.template) {
      throw new PlatformException('Signals channel template not found');
    }

    const template = await this.processVariants(command);
    if (template) {
      step.template = template;
    }

    const { subscriber } = command.compileContext;
    const i18nInstance = await this.initiateTranslations(
      command.environmentId,
      command.organizationId,
      subscriber.locale
    );

    try {
      content = await this.compileTemplate.execute(
        CompileTemplateCommand.create({
          template: (step.template.content as string) || '',
          data: this.getCompilePayload(command.compileContext),
        }),
        i18nInstance
      );
    } catch (error) {
      await this.sendErrorHandlebars(command.job, error.message);

      return { content: '', enabledIntegrations };
    }

    return { content, enabledIntegrations };
  }

  private async sendToIntegration(
    command: SendMessageChannelCommand,
    integration: IntegrationEntity,
    content: string,
    signalsFactory: SignalsFactory
  ): Promise<SendMessageResult> {
    await this.sendSelectedIntegrationExecution(command.job, integration);

    const overrides = {
      ...(integration.channel ? command.overrides[integration.channel] || {} : {}),
      ...(command.overrides[integration.providerId] || {}),
    };

    const messagePayload = { ...command.payload };
    delete messagePayload.attachments;

    const message: MessageEntity = await this.messageRepository.create({
      _notificationId: command.notificationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      _subscriberId: command._subscriberId,
      _templateId: command._templateId,
      _messageTemplateId: command.step.template?._id,
      channel: ChannelTypeEnum.SIGNALS,
      transactionId: command.transactionId,
      content: this.storeContent() ? content : null,
      providerId: integration.providerId,
      payload: messagePayload,
      overrides,
      templateIdentifier: command.identifier,
      stepId: command.step.stepId,
      _jobId: command.jobId,
      tags: command.tags,
      severity: command.severity,
      contextKeys: command.contextKeys,
    });

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.MESSAGE_CREATED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.PENDING,
        messageId: message._id,
        isTest: false,
        isRetry: false,
        raw: this.storeContent() ? JSON.stringify(messagePayload) : null,
      })
    );

    try {
      const handler = signalsFactory.getHandler(integration);
      if (!handler) {
        throw new PlatformException(`Signals handler for provider ${integration.providerId} is not found`);
      }

      const result = await handler.send({
        content: overrides.content || content,
        customData: overrides.customData || {},
        bridgeProviderData: this.combineOverrides(
          command.bridgeData,
          command.overrides,
          command.step.stepId,
          integration.providerId
        ),
      });

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.MESSAGE_SENT,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.SUCCESS,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify(result),
        })
      );

      return { status: SendMessageStatus.SUCCESS };
    } catch (error) {
      Logger.error(error, `Sending signal via ${integration.providerId} failed`, LOG_CONTEXT);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          messageId: message._id,
          detail: DetailEnum.PROVIDER_ERROR,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ message: error instanceof Error ? error.message : String(error) }),
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.PROVIDER_ERROR,
      };
    }
  }

  private mergeStatus(current: SendMessageStatus, next: SendMessageStatus): SendMessageStatus {
    if (next === SendMessageStatus.FAILED || current === SendMessageStatus.FAILED) {
      return SendMessageStatus.FAILED;
    }

    if (next === SendMessageStatus.SKIPPED || current === SendMessageStatus.SKIPPED) {
      return SendMessageStatus.SKIPPED;
    }

    return SendMessageStatus.SUCCESS;
  }
}
