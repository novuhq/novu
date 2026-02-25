import { AiWorkflowToolsEnum, SeverityLevelEnum, StepTypeEnum } from '@novu/shared';
import { ToolRuntime, tool } from 'langchain';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GetActiveIntegrationsCommand } from '../../integrations/usecases/get-active-integration/get-active-integration.command';
import { GetActiveIntegrations } from '../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { WorkflowResponseDto } from '../../workflows-v2/dtos';
import { UpsertStepDataCommand } from '../../workflows-v2/usecases';
import {
  buildEditStepSystemPrompt,
  buildEditStepUserPrompt,
  buildStepSystemPrompt,
  buildStepUserPrompt,
  STEP_CONTENT_PROMPTS,
} from '../prompts/step.prompt';
import { WORKFLOW_METADATA_PROMPT } from '../prompts/workflow.prompt';
import {
  chatStepOutputSchema,
  delayStepOutputSchema,
  digestStepOutputSchema,
  editStepInputSchema,
  emailStepOutputSchema,
  inAppStepOutputSchema,
  pushStepOutputSchema,
  removeStepInputSchema,
  smsStepOutputSchema,
  stepInputSchema,
  throttleStepOutputSchema,
} from '../schemas/steps-control.schema';
import {
  organizationMetaInputSchema,
  workflowMetadataInputSchema,
  workflowMetadataOutputSchema,
} from '../schemas/workflow-generation.schema';
import { LlmService } from '../services/llm.service';
import { StreamGenerationCommand } from '../types';
import {
  buildFullVariableSchema,
  createEmptyPayloadSchema,
  createInitialVariableSchemaContext,
  extractPayloadVariablesFromControlValues,
  GeneratedStep,
  hasPayloadProperties,
  updateVariableSchemaContext,
  VariableSchemaContext,
} from '../utils/variable-schema.utils';

export type WorkflowMetadata = {
  description?: string | null;
  tags?: string[] | null;
  name: string;
  severity: SeverityLevelEnum;
  critical: boolean;
};

export class DraftWorkflowState {
  private workflow: WorkflowResponseDto | null = null;
  private workflowMetadata: WorkflowMetadata | null = null;
  private steps: UpsertStepDataCommand[] = [];
  private variableSchemaContext: VariableSchemaContext = createInitialVariableSchemaContext();

  setWorkflowMetadata(metadata: WorkflowMetadata): void {
    this.workflowMetadata = metadata;
  }

  getWorkflowMetadata(): WorkflowMetadata | null {
    return this.workflowMetadata;
  }

  addStep(step: UpsertStepDataCommand): void {
    this.steps.push(step);
    this.extractVariablesFromStep(step);
  }

  private extractVariablesFromStep(step: UpsertStepDataCommand): void {
    const extractedVariables = extractPayloadVariablesFromControlValues(step.controlValues ?? {});
    const generatedStep: GeneratedStep = {
      stepId: step.stepId ?? '',
      name: step.name,
      type: step.type as StepTypeEnum,
      controlValues: step.controlValues ?? {},
    };
    this.variableSchemaContext = updateVariableSchemaContext(
      this.variableSchemaContext,
      generatedStep,
      extractedVariables
    );
  }

  getSteps(): UpsertStepDataCommand[] {
    return this.steps;
  }

  setWorkflow(workflow: WorkflowResponseDto): void {
    this.workflow = workflow;
    this.rebuildVariableSchemaFromWorkflow(workflow);
  }

  private rebuildVariableSchemaFromWorkflow(workflow: WorkflowResponseDto): void {
    const payloadSchema = workflow.payloadSchema
      ? (workflow.payloadSchema as JSONSchemaDto)
      : createEmptyPayloadSchema();

    const previousSteps: GeneratedStep[] = workflow.steps.map((step) => ({
      stepId: step.stepId,
      name: step.name,
      type: step.type as StepTypeEnum,
      controlValues: (step.controlValues ?? step.controls?.values ?? {}) as Record<string, unknown>,
    }));

    this.variableSchemaContext = { payloadSchema, previousSteps };
  }

  getWorkflow(): WorkflowResponseDto | null {
    return this.workflow;
  }

  getStepByStepId(
    stepId: string
  ): (WorkflowResponseDto['steps'][number] & { controlValues?: Record<string, unknown> }) | null {
    const step = this.workflow?.steps.find((s) => s.stepId === stepId);

    return step ?? null;
  }

  updateStep(stepId: string, updatedStepData: UpsertStepDataCommand): UpsertStepDataCommand {
    const step = this.getStepByStepId(stepId);
    if (!step || !this.workflow) {
      throw new Error(`Step ${stepId} not found`);
    }

    const mergedStep: UpsertStepDataCommand = {
      _id: step._id,
      stepId: step.stepId,
      name: updatedStepData.name ?? step.name,
      type: step.type,
      controlValues: (updatedStepData.controlValues ?? step.controlValues ?? {}) as Record<string, unknown>,
    };

    const index = this.workflow.steps.findIndex((s) => s.stepId === stepId);
    const controlValues = mergedStep.controlValues ?? {};
    this.workflow.steps[index] = { ...this.workflow.steps[index], controlValues };

    const stepsIndex = this.steps.findIndex((s) => s.stepId === stepId);
    if (stepsIndex !== -1) {
      this.steps[stepsIndex] = mergedStep;
    }

    this.extractVariablesFromStep(mergedStep);

    return mergedStep;
  }

  removeStep(stepId: string): void {
    if (!this.workflow) {
      throw new Error('Workflow not found');
    }

    this.workflow.steps = this.workflow.steps.filter((s) => s.stepId !== stepId);
    this.steps = this.steps.filter((s) => s.stepId !== stepId);
  }

