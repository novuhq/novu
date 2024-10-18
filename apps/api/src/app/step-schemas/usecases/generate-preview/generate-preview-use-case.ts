import { Injectable } from '@nestjs/common/decorators';
import { ExecuteOutput } from '@novu/framework';
import { ControlPreviewIssue, GeneratePreviewResponseDto } from '@novu/shared';
import { BadRequestException } from '@nestjs/common';
import { VariableValidatorComponent } from '../../components/variable-validator-component';
import { GeneratePreviewCommand } from './generate-preview-command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import {
  addKeysToPayloadBasedOnHydrationStrategy,
  mergeJsonObjects,
} from '../../components/payload-preview-value-generator-component';
import { GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow/get-workflow.usecase';

@Injectable()
export class GeneratePreviewUseCase {
  constructor(
    private validator: VariableValidatorComponent,
    private legacyPreviewStepUseCase: PreviewStep,
    private getWorkflowUseCase: GetWorkflowUseCase
  ) {}

  async execute(command: GeneratePreviewCommand): Promise<GeneratePreviewResponseDto> {
    console.log('GeneratePreviewUseCase.execute', JSON.stringify(command, null, 2));
    const issues: Record<string, ControlPreviewIssue[]> = this.validateControlValues(command);
    const hydratedPayload = addHydrationValuesToPayload(command);
    const executeOutput = await this.executePreviewUsecase(hydratedPayload, command);

    return buildResponse(issues, executeOutput, command);
  }

  private async executePreviewUsecase(hydratedPayload: Record<string, unknown>, command: GeneratePreviewCommand) {
    const dto = command.generatePreviewRequestDto;
    const { workflowId, stepId } = await this.getWorkflowUserIdentifierFromWorkflowObject(command);
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
      identifierOrInternalId: command.generatePreviewRequestDto.workflowId,
      user: command.user,
    });
    const { workflowId, steps } = workflowResponseDto;
    const step = steps.find((stepDto) => stepDto.stepUuid === command.generatePreviewRequestDto.stepId);
    if (!step) {
      throw new BadRequestException(`Step id found for ${command.generatePreviewRequestDto.stepId}`);
    }

    return { workflowId, stepId: step.slug };
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
  for (const key in dto.controlValues) {
    if (dto.controlValues.hasOwnProperty(key)) {
      const hydratedValue = addKeysToPayloadBasedOnHydrationStrategy(dto, key);
      payloadFromDto = mergeJsonObjects(payloadFromDto, hydratedValue);
    }
  }

  return payloadFromDto;
}
function buildResponse(
  issues: Record<string, ControlPreviewIssue[]>,
  executionOutput: ExecuteOutput,
  command: GeneratePreviewCommand
): GeneratePreviewResponseDto {
  return {
    issues,
    result: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      preview: executionOutput.outputs as any,
      type: command.stepType,
    },
  };
}
