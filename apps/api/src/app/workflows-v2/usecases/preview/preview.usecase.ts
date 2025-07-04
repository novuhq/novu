import { Injectable } from '@nestjs/common';
import { ChannelTypeEnum, ResourceOriginEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import {
  GetWorkflowByIdsCommand,
  GetWorkflowByIdsUseCase,
  Instrument,
  InstrumentUsecase,
  FeatureFlagsService,
} from '@novu/application-generic';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { BuildStepDataUsecase } from '../build-step-data';
import { PreviewCommand } from './preview.command';
import { CreateVariablesObjectCommand } from '../../../shared/usecases/create-variables-object/create-variables-object.command';
import { CreateVariablesObject } from '../../../shared/usecases/create-variables-object/create-variables-object.usecase';
import { GeneratePreviewResponseDto, PreviewPayloadDto, StepResponseDto } from '../../dtos';
// Import new services
import { ControlValueSanitizerService } from '../../../shared/services/control-value-sanitizer.service';
import { PayloadMergerService } from './services/payload-merger.service';
import { SchemaBuilderService } from './services/schema-builder.service';
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
    private readonly schemaBuilder: SchemaBuilderService,
    private readonly payloadProcessor: PreviewPayloadProcessorService,
    private readonly errorHandler: PreviewErrorHandler,
    private readonly featureFlagService: FeatureFlagsService
  ) {}

  @InstrumentUsecase()
  async execute(command: PreviewCommand): Promise<GeneratePreviewResponseDto> {
    try {
      const context = await this.initializePreviewContext(command);

      const sanitizedControls = this.controlValueSanitizer.sanitizeControlsForPreview(
        context.controlValues,
        context.stepData.type,
        context.workflow.origin || ResourceOriginEnum.NOVU_CLOUD
      );

      const isHtmlEditorEnabled = await this.featureFlagService.getFlag({
        key: FeatureFlagsKeysEnum.IS_HTML_EDITOR_ENABLED,
        organization: { _id: command.user.organizationId },
        environment: { _id: command.user.environmentId },
        user: { _id: command.user._id },
        defaultValue: false,
      });

      const { previewTemplateData } = this.controlValueSanitizer.processControlValues(
        isHtmlEditorEnabled,
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
      const schema = await this.schemaBuilder.buildPreviewPayloadSchema(
        payloadExample,
        context.workflow.payloadSchema,
        context.workflow
      );

      try {
        const executeOutput = await this.executePreviewUsecase(
          command,
          context.stepData,
          payloadExample,
          previewTemplateData.controlValues
        );

        return {
          result: {
            preview: executeOutput.outputs as any,
            type: context.stepData.type as unknown as ChannelTypeEnum,
          },
          previewPayloadExample: cleanedPayloadExample,
          schema,
        };
      } catch (previewError) {
        /*
         * If preview execution fails, still return valid schema and payload example
         * but with an empty preview result
         */
        return {
          result: {
            preview: {},
            type: context.stepData.type as unknown as ChannelTypeEnum,
          },
          previewPayloadExample: cleanedPayloadExample,
          schema,
        };
      }
    } catch (error) {
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

    // build the payload schema and merge it with the variables schema
    const variableSchema = await this.schemaBuilder.buildVariablesSchema(variablesObject, stepData.variables);

    return { stepData, controlValues, variableSchema, variablesObject, workflow };
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
    });
  }

  @Instrument()
  private async executePreviewUsecase(
    command: PreviewCommand,
    stepData: StepResponseDto,
    previewPayloadExample: PreviewPayloadDto,
    controlValues: Record<string, unknown>
  ) {
    const state = this.payloadProcessor.buildState(previewPayloadExample.steps);

    return await this.previewStepUsecase.execute(
      PreviewStepCommand.create({
        payload: previewPayloadExample.payload || {},
        subscriber: previewPayloadExample.subscriber,
        controls: controlValues || {},
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        stepId: stepData.stepId,
        userId: command.user._id,
        workflowId: stepData.workflowId,
        workflowOrigin: stepData.origin,
        state,
      })
    );
  }
}
