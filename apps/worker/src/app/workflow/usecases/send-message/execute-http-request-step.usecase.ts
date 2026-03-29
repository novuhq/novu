import { Injectable } from '@nestjs/common';
import {
  buildNovuSignatureHeader,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  DetailEnum,
  dashboardSanitizeControlValues,
  evaluateRules,
  GetDecryptedSecretKey,
  GetDecryptedSecretKeyCommand,
  HttpClientService,
  ICompileContext,
  InstrumentUsecase,
  PinoLogger,
  shouldIncludeBody,
  toBodyRecord,
  toHeadersRecord,
  validateUrlSsrf,
} from '@novu/application-generic';
import { ControlValuesRepository, JobRepository, MessageRepository, NotificationTemplateRepository } from '@novu/dal';
import { createLiquidEngine } from '@novu/framework/internal';
import {
  ControlValuesLevelEnum,
  DeliveryLifecycleDetail,
  DeliveryLifecycleStatusEnum,
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  ResourceOriginEnum,
} from '@novu/shared';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { AdditionalOperation, RulesLogic } from 'json-logic-js';

import { SendMessageChannelCommand } from './send-message-channel.command';
import { SendMessageResult, SendMessageStatus, SendMessageType } from './send-message-type.usecase';

const MAX_RAW_SIZE = 10_240;

@Injectable()
export class ExecuteHttpRequestStep extends SendMessageType {
  private readonly liquidEngine: ReturnType<typeof createLiquidEngine>;

  constructor(
    private jobRepository: JobRepository,
    private httpClientService: HttpClientService,
    private controlValuesRepository: ControlValuesRepository,
    private notificationTemplateRepository: NotificationTemplateRepository,
    private logger: PinoLogger,
    private getDecryptedSecretKey: GetDecryptedSecretKey,
    protected messageRepository: MessageRepository,
    protected createExecutionDetails: CreateExecutionDetails
  ) {
    super(messageRepository, createExecutionDetails);
    this.liquidEngine = createLiquidEngine();
  }

