import { Injectable } from '@nestjs/common';
import {
  ChannelTypeEnum,
  ControlPreviewIssue,
  ControlPreviewIssueTypeEnum,
  ControlsSchema,
  GeneratePreviewRequestDto,
  GeneratePreviewResponseDto,
  JSONSchemaDto,
  StepTypeEnum,
  WorkflowOriginEnum,
} from '@novu/shared';
import { merge } from 'lodash/fp';
import { difference, isArray, isObject, reduce } from 'lodash';
import { GeneratePreviewCommand } from './generate-preview-command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { GetWorkflowUseCase } from '../get-workflow/get-workflow.usecase';
import { CreateMockPayloadUseCase } from '../placeholder-enrichment/payload-preview-value-generator.usecase';
import { StepNotFoundException } from '../../exceptions/step-not-found-exception';
import { ExtractDefaultsUsecase } from '../get-default-values-from-schema/extract-defaults.usecase';

@Injectable()
export class GeneratePreviewUsecase {
  constructor(
    private legacyPreviewStepUseCase: PreviewStep,
    private getWorkflowUseCase: GetWorkflowUseCase,
    private createMockPayloadUseCase: CreateMockPayloadUseCase,
    private extractDefaultsUseCase: ExtractDefaultsUsecase
  ) {}

