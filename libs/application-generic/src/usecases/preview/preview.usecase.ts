import { Injectable } from '@nestjs/common';
import { EnvironmentRepository, EnvironmentVariableRepository } from '@novu/dal';
import { ContextResolved } from '@novu/framework/internal';
import { ChannelTypeEnum, EnvironmentSystemVariables, ResourceOriginEnum, StepTypeEnum } from '@novu/shared';
import { PinoLogger } from 'nestjs-pino';
import { GeneratePreviewResponseDto } from '../../dtos/workflow/generate-preview-response.dto';
import { PreviewPayloadDto } from '../../dtos/workflow/preview-payload.dto';
import { StepResponseDto } from '../../dtos/workflow/step.response.dto';
import { resolveEnvironmentVariables } from '../../encryption/encrypt-environment-variable';
import { Instrument, InstrumentUsecase } from '../../instrumentation';
import { ControlValueSanitizerService } from '../../services/control-value-sanitizer.service';
import { shouldIncludeBody, toBodyRecord } from '../../services/http-client/http-request.utils';
import { buildNovuSignatureHeader } from '../../utils/hmac';
import { isStepResolverActive } from '../../utils/step-resolver-control-state';
import { BuildStepDataUsecase } from '../build-step-data';
import { CreateVariablesObjectCommand } from '../create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../create-variables-object/create-variables-object.usecase';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '../get-decrypted-secret-key';
import { PreviewStep, PreviewStepCommand } from '../preview-step';
import { GetWorkflowByIdsCommand, GetWorkflowByIdsUseCase } from '../workflow';
import { PreviewCommand } from './preview.command';
import { PayloadMergerService } from './services/payload-merger.service';
import { PreviewPayloadProcessorService } from './services/preview-payload-processor.service';
import { PreviewErrorHandler } from './utils/preview-error-handler';

@Injectable()
export class PreviewUsecase {
  constructor(
    private previewStepUsecase: PreviewStep,
    private buildStepDataUsecase: BuildStepDataUsecase,
    private getWorkflowByIdsUseCase: GetWorkflowByIdsUseCase,
    private createVariablesObject: CreateVariablesObject,
    private readonly controlValueSanitizer: ControlValueSanitizerService,
    private readonly payloadMerger: PayloadMergerService,
    private readonly payloadProcessor: PreviewPayloadProcessorService,
    private readonly errorHandler: PreviewErrorHandler,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey,
    private readonly logger: PinoLogger,
    private readonly environmentVariableRepository: EnvironmentVariableRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: PreviewCommand): Promise<GeneratePreviewResponseDto> {
    try {
      const context = await this.initializePreviewContext(command);
      const stepResolverHash =
        typeof context.stepData.stepResolverHash === 'string' ? context.stepData.stepResolverHash : undefined;
      const isStepResolver = isStepResolverActive(stepResolverHash);

      const isHttpRequestStep = context.stepData.type === StepTypeEnum.HTTP_REQUEST;

      const sanitizedControls = isStepResolver
        ? context.controlValues
        : this.controlValueSanitizer.sanitizeControlsForPreview(
            context.controlValues,
            context.stepData.type,
            context.workflow.origin || ResourceOriginEnum.NOVU_CLOUD
          );

      const { previewTemplateData } = this.controlValueSanitizer.processControlValues(
        sanitizedControls,
        context.variableSchema,
        context.variablesObject
      );

      let payloadExample = await this.payloadMerger.mergePayloadExample({
        workflow: context.workflow,
        stepIdOrInternalId: command.stepIdOrInternalId,
        payloadExample: previewTemplateData.payloadExample,
        userPayloadExample: command.generatePreviewRequestDto.previewPayload,
        user: command.user,
      });

      payloadExample = this.payloadProcessor.enhanceEventCountValue(payloadExample);

      const cleanedPayloadExample = this.payloadProcessor.cleanPreviewExamplePayload(payloadExample);

      try {
        const executeOutput = await this.executePreviewUsecase(
          command,
          context.stepData,
          payloadExample,
          previewTemplateData.controlValues,
          stepResolverHash,
          context.envVars
        );

        const novuSignature = isHttpRequestStep
          ? await this.buildNovuSignatureSample(command.user.environmentId, executeOutput.outputs)
          : undefined;

        return {
          result: {
            preview: executeOutput.outputs as Record<string, unknown>,
            type: context.stepData.type as unknown as ChannelTypeEnum,
          },
          previewPayloadExample: cleanedPayloadExample,
          schema: context.variableSchema,
          novuSignature,
        };
      } catch (error) {
        /*
         * If preview execution fails, still return valid schema and payload example
         * but with an empty preview result.
         * For step resolver steps, surface a structured error so the dashboard can
         * render a channel-agnostic error UI regardless of step type.
         */
        const novuSignature = isHttpRequestStep
          ? await this.buildNovuSignatureSample(command.user.environmentId)
          : undefined;

        if (isStepResolver) {
          return {
            result: {
              preview: {},
              type: context.stepData.type as unknown as ChannelTypeEnum,
              error: this.errorHandler.extractErrorContent(error),
            },
            previewPayloadExample: cleanedPayloadExample,
            schema: context.variableSchema,
            novuSignature,
          };
        }

        return {
          result: {
            preview: {},
            type: context.stepData.type as unknown as ChannelTypeEnum,
          },
          previewPayloadExample: cleanedPayloadExample,
          schema: context.variableSchema,
          novuSignature,
        };
      }
    } catch {
      // Return default response for non-existent workflows/steps or other critical errors
      return this.errorHandler.createErrorResponse();
    }
  }

