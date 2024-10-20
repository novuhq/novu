import { Injectable } from '@nestjs/common/decorators';
import {
  ChannelTypeEnum,
  ControlPreviewIssue,
  ControlPreviewIssueType,
  ControlsSchema,
  GeneratePreviewResponseDto,
  JSONSchemaDto,
  StepTypeEnum,
} from '@novu/shared';
import { BadRequestException } from '@nestjs/common';
import { merge } from 'lodash/fp';
import { difference, isArray, isObject, reduce } from 'lodash';
import { GeneratePreviewCommand } from './generate-preview-command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow/get-workflow.usecase';
import { CreateMockPayloadUseCase } from '../placeholder-enrichment/payload-preview-value-generator-usecase';
import { ExtractDefaultsUseCase } from '../get-default-values-from-schema/get-default-values-from-schema-usecase';

@Injectable()
export class GeneratePreviewUsecase {
  constructor(
    private legacyPreviewStepUseCase: PreviewStep,
    private getWorkflowUseCase: GetWorkflowUseCase
  ) {}

  async execute(command: GeneratePreviewCommand): Promise<GeneratePreviewResponseDto> {
    const { augmentedPayload, issues } = this.addMissingValuesToPayload(command);
    const { workflowId, stepId, stepType, stepControlSchema } =
      await this.getWorkflowUserIdentifierFromWorkflowObject(command);
    const { augmantedControlValues, issuesMissingValues } = this.addMissingValuesToControlValues(
      command,
      stepControlSchema
    );
    const executeOutput = await this.executePreviewUsecase(
      workflowId,
      stepId,
      augmentedPayload,
      augmantedControlValues,
      command
    );

    return buildResponse(issuesMissingValues, issues, executeOutput, stepType);
  }

  private addMissingValuesToControlValues(command: GeneratePreviewCommand, stepControlSchema: ControlsSchema) {
    const defaultValues = new ExtractDefaultsUseCase().execute({
      jsonSchemaDto: stepControlSchema.schema as JSONSchemaDto,
    });
    const missingRequiredControlValues = this.findMissingKeys(
      defaultValues,
      command.generatePreviewRequestDto.controlValues || {}
    );
    const issuesMissingValues = this.buildControlPreviewIssues(
      missingRequiredControlValues,
      ControlPreviewIssueType.MISSING_VALUE
    );
    const augmantedControlValues = merge(defaultValues, command.generatePreviewRequestDto.controlValues);

    return { augmantedControlValues, issuesMissingValues };
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
    // Collect keys from both records
    const requiredKeys = this.collectKeys(requiredRecord);
    const actualKeys = this.collectKeys(actualRecord);

    // Find keys in record1 that are not in record2
    const requiredKeysMissing = difference(requiredKeys, actualKeys);

    // Find keys in record2 that are not in record1
    const missingInRecord1 = difference(actualKeys, requiredKeys);

    return requiredKeysMissing;
  }
  private collectKeys(obj, prefix = '') {
    return reduce(
      obj,
      (result, value, key) => {
        const newKey = prefix ? `${prefix}.${key}` : key; // Create a new key with a prefix for nesting
        if (isObject(value) && !isArray(value)) {
          // If the value is an object (and not an array), recurse into it
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
    console.log('hydratedPayload', hydratedPayload);

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
      throw new BadRequestException(`Step id found for ${command.stepUuid}`);
    }

    return { workflowId, stepId: step.slug, stepType: step.type, stepControlSchema: step.controls };
  }
  private addMissingValuesToPayload(command: GeneratePreviewCommand) {
    const dto = command.generatePreviewRequestDto;
    let payloadFromDto = dto.payloadValues || {};
    const payloadDefaults = {};
    for (const controlValueKey in dto.controlValues) {
      if (dto.controlValues.hasOwnProperty(controlValueKey)) {
        const defaultValues = new CreateMockPayloadUseCase().execute({ dto, controlValueKey });
        payloadFromDto = merge(defaultValues, payloadDefaults);
      }
    }

    const missingRequiredControlValues = this.findMissingKeys(payloadDefaults, payloadFromDto);
    const issues = this.buildControlPreviewIssues(
      missingRequiredControlValues,
      ControlPreviewIssueType.MISSING_VARIABLE_IN_PAYLOAD,
      true
    );

    return { augmentedPayload: merge(payloadDefaults, payloadFromDto), issues };
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
function mergeJsonObjects(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...primary };

  for (const key in secondary) {
    if (!(key in merged)) {
      merged[key] = secondary[key];
    } else if (
      typeof merged[key] === 'object' &&
      merged[key] !== null &&
      typeof secondary[key] === 'object' &&
      secondary[key] !== null
    ) {
      merged[key] = mergeJsonObjects(merged[key] as Record<string, unknown>, secondary[key] as Record<string, unknown>);
    }
  }

  return merged;
}
