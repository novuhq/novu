import { AiWorkflowToolsEnum, StepTypeEnum } from '@novu/shared';
import { generateId } from 'ai';
import { ToolRuntime, tool } from 'langchain';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GetActiveIntegrationsCommand } from '../../integrations/usecases/get-active-integration/get-active-integration.command';
import { GetActiveIntegrations } from '../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { WorkflowResponseDto } from '../../workflows-v2/dtos';
import { UpsertStepDataCommand } from '../../workflows-v2/usecases';
import { buildStepSystemPrompt, buildStepUserPrompt, STEP_CONTENT_PROMPTS } from '../prompts/step.prompt';
import { WORKFLOW_METADATA_PROMPT } from '../prompts/workflow.prompt';
import {
  chatStepOutputSchema,
  delayStepOutputSchema,
  digestStepOutputSchema,
  emailStepOutputSchema,
  inAppStepOutputSchema,
  pushStepOutputSchema,
  smsStepOutputSchema,
  stepInputSchema,
  throttleStepOutputSchema,
} from '../schemas/steps-control.schema';
import {
  completeWorkflowInputSchema,
  organizationMetaInputSchema,
  workflowMetadataInputSchema,
  workflowMetadataOutputSchema,
} from '../schemas/workflow-generation.schema';
import { LlmService } from '../services/llm.service';
import { StreamGenerationCommand } from '../types';
import { writeToolReasoningInChunks } from '../utils/streaming';
import {
  buildFullVariableSchema,
  createInitialVariableSchemaContext,
  extractPayloadVariablesFromControlValues,
  GeneratedStep,
  hasPayloadProperties,
  updateVariableSchemaContext,
  VariableSchemaContext,
} from '../utils/variable-schema.utils';

export class DraftWorkflowState {
  private workflow: WorkflowResponseDto | null = null;
  private workflowMetadata: z.infer<typeof workflowMetadataOutputSchema> | null = null;
  private steps: UpsertStepDataCommand[] = [];
  private variableSchemaContext: VariableSchemaContext = createInitialVariableSchemaContext();
  private reasoning: z.infer<typeof completeWorkflowInputSchema> | null = null;

  setWorkflowMetadata(metadata: z.infer<typeof workflowMetadataOutputSchema>): void {
    this.workflowMetadata = metadata;
  }

  getWorkflowMetadata(): z.infer<typeof workflowMetadataOutputSchema> | null {
    return this.workflowMetadata;
  }

  addStepAndExtractVariables(step: UpsertStepDataCommand): void {
    this.steps.push(step);

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
  }

  getWorkflow(): WorkflowResponseDto | null {
    return this.workflow;
  }

  getFullVariableSchema(): JSONSchemaDto {
    return buildFullVariableSchema(this.variableSchemaContext);
  }

  getPayloadSchema(): JSONSchemaDto | null {
    const { payloadSchema } = this.variableSchemaContext;

    return hasPayloadProperties(payloadSchema) ? payloadSchema : null;
  }

  setReasoning(reasoning: z.infer<typeof completeWorkflowInputSchema>): void {
    this.reasoning = reasoning;
  }

  getReasoning(): z.infer<typeof completeWorkflowInputSchema> | null {
    return this.reasoning;
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
    async (input: z.infer<typeof workflowMetadataInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(generateId(), toolCallId, `**User request:**\n${input.userRequest}`, writer);

      const result = await llmService.generateObject(
        {
          systemPrompt: WORKFLOW_METADATA_PROMPT,
          userPrompt: input.userRequest,
          schema: workflowMetadataOutputSchema,
        },
        { modelId: 'gpt-5-mini', provider: 'openai' }
      );
      draftState.setWorkflowMetadata(result);

      const reasoningText =
        `**Workflow details**\n\n` +
        `**Name:** ${result.name}\n\n` +
        `**Description:** ${result.description || 'no description'}\n\n` +
        `**Tags:** ${result.tags?.join(', ') || 'none'}\n\n` +
        `**Severity:** ${result.severity.toString().toLowerCase()}\n\n` +
        `**Critical:** ${result.critical ? 'yes' : 'no'}`;

      await writeToolReasoningInChunks(generateId(), toolCallId, reasoningText, writer);

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

  const addEmailStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** Email
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.email, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: emailStepOutputSchema,
      });

