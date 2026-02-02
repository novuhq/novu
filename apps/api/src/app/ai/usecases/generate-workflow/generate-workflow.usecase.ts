import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AiConversationStatusEnum,
  AiMessageRoleEnum,
  ResourceOriginEnum,
  StepTypeEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { z } from 'zod';
import {
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
} from '../../../workflows-v2/usecases/upsert-workflow';
import { AiConversationDto } from '../../dtos';
import { buildStepPrompt, STEP_CONTENT_PROMPTS } from '../../prompts/step.prompt';
import { WORKFLOW_METADATA_PROMPT } from '../../prompts/workflow.prompt';
import { wrappedEmailControlSchema } from '../../schemas/steps-control.schema';
import {
  StepMetadata,
  SupportedStepType,
  stepControlValueSchemas,
  WorkflowMetadata,
  workflowMetadataSchema,
} from '../../schemas/workflow-generation.schema';
import { LlmService } from '../../services/llm.service';
import { GenerateWorkflowCommand } from './generate-workflow.command';

type StepWithControlValues = StepMetadata & { controlValues: Record<string, unknown> };

@Injectable()
export class GenerateWorkflowUseCase {
  constructor(
    private readonly logger: PinoLogger,
    private readonly llmService: LlmService,
    private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase
  ) {}

  async execute(command: GenerateWorkflowCommand): Promise<AiConversationDto> {
    const userPrompt = command.prompt.trim();
    this.logger.info(`AI Generating workflow for prompt: ${userPrompt.substring(0, 100)}...`);

    // Phase 1: Generate workflow metadata and step structure
    const workflowMetadata = await this.generateWorkflowMetadata(userPrompt);
    const { reasoning, steps: _steps, ...workflowFields } = workflowMetadata;

    // Phase 2: Generate step control values based on step type
    // Each prompt instructs the AI to wrap the response in { root: { ... } }
    const stepsWithControlValues = await this.generateStepControlValues({ workflowMetadata, userPrompt });

    const workflowDto: UpsertWorkflowDataCommand = {
      ...workflowFields,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      __source: WorkflowCreationSourceEnum.AI,
      active: true,
      steps: stepsWithControlValues as any,
    };

    const workflow = await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        user: command.user,
        workflowDto,
      })
    );

    const now = new Date();
    const conversation: AiConversationDto = {
      messages: [
        {
          role: AiMessageRoleEnum.USER,
          content: userPrompt,
          timestamp: now,
        },
        {
          role: AiMessageRoleEnum.ASSISTANT,
          content: JSON.stringify({ reasoning }),
          timestamp: now,
        },
      ],
      status: AiConversationStatusEnum.ACTIVE,
      workflow,
      reasoning: reasoning as any,
    };

    return conversation;
  }

  private async generateWorkflowMetadata(userPrompt: string): Promise<WorkflowMetadata> {
    this.logger.info('AI Phase 1: Generating workflow metadata and step structure...');

    return await this.llmService.generateObject({
      systemPrompt: WORKFLOW_METADATA_PROMPT,
      userPrompt,
      schema: workflowMetadataSchema,
    });
  }

  private async generateStepControlValues({
    workflowMetadata,
    userPrompt,
  }: {
    workflowMetadata: WorkflowMetadata;
    userPrompt: string;
  }): Promise<StepWithControlValues[]> {
    const { steps } = workflowMetadata;
    this.logger.info(`AI Phase 2: Generating control values for ${steps.length} steps...`);

    const stepsWithControlValues: StepWithControlValues[] = [];

    for (const step of steps) {
      const controlValues = await this.generateSingleStepControlValues({ step, workflowMetadata, userPrompt });
      stepsWithControlValues.push({
        ...step,
        controlValues,
      });
    }

    return stepsWithControlValues;
  }

  private async generateSingleStepControlValues({
    step,
    workflowMetadata,
    userPrompt,
  }: {
    step: StepMetadata;
    workflowMetadata: WorkflowMetadata;
    userPrompt: string;
  }): Promise<Record<string, unknown>> {
    const stepType = step.type as SupportedStepType;
    const schema = stepControlValueSchemas[stepType];
    const systemPrompt = STEP_CONTENT_PROMPTS[stepType];

    if (!schema || !systemPrompt) {
      throw new Error(`Unknown step type: ${stepType}`);
    }

    this.logger.info(`AI Generating control values for step: ${step.name} (${stepType})`);

    const wrappedResult = await this.llmService.generateObject({
      systemPrompt,
      userPrompt: buildStepPrompt({ step, workflowMetadata, userPrompt }),
      schema,
    });

    if (stepType === StepTypeEnum.EMAIL) {
      const result = wrappedResult as z.infer<typeof wrappedEmailControlSchema>;
      const { editorType, body, ...rest } = result.root;
      // The Maily JSON body is returned as an object, so we need to stringify it.
      if (editorType === 'block') {
        return { editorType, body: JSON.stringify(body), ...rest };
      }

      return wrappedResult.root as Record<string, unknown>;
    }

    return wrappedResult.root as Record<string, unknown>;
  }
}
