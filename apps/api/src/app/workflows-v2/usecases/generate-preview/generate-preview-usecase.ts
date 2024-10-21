import { Injectable } from '@nestjs/common/decorators';
import {
  ChannelTypeEnum,
  ControlPreviewIssue,
  ControlPreviewIssueType,
  ControlsSchema,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  JSONSchemaDto,
  StepTypeEnum,
} from '@novu/shared';
import { merge } from 'lodash/fp';
import { difference, isArray, isObject, reduce } from 'lodash';
import { GeneratePreviewCommand } from './generate-preview-command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { GetWorkflowUseCase } from '../get-workflow/get-workflow.usecase';
import { CreateMockPayloadUseCase } from '../placeholder-enrichment/payload-preview-value-generator-usecase';
import { ExtractDefaultsUseCase } from '../get-default-values-from-schema/get-default-values-from-schema-usecase';
import { StepIsNotFoundException } from '../../exceptions/step-is-not-found-exception';

@Injectable()
export class GeneratePreviewUsecase {
  constructor(
    private legacyPreviewStepUseCase: PreviewStep,
    private getWorkflowUseCase: GetWorkflowUseCase
  ) {}

  async execute(command: GeneratePreviewCommand): Promise<GeneratePreviewResponseDto> {
    const payloadHydrationInfo = this.payloadHydrationLogic(command);
    const workflowInfo = await this.getWorkflowUserIdentifierFromWorkflowObject(command);
    const controlValuesResult = this.addMissingValuesToControlValues(command, workflowInfo.stepControlSchema);
    const executeOutput = await this.executePreviewUsecase(
      workflowInfo.workflowId,
      workflowInfo.stepId,
      payloadHydrationInfo.augmentedPayload,
      controlValuesResult.augmentedControlValues,
      command
    );

    return buildResponse(
      controlValuesResult.issuesMissingValues,
      payloadHydrationInfo.issues,
      executeOutput,
      workflowInfo.stepType
    );
  }

  private addMissingValuesToControlValues(command: GeneratePreviewCommand, stepControlSchema: ControlsSchema) {
    const defaultValues = new ExtractDefaultsUseCase().execute({
      jsonSchemaDto: stepControlSchema.schema as JSONSchemaDto,
    });

    return {
      augmentedControlValues: merge(defaultValues, command.generatePreviewRequestDto.controlValues),
      issuesMissingValues: this.buildMissingControlValuesIssuesList(defaultValues, command),
    };
  }

  private buildMissingControlValuesIssuesList(defaultValues: Record<string, any>, command: GeneratePreviewCommand) {
    const missingRequiredControlValues = this.findMissingKeys(
      defaultValues,
      command.generatePreviewRequestDto.controlValues || {}
    );

    return this.buildControlPreviewIssues(missingRequiredControlValues, ControlPreviewIssueType.MISSING_VALUE);
  }

  private buildControlPreviewIssues(
    keys: string[],
    issuesType: ControlPreviewIssueType,
    isKeyVariable: boolean = false
  ): Record<string, ControlPreviewIssue[]> {
    const record: Record<string, ControlPreviewIssue[]> = {};

    keys.forEach((key) => {
      record[key] = [
        {
          issueType: issuesType, // Set issueType to MISSING_VALUE
          message: `${issuesType} for key ${key}`, // Custom message for the issue
          variableName: isKeyVariable ? key : undefined,
        },
      ];
    });

    return record;
  }
  private findMissingKeys(requiredRecord: Record<string, unknown>, actualRecord: Record<string, unknown>) {
    const requiredKeys = this.collectKeys(requiredRecord);
    const actualKeys = this.collectKeys(actualRecord);

    return difference(requiredKeys, actualKeys);
  }
  private collectKeys(obj, prefix = '') {
    return reduce(
      obj,
      (result, value, key) => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (isObject(value) && !isArray(value)) {
          result.push(...this.collectKeys(value, newKey));
        } else {
          // Otherwise, just add the key
          result.push(newKey);
        }

        return result;
      },
      []
    );
  }
  private async executePreviewUsecase(
    workflowId: string,
    stepId: string,
    hydratedPayload: Record<string, unknown>,
    updatedControlValues: Record<string, unknown>,
    command: GeneratePreviewCommand
  ) {
    return await this.legacyPreviewStepUseCase.execute(
      PreviewStepCommand.create({
        payload: hydratedPayload,
        controls: updatedControlValues || {},
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        stepId,
        userId: command.user._id,
        workflowId,
      })
    );
  }

  private async getWorkflowUserIdentifierFromWorkflowObject(command: GeneratePreviewCommand) {
    const workflowResponseDto = await this.getWorkflowUseCase.execute({
      identifierOrInternalId: command.workflowId,
      user: command.user,
    });
    const { workflowId, steps } = workflowResponseDto;
    const step = steps.find((stepDto) => stepDto.stepUuid === command.stepUuid);
    if (!step) {
      throw new StepIsNotFoundException(command.stepUuid);
    }

    return { workflowId, stepId: step.slug, stepType: step.type, stepControlSchema: step.controls };
  }

  private payloadHydrationLogic(command: GeneratePreviewCommand) {
    const dto = command.generatePreviewRequestDto;

    let aggregatedDefaultValues = {};
    for (const controlValueKey in dto.controlValues) {
      if (dto.controlValues.hasOwnProperty(controlValueKey)) {
        const defaultValuesForSingleControlValue = new CreateMockPayloadUseCase().execute({ dto, controlValueKey });
        aggregatedDefaultValues = merge(defaultValuesForSingleControlValue, aggregatedDefaultValues);
      }
    }

    return {
      augmentedPayload: merge(aggregatedDefaultValues, dto.payloadValues),
      issues: this.buildVariableMissingIssueRecord(aggregatedDefaultValues, dto),
    };
  }

  private buildVariableMissingIssueRecord(aggregatedDefaultValues: {}, dto: GeneratePreviewRequestDto) {
    const missingRequiredControlValues = this.findMissingKeys(aggregatedDefaultValues, dto.payloadValues || {});

    return this.buildControlPreviewIssues(
      missingRequiredControlValues,
      ControlPreviewIssueType.MISSING_VARIABLE_IN_PAYLOAD,
      true
    );
  }
}

function buildResponse(
  missingValuesIssue: Record<string, ControlPreviewIssue[]>,
  missingPayloadVariablesIssue: Record<string, ControlPreviewIssue[]>,
  executionOutput,
  stepType: StepTypeEnum
): GeneratePreviewResponseDto {
  return {
    issues: merge(missingValuesIssue, missingPayloadVariablesIssue),
    result: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      preview: executionOutput.outputs as any,
      type: stepType as unknown as ChannelTypeEnum,
    },
  };
}