      if (result.controlValues?.editorType === 'block') {
        result.controlValues.body = JSON.stringify(result.controlValues.body ?? {}) as any;
      }

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      await writeToolReasoningInChunks(generateId(), toolCallId, `\n\n✅ **Done!**`, writer);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_EMAIL_STEP,
      description: `Add an email step to the workflow. Provide the step ID, name, and intent. The email content will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addInAppStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** In-App
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.in_app, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: inAppStepOutputSchema,
      });

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      await writeToolReasoningInChunks(generateId(), toolCallId, `\n\n✅ **Done!**`, writer);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_IN_APP_STEP,
      description: `Add an in-app notification step to the workflow. Provide the step ID, name, and intent. The notification content will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addSmsStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** SMS
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.sms, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: smsStepOutputSchema,
      });

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      await writeToolReasoningInChunks(generateId(), toolCallId, `\n\n✅ **Done!**`, writer);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_SMS_STEP,
      description: `Add an SMS step to the workflow. Provide the step ID, name, and intent. The SMS content will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addPushStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** Push
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.push, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: pushStepOutputSchema,
      });

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      await writeToolReasoningInChunks(generateId(), toolCallId, `\n\n✅ **Done!**`, writer);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_PUSH_STEP,
      description: `Add a push notification step to the workflow. Provide the step ID, name, and intent. The push notification content will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addChatStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** Chat
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.chat, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: chatStepOutputSchema,
      });

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      await writeToolReasoningInChunks(generateId(), toolCallId, `\n\n✅ **Done!**`, writer);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_CHAT_STEP,
      description: `Add a chat step (Slack/Discord/Teams) to the workflow. Provide the step ID, name, and intent. The chat message content will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addDigestStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** Digest
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.digest, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: digestStepOutputSchema,
      });

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      await writeToolReasoningInChunks(generateId(), toolCallId, `\n\n✅ **Done!**`, writer);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_DIGEST_STEP,
      description: `Add a digest step to batch multiple notifications. Provide the step ID, name, and intent. The digest configuration will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addDelayStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** Delay
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.delay, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: delayStepOutputSchema,
      });

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_DELAY_STEP,
      description: `Add a delay step to pause workflow execution. Provide the step ID, name, and intent. The delay configuration will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addThrottleStepTool = tool(
    async (input: z.infer<typeof stepInputSchema>, config: ToolRuntime) => {
      const writer = config.writer ?? (() => {});
      const toolCallId = config.toolCallId;

      await writeToolReasoningInChunks(
        generateId(),
        toolCallId,
        `⚙️ **Creating step:**
- **Type:** Throttle
- **Name:** ${input.name}`,
        writer
      );

      const result = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.throttle, draftState),
        userPrompt: buildStepUserPrompt(input),
        schema: throttleStepOutputSchema,
      });

      if (input.skip) {
        result.controlValues = {
          ...result.controlValues,
          skip: input.skip,
        } as any;
      }

      draftState.addStepAndExtractVariables(result);

      await writeToolReasoningInChunks(generateId(), toolCallId, `\n\n✅ **Done!**`, writer);

      return result;
    },
    {
      name: AiWorkflowToolsEnum.ADD_THROTTLE_STEP,
      description: `Add a throttle step to limit notification frequency. Provide the step ID, name, and intent. The throttle configuration will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const completeWorkflowTool = tool(
    async (input: z.infer<typeof completeWorkflowInputSchema>) => {
      draftState.setReasoning(input);

      return {
        ...input,
      };
    },
    {
      name: AiWorkflowToolsEnum.COMPLETE_WORKFLOW,
      description: `Mark the workflow generation as complete. Call this as last tool after all steps have been added. Provide a summary of the reasoning behind the workflow design. This will return the complete draft workflow with all metadata and steps.`,
      schema: zodToJsonSchema(completeWorkflowInputSchema),
    }
  );

  return [
    setWorkflowMetadataTool,
    retrieveOrganizationMetaTool,
    addEmailStepTool,
    addInAppStepTool,
    addSmsStepTool,
    addPushStepTool,
    addChatStepTool,
    addDigestStepTool,
    addDelayStepTool,
    addThrottleStepTool,
    completeWorkflowTool,
  ];
}