  @InstrumentUsecase()
  public async execute(command: SendMessageChannelCommand): Promise<SendMessageResult> {
    const controlValues = await this.fetchControlValues(command);
    const compileContext = this.buildCompileContect(command.compileContext);
    const shouldSkip = this.evaluateSkipCondition(controlValues, compileContext);

    if (shouldSkip) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.SKIPPED_BRIDGE_EXECUTION,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ skip: true }),
        })
      );

      return {
        status: SendMessageStatus.SKIPPED,
        deliveryLifecycleState: {
          status: DeliveryLifecycleStatusEnum.SKIPPED,
          detail: DeliveryLifecycleDetail.USER_STEP_CONDITION,
        },
      };
    }

    const { skip: _skip, ...controlValuesWithoutSkip } = controlValues;

    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: command.environmentId })
    );

    const compiled = (await this.compileControlValues(
      controlValuesWithoutSkip,
      compileContext
    )) as typeof controlValuesWithoutSkip;

    const url = compiled.url as string | undefined;
    const method = (compiled.method as string) ?? 'POST';
    const rawHeaders = (compiled.headers as Array<{ key: string; value: string }> | undefined) ?? [];
    const rawBody = (compiled.body as Array<{ key: string; value: string }> | undefined) ?? [];
    const timeout = (compiled.timeout as number | undefined) ?? 5000;

    if (!url) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.ACTION_STEP_EXECUTION_FAILED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({
            error: 'HTTP request step is missing a URL. Please configure a URL in the step settings.',
          }),
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.ACTION_STEP_EXECUTION_FAILED,
        shouldHalt: !controlValuesWithoutSkip.continueOnFailure,
      };
    }

    const ssrfValidationError = await validateUrlSsrf(url);

    if (ssrfValidationError) {
      await this.createExecutionDetails.execute(
        CreateExecutionDetailsCommand.create({
          ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
          detail: DetailEnum.ACTION_STEP_EXECUTION_FAILED,
          source: ExecutionDetailsSourceEnum.INTERNAL,
          status: ExecutionDetailsStatusEnum.FAILED,
          isTest: false,
          isRetry: false,
          raw: JSON.stringify({ error: ssrfValidationError }),
        })
      );

      return {
        status: SendMessageStatus.FAILED,
        errorMessage: DetailEnum.ACTION_STEP_EXECUTION_FAILED,
        shouldHalt: !controlValuesWithoutSkip.continueOnFailure,
      };
    }

    const headersRecord = toHeadersRecord(rawHeaders);
    const bodyObject = toBodyRecord(rawBody);
    const hasBody = shouldIncludeBody(bodyObject, method);
    const signatureHeaders = {
      'novu-signature': buildNovuSignatureHeader(secretKey, hasBody ? bodyObject : {}),
    };
    const mergedHeaders = { ...headersRecord, ...signatureHeaders };

    let result: { statusCode?: number; body: unknown; headers: Record<string, string> };

    try {
      const response = await this.httpClientService.request<string>({
        url,
        method: method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        headers: mergedHeaders,
        timeout,
        responseType: 'text',
        ...(hasBody ? { body: bodyObject } : {}),
      });

      const parsedBody = tryParseJson(response.body);
      const isObjectBody = parsedBody !== null && typeof parsedBody === 'object' && !Array.isArray(parsedBody);

      if (!isObjectBody) {
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.ACTION_STEP_NON_OBJECT_RESPONSE,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.WARNING,
            isTest: false,
            isRetry: false,
            raw: JSON.stringify({
              message: `The endpoint at "${url}" returned a non-object response (type: ${Array.isArray(parsedBody) ? 'array' : typeof parsedBody}). Subsequent steps that reference this step's output may fail because the framework expects a JSON object. Configure the endpoint to return a JSON object to avoid this issue.`,
              url,
              receivedType: Array.isArray(parsedBody) ? 'array' : typeof parsedBody,
            }),
          })
        );
      }

      result = { statusCode: response.statusCode, body: parsedBody, headers: response.headers };
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
        shouldHalt: !controlValuesWithoutSkip.continueOnFailure,
      };
    }

    if (controlValuesWithoutSkip.enforceSchemaValidation && controlValuesWithoutSkip.responseBodySchema) {
      const validationResult = this.validateResponseSchema(
        result.body,
        controlValuesWithoutSkip.responseBodySchema as Record<string, unknown>
      );

      if (!validationResult.isValid) {
        const { errors } = validationResult;
        await this.createExecutionDetails.execute(
          CreateExecutionDetailsCommand.create({
            ...CreateExecutionDetailsCommand.getDetailsFromJob(command.job),
            detail: DetailEnum.RESPONSE_SCHEMA_VALIDATION_FAILED,
            source: ExecutionDetailsSourceEnum.INTERNAL,
            status: ExecutionDetailsStatusEnum.FAILED,
            isTest: false,
            isRetry: false,
            raw: truncateRaw({ errors, responseBody: result.body }),
          })
        );

        return {
          status: SendMessageStatus.FAILED,
          errorMessage: DetailEnum.RESPONSE_SCHEMA_VALIDATION_FAILED,
          shouldHalt: !controlValuesWithoutSkip.continueOnFailure,
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
        raw: truncateRaw(result),
      })
    );

    return { status: SendMessageStatus.SUCCESS };
  }

  private validateResponseSchema(
    responseBody: unknown,
    schema: Record<string, unknown>
  ): { isValid: true; errors?: undefined } | { isValid: false; errors: { path: string; message: string }[] } {
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

  private async compileControlValues(
    values: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const compiled = await this.liquidEngine.parseAndRender(JSON.stringify(values), context);

    try {
      return JSON.parse(compiled);
    } catch {
      return values;
    }
  }

  private buildCompileContect(compileContext: ICompileContext): Record<string, unknown> {
    return {
      subscriber: compileContext.subscriber ?? {},
      payload: compileContext.payload ?? {},
      actor: compileContext.actor ?? {},
      tenant: compileContext.tenant ?? {},
      context: compileContext.context ?? {},
      step: compileContext.step,
      webhook: compileContext.webhook ?? {},
      env: compileContext.env ?? {},
    };
  }

  private evaluateSkipCondition(
    controlValues: Record<string, unknown>,
    compileContext: Record<string, unknown>
  ): boolean {
    const skipRules = controlValues.skip as RulesLogic<AdditionalOperation> | undefined;

    if (!skipRules || (typeof skipRules === 'object' && Object.keys(skipRules).length === 0)) {
      return false;
    }

    const { result, error } = evaluateRules(skipRules, compileContext);

    if (error) {
      this.logger.error({ err: error }, 'Failed to evaluate skip rule for HTTP request step');
    }

    return !result;
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

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function truncateRaw(obj: unknown, maxSize: number = MAX_RAW_SIZE): string {
  const serialized = JSON.stringify(obj);
  if (serialized.length <= maxSize) {
    return serialized;
  }

  const suffix = '... [truncated]';

  return serialized.slice(0, maxSize - suffix.length) + suffix;
}
