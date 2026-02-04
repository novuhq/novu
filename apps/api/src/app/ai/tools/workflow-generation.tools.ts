import { AiWorkflowToolsEnum, StepTypeEnum } from '@novu/shared';
import { generateId, tool, UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { GetActiveIntegrationsCommand } from '../../integrations/usecases/get-active-integration/get-active-integration.command';
import { GetActiveIntegrations } from '../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { JSONSchemaDto } from '../../shared/dtos/json-schema.dto';
import { WorkflowResponseDto } from '../../workflows-v2/dtos';
import { UpsertStepDataCommand } from '../../workflows-v2/usecases';
import { WORKFLOW_METADATA_PROMPT } from '../prompts';
import { buildStepSystemPrompt, buildStepUserPrompt, STEP_CONTENT_PROMPTS } from '../prompts/step.prompt';
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
  organizationMetaOutputSchema,
  workflowMetadataInputSchema,
  workflowMetadataOutputSchema,
} from '../schemas/workflow-generation.schema';
import { LlmService } from '../services/llm.service';
import { StreamGenerationCommand } from '../usecases';
import { writeToolReasoningInChunks } from './utils';
import {
  buildFullVariableSchema,
  createInitialVariableSchemaContext,
  extractPayloadVariablesFromControlValues,
  GeneratedStep,
  hasPayloadProperties,
  updateVariableSchemaContext,
  VariableSchemaContext,
} from './variable-schema.utils';

export class DraftWorkflowState {
  private workflow: WorkflowResponseDto | null = null;
  private steps: UpsertStepDataCommand[] = [];
  private reasoning: z.infer<typeof completeWorkflowInputSchema> | null = null;
  private variableSchemaContext: VariableSchemaContext = createInitialVariableSchemaContext();

  setWorkflow(workflow: WorkflowResponseDto): void {
    this.workflow = workflow;
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

  setReasoning(reasoning: z.infer<typeof completeWorkflowInputSchema>): void {
    this.reasoning = reasoning;
  }

  getWorkflow(): WorkflowResponseDto | null {
    return this.workflow;
  }

  getSteps(): UpsertStepDataCommand[] {
    return this.steps;
  }

  getReasoning(): z.infer<typeof completeWorkflowInputSchema> | null {
    return this.reasoning;
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
  writer,
  llmService,
  draftState,
  getActiveIntegrationsUsecase,
}: {
  command: StreamGenerationCommand;
  writer: UIMessageStreamWriter;
  llmService: LlmService;
  draftState: DraftWorkflowState;
  getActiveIntegrationsUsecase: GetActiveIntegrations;
}) {
  return {
    [AiWorkflowToolsEnum.RETRIEVE_ORGANIZATION_META]: tool({
      description: `Retrieve the organization metadata like available channels, workflow examples. Call this FIRST to retrieve the organization metadata.`,
      inputSchema: organizationMetaInputSchema,
      outputSchema: organizationMetaOutputSchema,
      execute: async (_: z.infer<typeof organizationMetaInputSchema>) => {
        const activeIntegrations = await getActiveIntegrationsUsecase.execute(
          GetActiveIntegrationsCommand.create({
            environmentId: command.user.environmentId,
            organizationId: command.user.organizationId,
            userId: command.user._id,
            returnCredentials: false,
          })
        );
        return { success: true, channels: activeIntegrations.map((integration) => integration.channel) };
      },
    }),
    [AiWorkflowToolsEnum.SET_WORKFLOW_METADATA]: tool({
      description: `Set the workflow metadata including name, description, tags, criticality, and severity. 
Call this FIRST to establish the workflow foundation before adding any steps.
Provide the user's original request so the content can be generated appropriately.`,
      inputSchema: workflowMetadataInputSchema,
      execute: async (input: z.infer<typeof workflowMetadataInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: '🔍 **Analyzing Workflow Requirements**',
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: WORKFLOW_METADATA_PROMPT,
          userPrompt: input.userRequest,
          schema: workflowMetadataOutputSchema,
          temperature: 0,
        });

        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `\n\nBased on the user input, the workflow metadata has been successfully generated and enriched.
\n🧩 **Workflow Details:**
- **Name:** ${result.name}
- **Description:** ${result.description}
- **Tags:** ${result.tags?.join(', ') ?? 'No tags generated'}
- **Severity:** ${result.severity}`,
          writer,
        });

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_EMAIL_STEP]: tool({
      description: `Add an email step to the workflow. Provide the step ID, name, and intent.
The email content will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** Email
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.email, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: emailStepOutputSchema,
          temperature: 0,
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

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_IN_APP_STEP]: tool({
      description: `Add an in-app notification step to the workflow. Provide the step ID, name, and intent.
The notification content will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** In-App
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.in_app, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: inAppStepOutputSchema,
          temperature: 0,
        });