  getFullVariableSchema(): JSONSchemaDto {
    return buildFullVariableSchema(this.variableSchemaContext);
  }

  getPayloadSchema(): JSONSchemaDto | null {
    const { payloadSchema } = this.variableSchemaContext;

    return hasPayloadProperties(payloadSchema) ? payloadSchema : null;
  }
}

export function createWorkflowGenerationTools({
  command,
  llmService,
  draftState,
  getActiveIntegrationsUsecase,
}: {
  command: StreamGenerationCommand;
  llmService: LlmService;
  draftState: DraftWorkflowState;
  getActiveIntegrationsUsecase: GetActiveIntegrations;
}) {
  const setWorkflowMetadataTool = tool(
    async (input: z.infer<typeof workflowMetadataInputSchema>, _: ToolRuntime) => {
      const result = await llmService.generateObject({
        systemPrompt: WORKFLOW_METADATA_PROMPT,
        userPrompt: input.userRequest,
        schema: workflowMetadataOutputSchema,
      });
      draftState.setWorkflowMetadata(result as WorkflowMetadata);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.SET_WORKFLOW_METADATA,
      description: `Generate workflow metadata including name, description, tags, criticality, and severity based on the user's request. Call this tool only once with the user's original request.`,
      schema: zodToJsonSchema(workflowMetadataInputSchema),
    }
  );

  const retrieveOrganizationMetaTool = tool(
    async () => {
      const activeIntegrations = await getActiveIntegrationsUsecase.execute(
        GetActiveIntegrationsCommand.create({
          environmentId: command.user.environmentId,
          organizationId: command.user.organizationId,
          userId: command.user._id,
          returnCredentials: false,
        })
      );
      const channels = activeIntegrations
        .filter((integration) => integration._environmentId === command.user.environmentId)
        .map((integration) => integration.channel);
      // TODO: implement fetching and reusing existing tags
      return { channels: [...new Set(channels)] };
    },
    {
      name: AiWorkflowToolsEnum.RETRIEVE_ORGANIZATION_META,
      description: `Retrieve the organization metadata like available channels, workflow examples. Call this first to retrieve the organization metadata.`,
      schema: zodToJsonSchema(organizationMetaInputSchema),
    }
  );

  const stepTypeToSchemaAndPrompt: Partial<Record<StepTypeEnum, { schema: z.ZodType; prompt: string }>> = {
    [StepTypeEnum.EMAIL]: { schema: emailStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.email },
    [StepTypeEnum.IN_APP]: { schema: inAppStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.in_app },
    [StepTypeEnum.SMS]: { schema: smsStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.sms },
    [StepTypeEnum.PUSH]: { schema: pushStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.push },
    [StepTypeEnum.CHAT]: { schema: chatStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.chat },
    [StepTypeEnum.DIGEST]: { schema: digestStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.digest },
    [StepTypeEnum.DELAY]: { schema: delayStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.delay },
    [StepTypeEnum.THROTTLE]: { schema: throttleStepOutputSchema, prompt: STEP_CONTENT_PROMPTS.throttle },
  };

  const addStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, _: ToolRuntime) => {
      const stepConfig = stepTypeToSchemaAndPrompt[input.stepType];

      if (!stepConfig) {
        throw new Error(`Unsupported step type for adding: ${input.stepType}`);
      }

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(stepConfig.prompt, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: stepConfig.schema,
      });

      if (input.stepType === StepTypeEnum.EMAIL && result.controlValues?.editorType === 'block') {
        result.controlValues.body = JSON.stringify(result.controlValues.body ?? {}) as any;
      }

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStep(result);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_STEP,
      description: `Add a step to the workflow. Provide the step ID, name, type, and intent. The step content will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const editStepContentTool = tool(
    async (input: z.infer<typeof editStepInputSchema>, _: ToolRuntime) => {
      const step = draftState.getStepByStepId(input.stepId);
      if (!step) {
        throw new Error(`Step ${input.stepId} not found in workflow`);
      }

      const stepConfig = stepTypeToSchemaAndPrompt[step.type as StepTypeEnum];
      if (!stepConfig) {
        throw new Error(`Unsupported step type for editing: ${step.type}`);
      }
      const { schema, prompt } = stepConfig;
      const currentControlValues = (step.controlValues ?? step.controls?.values ?? {}) as Record<string, unknown>;

      const result = await llmService.generateObject({
        systemPrompt: buildEditStepSystemPrompt(prompt, currentControlValues, draftState),
        userPrompt: buildEditStepUserPrompt(input),
        schema,
      });

      if (result.controlValues?.editorType === 'block') {
        result.controlValues.body = JSON.stringify(result.controlValues.body ?? {}) as typeof result.controlValues.body;
      }

      if (step.controlValues?.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: step.controlValues.skip,
        } as any;
      }

      const updatedStep = draftState.updateStep(input.stepId, result);

      return updatedStep;
    },
    {
      name: AiWorkflowToolsEnum.EDIT_STEP_CONTENT,
      description: `Edit the content of an existing workflow step. Use when the user asks to modify step content (e.g., email body, subject, in-app message). Provide the step ID and a clear description of the change.`,
      schema: zodToJsonSchema(editStepInputSchema),
    }
  );

  const removeStepTool = tool(
    async (input: z.infer<typeof removeStepInputSchema>) => {
      draftState.removeStep(input.stepId);

      return { removedStepId: input.stepId, reason: input.reason };
    },
    {
      name: AiWorkflowToolsEnum.REMOVE_STEP,
      description: `Remove a step from the workflow. Use when the user asks to delete or remove a step. Provide the step ID and reason.`,
      schema: zodToJsonSchema(removeStepInputSchema),
    }
  );

  return [setWorkflowMetadataTool, retrieveOrganizationMetaTool, addStepTool, editStepContentTool, removeStepTool];
}
