import { Injectable } from '@nestjs/common/decorators';
import {
  ControlPreviewIssue,
  GeneratePreviewResponseDto,
  GeneratePreviewResponseDtoSchema,
  TRANSIENT_PREVIEW_PREFIX,
} from '@novu/shared-internal';
import { ExecuteOutput } from '@novu/framework';
import { VariableValidatorComponent } from '../../components/variable-validator-component';
import { GeneratePreviewCommand } from './generate-preview-command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import { addKeysToPayloadBasedOnHydrationStrategy } from '../../components/payload-preview-value-generator-component';
import { GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow/get-workflow.usecase';

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
    const executeOutput = await this.executePreviewUsecase(hydratedPayload, command);

    return buildResponse(issues, executeOutput, command);
  }

  private async executePreviewUsecase(hydratedPayload: Record<string, unknown>, command: GeneratePreviewCommand) {
    const dto = command.generatePreviewRequestDto;
    const workflowId = await this.getWorkflowUserIdentifierFromWorkflowObject(command);

    return await this.legacyPreviewStepUseCase.execute(
      PreviewStepCommand.create({
        payload: hydratedPayload,
        controls: dto.controlValues || {},
        environmentId: command.user.environmentId,
        organizationId: command.user.organizationId,
        stepId: dto.stepId || TRANSIENT_PREVIEW_PREFIX + command.stepType,
        userId: command.user._id,
        workflowId,
      })
    );
  }

  private async getWorkflowUserIdentifierFromWorkflowObject(command: GeneratePreviewCommand) {
    const workflowResponseDto = await this.getWorkflowUseCase.execute({
      _workflowId: command.generatePreviewRequestDto.workflowId,
      user: command.user,
    });
    const { workflowId } = workflowResponseDto;
    console.log('workflowId:', workflowId);

    return workflowId;
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
  const payloadFromDto = dto.payloadValues || {};
  for (const key in dto.controlValues) {
    if (dto.controlValues.hasOwnProperty(key)) {
      const hydratedValue = addKeysToPayloadBasedOnHydrationStrategy(dto, key);
      if (hydratedValue) {
        payloadFromDto[key] = hydratedValue;
      }
    }
  }

  return payloadFromDto;
}
function buildResponse(
  issues: Record<string, ControlPreviewIssue[]>,
  executionOutput: ExecuteOutput,
  command: GeneratePreviewCommand
) {
  return GeneratePreviewResponseDtoSchema.parse({
    issues,
    result: {
      preview: executionOutput.outputs,
      type: command.stepType,
    },
  });
}