        if (input.skip) {
          result.controlValues = {
            ...result.controlValues,
            skip: input.skip,
          } as any;
        }

        draftState.addStepAndExtractVariables(result);

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_SMS_STEP]: tool({
      description: `Add an SMS step to the workflow. Provide the step ID, name, and intent.
The SMS content will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** SMS
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.sms, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: smsStepOutputSchema,
          temperature: 0,
        });

        if (input.skip) {
          result.controlValues = {
            ...result.controlValues,
            skip: input.skip,
          } as any;
        }

        draftState.addStepAndExtractVariables(result);

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_PUSH_STEP]: tool({
      description: `Add a push notification step to the workflow. Provide the step ID, name, and intent.
The push notification content will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** Push
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.push, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: pushStepOutputSchema,
          temperature: 0,
        });

        if (input.skip) {
          result.controlValues = {
            ...result.controlValues,
            skip: input.skip,
          } as any;
        }

        draftState.addStepAndExtractVariables(result);

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_CHAT_STEP]: tool({
      description: `Add a chat step (Slack/Discord/Teams) to the workflow. Provide the step ID, name, and intent.
The chat message content will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** Chat
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.chat, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: chatStepOutputSchema,
          temperature: 0,
        });

        if (input.skip) {
          result.controlValues = {
            ...result.controlValues,
            skip: input.skip,
          } as any;
        }

        draftState.addStepAndExtractVariables(result);

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_DIGEST_STEP]: tool({
      description: `Add a digest step to batch multiple notifications. Provide the step ID, name, and intent.
The digest configuration will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** Digest
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.digest, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: digestStepOutputSchema,
          temperature: 0,
        });

        if (input.skip) {
          result.controlValues = {
            ...result.controlValues,
            skip: input.skip,
          } as any;
        }

        draftState.addStepAndExtractVariables(result);

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_DELAY_STEP]: tool({
      description: `Add a delay step to pause workflow execution. Provide the step ID, name, and intent.
The delay configuration will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** Delay
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.delay, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: delayStepOutputSchema,
          temperature: 0,
        });

        if (input.skip) {
          result.controlValues = {
            ...result.controlValues,
            skip: input.skip,
          } as any;
        }

        draftState.addStepAndExtractVariables(result);

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.ADD_THROTTLE_STEP]: tool({
      description: `Add a throttle step to limit notification frequency. Provide the step ID, name, and intent.
The throttle configuration will be generated based on the intent.`,
      inputSchema: stepInputSchema,
      execute: async (input: z.infer<typeof stepInputSchema>, { toolCallId }) => {
        await writeToolReasoningInChunks({
          id: generateId(),
          toolCallId,
          text: `⚙️ **Creating step:**
- **Type:** Throttle
- **Name:** ${input.name}`,
          writer,
        });

        const result = await llmService.generateObject({
          systemPrompt: buildStepSystemPrompt(STEP_CONTENT_PROMPTS.throttle, draftState),
          userPrompt: buildStepUserPrompt(input),
          schema: throttleStepOutputSchema,
          temperature: 0,
        });

        if (input.skip) {
          result.controlValues = {
            ...result.controlValues,
            skip: input.skip,
          } as any;
        }

        draftState.addStepAndExtractVariables(result);

        return { success: true, ...result };
      },
    }),

    [AiWorkflowToolsEnum.COMPLETE_WORKFLOW]: tool({
      description: `Mark the workflow generation as complete. Call this LAST after all steps have been added.
Provide a summary of the reasoning behind the workflow design.
This will return the complete draft workflow with all metadata and steps.`,
      inputSchema: completeWorkflowInputSchema,
      execute: async (input: z.infer<typeof completeWorkflowInputSchema>) => {
        draftState.setReasoning(input);

        return {
          success: true,
          completed: true,
          ...input,
        };
      },
    }),
  };
}
