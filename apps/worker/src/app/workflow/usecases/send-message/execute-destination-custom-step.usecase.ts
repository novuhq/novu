import { Injectable, Logger } from '@nestjs/common';
import {
  ActionHandlerFactory,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  dashboardSanitizeControlValues,
  GetDecryptedIntegrations,
  InstrumentUsecase,
  PinoLogger,
  SelectIntegration,
  SelectIntegrationCommand,
} from '@novu/application-generic';
import { ControlValuesRepository, JobRepository, MessageRepository, NotificationTemplateRepository } from '@novu/dal';
import {
  ControlValuesLevelEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IntegrationCategoryType,
  ProvidersIdEnum,
  ResourceOriginEnum,
} from '@novu/shared';

import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus, SendMessageType } from './send-message-type.usecase';

@Injectable()
export class ExecuteDestinationCustomStep extends SendMessageType {
  constructor(
    private jobRepository: JobRepository,
    private actionHandlerFactory: ActionHandlerFactory,
    private selectIntegration: SelectIntegration,
    private controlValuesRepository: ControlValuesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private logger: PinoLogger,
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails
  ) {
    super(messageRepository, createExecutionDetails);
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageChannelCommand): Promise<SendMessageResult> {
    const { step } = command;

    const providerId = step.providerId;
    if (!providerId) {
      Logger.error('ExecuteDestinationCustomStep called without providerId on step', step._id);

      return { status: SendMessageStatus.FAILED, errorMessage: DetailEnum.PROVIDER_MISSING };
    }

    let credentials: Record<string, string> = {};

    if (step.integrationIdentifier) {
      const integration = await this.selectIntegration.execute(
        SelectIntegrationCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          channelType: providerId as IntegrationCategoryType,
          providerId: providerId as ProvidersIdEnum,
          identifier: step.integrationIdentifier,
          filterData: {},
          userId: command.userId,
        })
      );

      if (!integration) {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
          })
        );

        return { status: SendMessageStatus.FAILED, errorMessage: DetailEnum.SUBSCRIBER_NO_ACTIVE_INTEGRATION };
      }

      credentials = GetDecryptedIntegrations.getDecryptedCredentials(integration).credentials as Record<string, string>;
    }

    const controlValues = await this.fetchControlValues(command);
    const handler = this.actionHandlerFactory.getHandler(providerId);

    let result: Awaited<ReturnType<typeof handler.execute>>;

    try {
      result = await handler.execute({
        controlValues,
        credentials,
        compileContext: command.compileContext,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.ACTION_STEP_EXECUTION_FAILED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: errorMessage }),
        })
      );

      return { status: SendMessageStatus.FAILED, errorMessage: DetailEnum.ACTION_STEP_EXECUTION_FAILED };
    }

    await this.jobRepository.updateOne(
      { _id: command.job._id, _environmentId: command.environmentId },
      { $set: { stepOutput: result.body } }
    );

    await this.createExecutionDetails.execute(
      CreateExecutionDetailsCommand.create({
        ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
        detail: DetailEnum.STEP_PROCESSED,
        source: ExecutionDetailsSourceEnum.INTERNAL,
        status: ExecutionDetailsStatusEnum.SUCCESS,
        isTest: false,
        isRetry: false,
        raw: JSON.stringify(result),
      })
    );

    return { status: SendMessageStatus.SUCCESS };
  }

  private async fetchControlValues(command: SendMessageChannelCommand): Promise<Record<string, unknown>> {
    const workflow =
      command.workflow ??
      (command._templateId
        ? await this.notificationTemplateRepository.findById(command._templateId, command.environmentId)
        : null);

    if (!workflow) {
      return {};
    }

    const controlsEntity = await this.controlValuesRepository.findOne({
      _organizationId: command.organizationId,
      _workflowId: workflow._id,
      _stepId: command.step._id,
      level: ControlValuesLevelEnum.STEP_CONTROLS,
    });

    const rawControls = controlsEntity?.controls;

    if (!rawControls) {
      return {};
    }

    if (workflow.origin === ResourceOriginEnum.NOVU_CLOUD) {
      return dashboardSanitizeControlValues(this.logger, rawControls, command.step?.template?.type) ?? {};
    }

    return rawControls;
  }
}
