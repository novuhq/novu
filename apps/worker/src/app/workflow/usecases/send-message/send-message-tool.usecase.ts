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
  ToolFactory,
} from '@novu/application-generic';
import { IntegrationEntity, MessageEntity, MessageRepository, SubscriberRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  ToolProviderIdEnum,
} from '@novu/shared';
import { ChannelData } from '@novu/stateless';
import { addBreadcrumb } from '@sentry/node';
import { PlatformException } from '../../../shared/utils';
import { ResolveChannelEndpointsCommand } from './channel-endpoint-resolution/resolve-channel-endpoints.command';
import {
  IntegrationEndpoints,
  ResolveChannelEndpoints,
} from './channel-endpoint-resolution/resolve-channel-endpoints.usecase';
import { SendMessageBase } from './send-message.base';
import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus } from './send-message-type.usecase';

const LOG_CONTEXT = 'SendMessageTool';

/**
 * Tool providers whose routing is per-subscriber via `ChannelEndpoint` — they
 * cannot fall back to env-level integration credentials. If no endpoint is
 * resolved for the subscriber, we silently skip the integration (execution
 * detail + `SKIPPED` status) rather than attempting a credential-based send.
 */
export const ENDPOINT_ROUTED_TOOL_PROVIDERS = new Set<string>([
  ToolProviderIdEnum.PagerDuty,
  ToolProviderIdEnum.Opsgenie,
]);

export function isEndpointRoutedToolProvider(providerId: string): boolean {
  return ENDPOINT_ROUTED_TOOL_PROVIDERS.has(providerId);
}

type ToolStepOutputs = {
  body?: string;
};

@Injectable()
export class SendMessageTool extends SendMessageBase {
  channelType = ChannelTypeEnum.TOOL;

  constructor(
    protected subscriberRepository: SubscriberRepository,
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails,
    private compileTemplate: CompileTemplate,
    protected selectIntegration: SelectIntegration,
    protected getNovuProviderCredentials: GetNovuProviderCredentials,
    protected selectVariant: SelectVariant,
    protected moduleRef: ModuleRef,
    private getDecryptedIntegrations: GetDecryptedIntegrations,
    private resolveChannelEndpoints: ResolveChannelEndpoints
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
      message: 'Sending Tool',
    });

    const bridgeOutputs = command.bridgeData?.outputs as ToolStepOutputs | undefined;
    const { content } = await this.resolveContentAndProviders(command, bridgeOutputs);

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
        channelType: ChannelTypeEnum.TOOL,
        active: true,
        scopeToEnvironment: true,
      })
    );

    if (integrations.length === 0) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            reason: 'no_active_tool_integrations',
            availableIdentifiers: [],
          }),
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
      };
    }

    const endpointsByIntegration = await this.resolveEndpointsByIntegration(command);

    let status: SendMessageStatus = SendMessageStatus.SUCCESS;
    let anySent = false;
    let anySkipped = false;
    const toolFactory = new ToolFactory();

    for (const integration of integrations) {
      const resolved = endpointsByIntegration.get(integration.identifier);
      const channelDataList = resolved?.channelData ?? [];

      if (channelDataList.length === 0) {
        if (isEndpointRoutedToolProvider(integration.providerId)) {
          await this.emitSkippedNoEndpoint(command, integration);
          anySkipped = true;
          continue;
        }

        // The tool webhook is the only remaining credential-routed provider —
        // it routes via env-level integration credentials, so preserve the
        // legacy send path.
        const result = await this.sendToIntegration(command, integration, content, toolFactory, undefined);
        status = this.mergeStatus(status, result.status);
        if (result.status === SendMessageStatus.SUCCESS) anySent = true;
        else if (result.status === SendMessageStatus.SKIPPED) anySkipped = true;
        continue;
      }

      for (const channelData of channelDataList) {
        const result = await this.sendToIntegration(command, integration, content, toolFactory, channelData);
        status = this.mergeStatus(status, result.status);
        if (result.status === SendMessageStatus.SUCCESS) anySent = true;
        else if (result.status === SendMessageStatus.SKIPPED) anySkipped = true;
      }
    }

    if (status === SendMessageStatus.FAILED) {
      return {
        status,
        errorMessage: DetailEnum.PROVIDER_ERROR,
      };
    }

    if (anySent) {
      return { status: SendMessageStatus.SUCCESS };
    }

    if (anySkipped) {
      return { status: SendMessageStatus.SKIPPED };
    }

    return { status };
  }

  private async resolveContentAndProviders(
    command: SendMessageChannelCommand,
    bridgeOutputs?: ToolStepOutputs
  ): Promise<{ content: string }> {
    let content = bridgeOutputs?.body || '';

    if (command.bridgeData) {
      return { content };
    }

    const { step } = command;
    if (!step?.template) {
      throw new PlatformException('Tool channel template not found');
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

      return { content: '' };
    }

    return { content };
  }

  private async resolveEndpointsByIntegration(
    command: SendMessageChannelCommand
  ): Promise<Map<string, IntegrationEndpoints>> {
    const groups = await this.resolveChannelEndpoints.execute(
      ResolveChannelEndpointsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
        subscriberId: command.subscriberId,
        channelType: ChannelTypeEnum.TOOL,
        contextKeys: command.contextKeys,
      })
    );

    return new Map(groups.map((group) => [group.integrationIdentifier, group]));
  }

  private async emitSkippedNoEndpoint(
    command: SendMessageChannelCommand,
    integration: IntegrationEntity
  ): Promise<void> {
    Logger.log(
      `Skipping ${integration.providerId} for subscriber ${command.subscriberId}: no channel endpoint`,
      LOG_CONTEXT
    );

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.WARNING,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify({
          reason: 'no_channel_endpoint_for_subscriber',
          integrationIdentifier: integration.identifier,
          providerId: integration.providerId,
        }),
      })
    );
  }

  private async sendToIntegration(
    command: SendMessageChannelCommand,
    integration: IntegrationEntity,
    content: string,
    toolFactory: ToolFactory,
    channelData: ChannelData | undefined
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
      channel: ChannelTypeEnum.TOOL,
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
      const handler = toolFactory.getHandler(integration);
      if (!handler) {
        throw new PlatformException(`Tool handler for provider ${integration.providerId} is not found`);
      }

      // channelData carries per-subscriber routing (e.g. PagerDuty routingKey +
      // region). Passed as a separate argument so it never merges into
      // `overrides` or the persisted message payload — routing secrets must
      // not leak into execution details or the messages collection.
      const result = await handler.send({
        content: overrides.content || content,
        customData: overrides.customData || {},
        channelData,
        transactionId: command.transactionId,
        subscriberId: command.subscriberId,
        stepId: command.step.stepId,
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
      Logger.error(error, `Sending tool via ${integration.providerId} failed`, LOG_CONTEXT);

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