  private async initializePreviewContext(command: PreviewCommand) {
    // get step with control values, variables, issues etc.
    const stepData = await this.getStepData(command);
    const controlValues = command.generatePreviewRequestDto.controlValues || stepData.controls.values || {};
    const workflow = await this.findWorkflow(command);

    // extract all variables from the control values and build the variables object
    const variablesObject = await this.createVariablesObject.execute(
      CreateVariablesObjectCommand.create({
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        controlValues: Object.values(controlValues),
        variableSchema: stepData.variables,
        payloadSchema: workflow.payloadSchema,
      })
    );

    let envVars: EnvironmentSystemVariables & Record<string, string>;
    try {
      const [rawEnvVars, environmentEntity] = await Promise.all([
        this.environmentVariableRepository.findByEnvironment(command.user.organizationId, command.user.environmentId),
        this.environmentRepository.findByIdAndOrganization(command.user.environmentId, command.user.organizationId),
      ]);

      const environmentSystemVars: EnvironmentSystemVariables = {
        name: environmentEntity.name,
        type: environmentEntity?.type,
      };

      envVars = {
        ...resolveEnvironmentVariables(rawEnvVars),
        ...environmentSystemVars,
      };
    } catch (error) {
      this.logger.error(
        { error },
        'Failed to fetch or resolve environment variables for preview; falling back to empty env vars'
      );
    }

    return { stepData, controlValues, variableSchema: stepData.variables, variablesObject, workflow, envVars };
  }

  @Instrument()
  private async findWorkflow(command: PreviewCommand) {
    return await this.getWorkflowByIdsUseCase.execute(
      GetWorkflowByIdsCommand.create({
        workflowIdOrInternalId: command.workflowIdOrInternalId,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
      })
    );
  }

  @Instrument()
  private async getStepData(command: PreviewCommand) {
    return await this.buildStepDataUsecase.execute({
      workflowIdOrInternalId: command.workflowIdOrInternalId,
      stepIdOrInternalId: command.stepIdOrInternalId,
      user: command.user,
      previewPayload: command.generatePreviewRequestDto.previewPayload,
    });
  }

  private async buildNovuSignatureSample(
    environmentId: string,
    resolvedOutputs?: Record<string, unknown>
  ): Promise<string | undefined> {
    try {
      const secretKey = await this.getDecryptedSecretKey.execute(
        GetDecryptedSecretKeyCommand.create({ environmentId })
      );

      const rawBody = resolvedOutputs?.body as Array<{ key: string; value: string }> | undefined;
      const method = (resolvedOutputs?.method as string) ?? 'GET';
      const bodyRecord = rawBody ? toBodyRecord(rawBody) : undefined;
      const payload = shouldIncludeBody(bodyRecord, method) ? bodyRecord : {};

      return buildNovuSignatureHeader(secretKey, payload);
    } catch {
      return undefined;
    }
  }

  @Instrument()
  private async executePreviewUsecase(
    command: PreviewCommand,
    stepData: StepResponseDto,
    previewPayloadExample: PreviewPayloadDto,
    controlValues: Record<string, unknown>,
    stepResolverHash: string | undefined,
    envVars: EnvironmentSystemVariables & Record<string, string>
  ) {
    const state = this.payloadProcessor.buildState(previewPayloadExample.steps);

    return await this.previewStepUsecase.execute(
      PreviewStepCommand.create({
        payload: previewPayloadExample.payload || {},
        subscriber: previewPayloadExample.subscriber,
        controls: controlValues || {},
        context: previewPayloadExample.context as ContextResolved,
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        stepId: stepData.stepId,
        userId: command.user._id,
        workflowId: stepData.workflowId,
        workflowOrigin: stepData.origin,
        state,
        skipLayoutRendering: command.skipLayoutRendering,
        stepResolverHash,
        env: envVars,
      })
    );
  }
}