  async execute(command: GeneratePreviewCommand): Promise<GeneratePreviewResponseDto> {
    const payloadHydrationInfo = this.payloadHydrationLogic(command);
    const workflowInfo = await this.getWorkflowUserIdentifierFromWorkflowObject(command);
    const controlValuesResult = this.addMissingValuesToControlValues(command, workflowInfo.stepControlSchema);
    const executeOutput = await this.executePreviewUsecase(
      workflowInfo.workflowId,
      workflowInfo.stepId,
      workflowInfo.origin,
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
    const defaultValues = this.extractDefaultsUseCase.execute({
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

    return this.buildControlPreviewIssues(missingRequiredControlValues);
  }

  private buildControlPreviewIssues(keys: string[]): Record<string, ControlPreviewIssue[]> {
    const record: Record<string, ControlPreviewIssue[]> = {};

    keys.forEach((key) => {
      record[key] = [
        {
          issueType: ControlPreviewIssueTypeEnum.MISSING_VALUE,
          message: `Value is missing on a required control`, // Custom message for the issue
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
    origin: WorkflowOriginEnum,
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
        workflowOrigin: origin,
      })
    );
  }

  private async getWorkflowUserIdentifierFromWorkflowObject(command: GeneratePreviewCommand) {
    const workflowResponseDto = await this.getWorkflowUseCase.execute({
      identifierOrInternalId: command.workflowId,
      user: command.user,
    });
    const { workflowId, steps } = workflowResponseDto;
    const step = steps.find((stepDto) => stepDto._id === command.stepUuid);
    if (!step) {
      throw new StepNotFoundException(command.stepUuid);
    }

    return {
      workflowId,
      stepId: step.stepId,
      stepType: step.type,
      stepControlSchema: step.controls,
      origin: workflowResponseDto.origin,
    };
  }

  private payloadHydrationLogic(command: GeneratePreviewCommand) {
    const dto = command.generatePreviewRequestDto;

    let aggregatedDefaultValues = {};
    const aggregatedDefaultValuesForControl: Record<string, Record<string, unknown>> = {};
    const flattenedValues = flattenJson(dto.controlValues);
    for (const controlValueKey in flattenedValues) {
      if (flattenedValues.hasOwnProperty(controlValueKey)) {
        const defaultValuesForSingleControlValue = this.createMockPayloadUseCase.execute({
          controlValues: flattenedValues,
          controlValueKey,
        });

        if (defaultValuesForSingleControlValue) {
          aggregatedDefaultValuesForControl[controlValueKey] = defaultValuesForSingleControlValue;
        }
        aggregatedDefaultValues = merge(defaultValuesForSingleControlValue, aggregatedDefaultValues);
      }
    }

    return {
      augmentedPayload: merge(aggregatedDefaultValues, dto.payloadValues),
      issues: this.buildVariableMissingIssueRecord(aggregatedDefaultValuesForControl, aggregatedDefaultValues, dto),
    };
  }

  private buildVariableMissingIssueRecord(
    valueKeyToDefaultsMap: Record<string, Record<string, unknown>>,
    aggregatedDefaultValues: Record<string, unknown>,
    dto: GeneratePreviewRequestDto
  ) {
    const defaultVariableToValueKeyMap = flattenJsonWithArrayValues(valueKeyToDefaultsMap);
    const missingRequiredPayloadIssues = this.findMissingKeys(aggregatedDefaultValues, dto.payloadValues || {});

    return this.buildPayloadIssues(missingRequiredPayloadIssues, defaultVariableToValueKeyMap);
  }
  private buildPayloadIssues(
    missingVariables: string[],
    variableToControlValueKeys: Record<string, string[]>
  ): Record<string, ControlPreviewIssue[]> {
    const record: Record<string, ControlPreviewIssue[]> = {};

    missingVariables.forEach((missingVariable) => {
      variableToControlValueKeys[missingVariable].forEach((controlValueKey) => {
        record[controlValueKey] = [
          {
            issueType: ControlPreviewIssueTypeEnum.MISSING_VARIABLE_IN_PAYLOAD, // Set issueType to MISSING_VALUE
            message: `Variable payload.${missingVariable} is missing in payload`, // Custom message for the issue
            variableName: `payload.${missingVariable}`,
          },
        ];
      });
    });

    return record;
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
function flattenJsonWithArrayValues(valueKeyToDefaultsMap: Record<string, Record<string, unknown>>) {
  const flattened = {};
  Object.keys(valueKeyToDefaultsMap).forEach((controlValue) => {
    const defaultPayloads = valueKeyToDefaultsMap[controlValue];
    const defaultPlaceholders = getDotNotationKeys(defaultPayloads);
    defaultPlaceholders.forEach((defaultPlaceholder) => {
      if (!flattened[defaultPlaceholder]) {
        flattened[defaultPlaceholder] = [];
      }
      flattened[defaultPlaceholder].push(controlValue);
    });
  });

  return flattened;
}
type NestedRecord = Record<string, unknown>;

function getDotNotationKeys(input: NestedRecord, parentKey: string = '', keys: string[] = []): string[] {
  for (const key in input) {
    if (input.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key; // Construct dot notation key

      if (typeof input[key] === 'object' && input[key] !== null && !Array.isArray(input[key])) {
        // Recursively flatten the object and collect keys
        getDotNotationKeys(input[key] as NestedRecord, newKey, keys);
      } else {
        // Push the dot notation key to the keys array
        keys.push(newKey);
      }
    }
  }

  return keys;
}
function flattenJson(obj, parentKey = '', result = {}) {
  // eslint-disable-next-line guard-for-in
  for (const key in obj) {
    // Construct the new key using dot notation
    const newKey = parentKey ? `${parentKey}.${key}` : key;

    // Check if the value is an object (and not null or an array)
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      // Recursively flatten the object
      flattenJson(obj[key], newKey, result);
    } else if (Array.isArray(obj[key])) {
      // Handle arrays by flattening each item
      obj[key].forEach((item, index) => {
        const arrayKey = `${newKey}[${index}]`;
        if (typeof item === 'object' && item !== null) {
          flattenJson(item, arrayKey, result);
        } else {
          // eslint-disable-next-line no-param-reassign
          result[arrayKey] = item;
        }
      });
    } else {
      // Assign the value to the result with the new key
      // eslint-disable-next-line no-param-reassign
      result[newKey] = obj[key];
    }
  }

  return result;
}
