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
import { JSONSchemaDto } from '../../../shared/dtos/json-schema.dto';
import {
  UpsertStepDataCommand,
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
import {
  buildFullVariableSchema,
  createInitialVariableSchemaContext,
  extractPayloadVariablesFromControlValues,
  GeneratedStep,
  hasPayloadProperties,
  updateVariableSchemaContext,
  VariableSchemaContext,
} from './variable-schema.utils';

interface GenerateStepControlValuesResult {
  steps: UpsertStepDataCommand[];
  variableSchemaContext: VariableSchemaContext;
}

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
    // Also builds a cumulative variable schema (payload, steps, etc.) from variables used in each step
    const { steps: stepsWithControlValues, variableSchemaContext } = await this.generateStepControlValues({
      workflowMetadata,
      userPrompt,
    });

    const { payloadSchema } = variableSchemaContext;

    const workflowDto: UpsertWorkflowDataCommand = {
      ...workflowFields,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      __source: WorkflowCreationSourceEnum.AI,
      active: true,
      steps: stepsWithControlValues,
      payloadSchema: hasPayloadProperties(payloadSchema) ? payloadSchema : null,
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
      reasoning,
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
  }): Promise<GenerateStepControlValuesResult> {
    const { steps } = workflowMetadata;
    this.logger.info(`AI Phase 2: Generating control values for ${steps.length} steps...`);

    const stepsWithControlValues: UpsertStepDataCommand[] = [];
    let variableSchemaContext = createInitialVariableSchemaContext();
    const existingStepIds = new Set<string>();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepId = this.generateUniqueStepId(step.name, existingStepIds);
      existingStepIds.add(stepId);

      const fullVariableSchema = buildFullVariableSchema(variableSchemaContext);
      const controlValues = await this.generateSingleStepControlValues({
        step,
        workflowMetadata,
        userPrompt,
        variableSchema: fullVariableSchema,
      });

      const extractedVariables = extractPayloadVariablesFromControlValues(controlValues);
      if (extractedVariables.length > 0) {
        this.logger.info(
          `AI Extracted ${extractedVariables.length} payload variables from step "${step.name}": ${extractedVariables.map((v) => v.name).join(', ')}`
        );
      }

      const generatedStep: GeneratedStep = {
        stepId,
        name: step.name,
        type: step.type,
        controlValues,
      };

      variableSchemaContext = updateVariableSchemaContext(variableSchemaContext, generatedStep, extractedVariables);

      stepsWithControlValues.push({
        ...generatedStep,
      });
    }

    return { steps: stepsWithControlValues, variableSchemaContext };
  }

  private generateUniqueStepId(stepName: string, existingStepIds: Set<string>): string {
    const baseId = stepName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!existingStepIds.has(baseId)) {
      return baseId;
    }

    let counter = 2;
    let uniqueId = `${baseId}-${counter}`;
    while (existingStepIds.has(uniqueId)) {
      counter++;
      uniqueId = `${baseId}-${counter}`;
    }

    return uniqueId;
  }

  private async generateSingleStepControlValues({
    step,
    workflowMetadata,
    userPrompt,
    variableSchema,
  }: {
    step: StepMetadata;
    workflowMetadata: WorkflowMetadata;
    userPrompt: string;
    variableSchema?: JSONSchemaDto;
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
      userPrompt: buildStepPrompt({ step, workflowMetadata, userPrompt, variableSchema }),
      schema,
    });

    if (stepType === StepTypeEnum.EMAIL) {
      const result = wrappedResult as z.infer<typeof wrappedEmailControlSchema>;
      const { editorType, body, ...rest } = result.root;
      if (editorType === 'block') {
        return { editorType, body: JSON.stringify(body), ...rest };
      }

      return wrappedResult.root as Record<string, unknown>;
    }

    return wrappedResult.root as Record<string, unknown>;
  }
}
