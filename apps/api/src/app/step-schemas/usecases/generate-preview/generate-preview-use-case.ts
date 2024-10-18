import { Injectable } from '@nestjs/common/decorators';
import { ChannelTypeEnum, ControlPreviewIssue, GeneratePreviewResponseDto, StepTypeEnum } from '@novu/shared';
import { BadRequestException } from '@nestjs/common';
import { ExecuteOutput } from '@novu/framework';
import { VariableValidatorComponent } from '../../components/variable-validator-component';
import { GeneratePreviewCommand } from './generate-preview-command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow/get-workflow.usecase';
import { CreateMockPayloadUseCase } from '../placeholder-enrichment/payload-preview-value-generator-use-case';

@Injectable()
export class GeneratePreviewUseCase {
  constructor(
    private validator: VariableValidatorComponent,
    private legacyPreviewStepUseCase: PreviewStep,
    private getWorkflowUseCase: GetWorkflowUseCase
  ) {}

  async execute(command: GeneratePreviewCommand): Promise<GeneratePreviewResponseDto> {
    const issues: Record<string, ControlPreviewIssue[]> = this.validateControlValues(command);
    const hydratedPayload = addHydrationValuesToPayload(command);
    const { workflowId, stepId, stepType } = await this.getWorkflowUserIdentifierFromWorkflowObject(command);
    const executeOutput = await this.executePreviewUsecase(hydratedPayload, command, workflowId, stepId);

    return buildResponse(issues, executeOutput, stepType);
  }

  private async executePreviewUsecase(
    hydratedPayload: Record<string, unknown>,
    command: GeneratePreviewCommand,
    workflowId: string,
    stepId: string
  ) {
    const dto = command.generatePreviewRequestDto;
    console.log(`xx:${workflowId}:${stepId}`);

    return await this.legacyPreviewStepUseCase.execute(
      PreviewStepCommand.create({
        payload: hydratedPayload,
        controls: dto.controlValues || {},
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

    return { workflowId, stepId: step.slug, stepType: step.type };
  }

  private validateControlValues(command: GeneratePreviewCommand) {
    return this.validator.searchAndValidatePlaceholderExistence(
      command.generatePreviewRequestDto.validationStrategies,
      command.generatePreviewRequestDto.controlSchema,
      command.generatePreviewRequestDto.payloadValues,
      command.generatePreviewRequestDto.controlValues
    );
  }
}

function addHydrationValuesToPayload(command: GeneratePreviewCommand): Record<string, unknown> {
  const dto = command.generatePreviewRequestDto;
  let payloadFromDto = dto.payloadValues || {};
  for (const controlValueKey in dto.controlValues) {
    if (dto.controlValues.hasOwnProperty(controlValueKey)) {
      const hydratedValue = new CreateMockPayloadUseCase().execute({ dto, controlValueKey });
      console.log('hydratedValue', hydratedValue);
      payloadFromDto = mergeJsonObjects(payloadFromDto, hydratedValue);
    }
  }

  return payloadFromDto;
}
function buildResponse(
  issues: Record<string, ControlPreviewIssue[]>,
  executionOutput: ExecuteOutput,
  stepType: StepTypeEnum
): GeneratePreviewResponseDto {
  return {
    issues,
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
