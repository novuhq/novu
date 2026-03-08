import { Injectable } from '@nestjs/common';
import {
  BuildStepDataUsecase,
  ControlValueSanitizerService,
  CreateVariablesObject,
  CreateVariablesObjectCommand,
  GeneratePreviewResponseDto,
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
  isStepResolverEmailStep,
  PinoLogger,
  PreviewCommand,
  PreviewErrorHandler,
  PreviewPayloadDto,
  PreviewPayloadProcessorService,
  PreviewStep,
  PreviewStepCommand,
  StepResponseDto,
} from '@novu/application-generic';
import { ContextResolved } from '@novu/framework/internal';
import { ChannelTypeEnum, ResourceOriginEnum } from '@novu/shared';
import { PayloadMergerService } from './services/payload-merger.service';

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
    private readonly logger: PinoLogger
  ) {}

  @InstrumentUsecase()
  async execute(command: PreviewCommand): Promise<GeneratePreviewResponseDto> {
    try {
      const context = await this.initializePreviewContext(command);
      const stepResolverHash =
        typeof context.stepData.stepResolverHash === 'string' ? context.stepData.stepResolverHash : undefined;
      const isStepResolverEmail = isStepResolverEmailStep(context.stepData.type, stepResolverHash);

      const sanitizedControls = isStepResolverEmail
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
          stepResolverHash
        );

        return {
          result: {
            preview: executeOutput.outputs as Record<string, unknown>,
            type: context.stepData.type as unknown as ChannelTypeEnum,
          },
          previewPayloadExample: cleanedPayloadExample,
          schema: context.variableSchema,
        };
      } catch (error) {
        /*
         * If preview execution fails, still return valid schema and payload example
         * but with an empty preview result.
         * For step resolver email steps, since its a runtime error, surface the error
         * as HTML rendered in the preview panel.
         */
        const previewResult = isStepResolverEmail
          ? { subject: '', body: this.errorHandler.buildPreviewErrorHtml(error) }
          : {};

        return {
          result: {
            preview: previewResult,
            type: context.stepData.type as unknown as ChannelTypeEnum,
          },
          previewPayloadExample: cleanedPayloadExample,
          schema: context.variableSchema,
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

    return { stepData, controlValues, variableSchema: stepData.variables, variablesObject, workflow };
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

  @Instrument()
  private async executePreviewUsecase(
    command: PreviewCommand,
    stepData: StepResponseDto,
    previewPayloadExample: PreviewPayloadDto,
    controlValues: Record<string, unknown>,
    stepResolverHash: string | undefined
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
      })
    );
  }
}
