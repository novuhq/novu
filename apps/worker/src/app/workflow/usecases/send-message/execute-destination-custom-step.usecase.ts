import { Injectable, Logger } from '@nestjs/common';
import {
  ActionHandlerFactory,
  buildNovuSignatureHeader,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  dashboardSanitizeControlValues,
  GetDecryptedIntegrations,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
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
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

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
    private getDecryptedSecretKey: GetDecryptedSecretKey,
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

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: command.environmentId })
    );

    const rawBody = (controlValues.body as Array<{ key: string; value: string }> | undefined) ?? [];
    const method = (controlValues.method as string) ?? 'GET';
    const bodyObject =
      rawBody.length > 0
        ? rawBody.reduce<Record<string, unknown>>((acc, { key, value }) => {
            acc[key] = value;

            return acc;
          }, {})
        : undefined;
    const hasBody = !!bodyObject && method !== 'GET' && method !== 'DELETE';
    const signatureHeaders = {
      'novu-signature': buildNovuSignatureHeader(secretKey, hasBody ? bodyObject : {}),
    };

    let result: Awaited<ReturnType<typeof handler.execute>>;

    try {
      result = await handler.execute({
        controlValues,
        credentials,
        compileContext: command.compileContext,
        signatureHeaders,
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

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.ACTION_STEP_EXECUTION_FAILED,
        shouldHalt: !!controlValues.stopOnFail,
      };
    }

    if (controlValues.enforceSchemaValidation && controlValues.responseBodySchema) {
      const validationResult = this.validateResponseSchema(
        result.body,
        controlValues.responseBodySchema as Record<string, unknown>
      );

      if (!validationResult.isValid) {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.RESPONSE_SCHEMA_VALIDATION_FAILED,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
            raw: JSON.stringify({ errors: validationResult.errors, responseBody: result.body }),
          })
        );

        return {
          status: SendMessageStatus.FAILED,
          errorMessage: DetailEnum.RESPONSE_SCHEMA_VALIDATION_FAILED,
          shouldHalt: !!controlValues.stopOnFail,
        };
      }
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

  private validateResponseSchema(
    responseBody: unknown,
    schema: Record<string, unknown>
  ): { isValid: true } | { isValid: false; errors: { path: string; message: string }[] } {
    try {
      const ajv = new Ajv({ strict: false });
      addFormats(ajv);
      const validate = ajv.compile(schema);
      const valid = validate(responseBody);

      if (valid) {
        return { isValid: true };
      }

      return {
        isValid: false,
        errors: (validate.errors ?? []).map((err) => ({
          path: err.instancePath,
          message: err.message ?? 'Validation error',
        })),
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{ path: '', message: error instanceof Error ? error.message : 'Schema compilation error' }],
      };
    }
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
