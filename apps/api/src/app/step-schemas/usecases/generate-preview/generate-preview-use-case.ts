import { Injectable } from '@nestjs/common/decorators';
import { ExecuteOutput } from '@novu/framework';
import {
  ChannelTypeEnum,
  ControlPreviewIssue,
  ControlPreviewIssueType,
  GeneratePreviewResponseDto,
} from '@novu/shared';
import { z } from 'zod';
import { VariableValidatorComponent } from '../../components/variable-validator-component';
import { GeneratePreviewCommand } from './generate-preview-command';
import { PreviewStep, PreviewStepCommand } from '../../../bridge/usecases/preview-step';
import {
  addKeysToPayloadBasedOnHydrationStrategy,
  mergeJsonObjects,
} from '../../components/payload-preview-value-generator-component';
import { GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow/get-workflow.usecase';

export const TRANSIENT_PREVIEW_PREFIX = 'TRANSIENT_PREVIEW_PREFIX-';

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
      identifierOrInternalId: command.generatePreviewRequestDto.workflowId,
      user: command.user,
    });
    const { workflowId } = workflowResponseDto;

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
) {
  return GeneratePreviewResponseDtoSchema.parse({
    issues,
    result: {
      preview: executionOutput.outputs,
      type: command.stepType,
    },
  });
}
export enum RedirectTargetEnum {
  SELF = '_self',
  BLANK = '_blank',
  PARENT = '_parent',
  TOP = '_top',
  UNFENCED_TOP = '_unfencedTop',
}

// Define the Zod schemas for each preview result class
export const PreviewResultSchema = z.object({});

export const ChatPreviewResultSchema = PreviewResultSchema.extend({
  body: z.string(),
});

export const SmsPreviewResultSchema = PreviewResultSchema.extend({
  body: z.string(),
});

export const PushPreviewResultSchema = PreviewResultSchema.extend({
  subject: z.string(),
  body: z.string(),
});

export const EmailRenderResultSchema = PreviewResultSchema.extend({
  subject: z.string(),
  body: z.string(),
});

export const InAppPreviewResultSchema = PreviewResultSchema.extend({
  subject: z.string(),
  body: z.string(),
  avatar: z.string().optional(),
  primaryAction: z.object({
    label: z.string(),
    redirect: z.object({
      url: z.string(),
      target: z.nativeEnum(RedirectTargetEnum).optional(),
    }),
  }),
  secondaryAction: z
    .object({
      label: z.string(),
      redirect: z.object({
        url: z.string(),
        target: z.nativeEnum(RedirectTargetEnum).optional(),
      }),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
  redirect: z.object({
    url: z.string(),
    target: z.nativeEnum(RedirectTargetEnum).optional(),
  }),
});
export const ControlPreviewIssueSchema = z.object({
  issueType: z.nativeEnum(ControlPreviewIssueType), // Assuming ControlPreviewIssueType is an enum
  variableName: z.string().optional(), // Optional field
  message: z.string(), // Required field
});
// Define the GeneratePreviewResponseDto schema
export const GeneratePreviewResponseDtoSchema = z.object({
  issues: z.record(z.array(ControlPreviewIssueSchema)),
  result: z
    .union([
      z.object({
        type: z.literal(ChannelTypeEnum.EMAIL),
        preview: EmailRenderResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.IN_APP),
        preview: InAppPreviewResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.SMS),
        preview: SmsPreviewResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.PUSH),
        preview: PushPreviewResultSchema,
      }),
      z.object({
        type: z.literal(ChannelTypeEnum.CHAT),
        preview: ChatPreviewResultSchema,
      }),
    ])
    .optional(),
});
