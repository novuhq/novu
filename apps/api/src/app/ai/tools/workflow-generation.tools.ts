import { PinoLogger } from '@novu/application-generic';
import { AiChatEntity, AiChatRepository } from '@novu/dal';
import {
  AiResourceTypeEnum,
  AiWorkflowToolsEnum,
  ChannelTypeEnum,
  ResourceOriginEnum,
  SeverityLevelEnum,
  StepTypeEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { ToolRuntime, tool } from 'langchain';
import { ClientSession } from 'mongoose';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { GetEnvironmentTags, GetEnvironmentTagsCommand } from '../../environments-v2/usecases/get-environment-tags';
import { GetActiveIntegrationsCommand } from '../../integrations/usecases/get-active-integration/get-active-integration.command';
import { GetActiveIntegrations } from '../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { WorkflowResponseDto } from '../../workflows-v2/dtos';
import {
  GetWorkflowCommand,
  GetWorkflowUseCase,
  UpsertStepDataCommand,
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
} from '../../workflows-v2/usecases';
import {
  buildEditStepSystemPrompt,
  buildEditStepUserPrompt,
  buildStepSystemPrompt,
  buildStepUserPrompt,
  buildUpdateStepConditionsSystemPrompt,
  buildUpdateStepConditionsUserPrompt,
  STEP_CONTENT_PROMPTS,
} from '../prompts/step.prompt';
import { WORKFLOW_METADATA_PROMPT } from '../prompts/workflow.prompt';
import {
  addStepInBetweenInputSchema,
  chatStepOutputSchema,
  delayStepOutputSchema,
  digestStepOutputSchema,
  editStepInputSchema,
  emailStepOutputSchema,
  inAppStepOutputSchema,
  moveStepInputSchema,
  pushStepOutputSchema,
  removeStepInputSchema,
  smsStepOutputSchema,
  stepInputSchema,
  throttleStepOutputSchema,
  updateStepConditionsInputSchema,
  updateStepConditionsOutputSchema,
} from '../schemas/steps-control.schema';
import {
  organizationMetaInputSchema,
  workflowMetadataInputSchema,
  workflowMetadataOutputSchema,
} from '../schemas/workflow-generation.schema';
import { LlmService } from '../services/llm.service';
import { StreamGenerationCommand } from '../types';
import { UpsertChatCommand, UpsertChatUseCase } from '../usecases';
import {
  buildFullVariableSchema,
  computePayloadSchemaFromSteps,
  createEmptyPayloadSchema,
  toGeneratedSteps,
} from '../utils/variable-schema.utils';

export type WorkflowMetadata = {
  description?: string | null;
  tags?: string[] | null;
  name: string;
  severity: SeverityLevelEnum;
  critical: boolean;
};

export class DraftWorkflowState {
  private chat: AiChatEntity;
  private workflow: WorkflowResponseDto | null = null;
  private minimalWorkflow: WorkflowResponseDto | null = null;

  constructor(chat: AiChatEntity) {
    this.chat = chat;
  }

  getChat(): AiChatEntity {
    return this.chat;
  }

  setMinimalWorkflow(snapshot: WorkflowResponseDto): void {
    this.minimalWorkflow = snapshot;
  }

  getMinimalWorkflow(): WorkflowResponseDto | null {
    return this.minimalWorkflow;
  }

  setWorkflow(workflow: WorkflowResponseDto): void {
    this.workflow = workflow;
  }

  getWorkflow(): WorkflowResponseDto | null {
    return this.workflow;
  }
}

const createMinimalWorkflow = async ({
  command,
  metadata,
  session,
  upsertWorkflowUseCase,
  logger,
  draftState,
}: {
  command: StreamGenerationCommand;
  metadata: { name: string };
  session: ClientSession | null;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  logger: PinoLogger;
  draftState: DraftWorkflowState;
}): Promise<WorkflowResponseDto> => {
  const workflowDto: UpsertWorkflowDataCommand = {
    name: metadata.name,
    __source: WorkflowCreationSourceEnum.AI,
    origin: ResourceOriginEnum.NOVU_CLOUD,
    active: true,
    steps: [],
  };

  const persistedWorkflow = await upsertWorkflowUseCase.execute(
    UpsertWorkflowCommand.create({
      user: command.user,
      workflowDto,
      session,
    })
  );

  draftState.setWorkflow(persistedWorkflow);
  draftState.setMinimalWorkflow(persistedWorkflow);

  logger.info(
    { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
    `AI Workflow created with metadata: ${workflowDto.name}`
  );

  return persistedWorkflow;
};

const updateWorkflow = async ({
  command,
  workflow,
  metadata,
  session,
  upsertWorkflowUseCase,
  logger,
  draftState,
}: {
  command: StreamGenerationCommand;
  workflow: WorkflowResponseDto;
  metadata: WorkflowMetadata;
  session: ClientSession | null;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  logger: PinoLogger;
  draftState: DraftWorkflowState;
}): Promise<WorkflowResponseDto> => {
  const steps = workflow.steps.map((s) => ({
    _id: s._id,
    stepId: s.stepId,
    name: s.name,
    type: s.type,
    controlValues: s.controlValues ?? {},
  }));

  const workflowDto: UpsertWorkflowDataCommand = {
    ...workflow,
    name: metadata.name,
    description: metadata.description,
    tags: metadata.tags,
    severity: metadata.severity,
    steps,
    ...(metadata.critical
      ? {
          preferences: {
            user: {
              all: {
                enabled: true,
                readOnly: true,
              },
              channels: {
                [ChannelTypeEnum.IN_APP]: { enabled: true },
                [ChannelTypeEnum.EMAIL]: { enabled: true },
                [ChannelTypeEnum.SMS]: { enabled: true },
                [ChannelTypeEnum.PUSH]: { enabled: true },
                [ChannelTypeEnum.CHAT]: { enabled: true },
              },
            },
          },
        }
      : {}),
  };

  const persistedWorkflow = await upsertWorkflowUseCase.execute(
    UpsertWorkflowCommand.create({
      user: command.user,
      workflowDto,
      workflowIdOrInternalId: workflow._id,
      session,
    })
  );

  draftState.setWorkflow(persistedWorkflow);

  logger.info(
    { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
    `AI Workflow updated with metadata: ${workflowDto.name}`
  );

  return persistedWorkflow;
};

const addWorkflowStep = async ({
  workflowId,
  command,
  step,
  draftState,
  getWorkflowUseCase,
  upsertWorkflowUseCase,
  logger,
}: {
  workflowId: string;
  command: StreamGenerationCommand;
  step: UpsertStepDataCommand;
  draftState: DraftWorkflowState;
  getWorkflowUseCase: GetWorkflowUseCase;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  logger: PinoLogger;
}): Promise<WorkflowResponseDto> => {
  const latestWorkflow = await getWorkflowUseCase.execute(
    GetWorkflowCommand.create({
      workflowIdOrInternalId: workflowId,
      user: command.user,
    })
  );

  const stepAlreadyExists = latestWorkflow.steps.some((s) => s.stepId === step.stepId);
  if (stepAlreadyExists) {
    logger.info({ stepId: step.stepId }, `AI Step already exists, skipping (idempotent resume): ${step.name}`);
    draftState.setWorkflow(latestWorkflow);

    return latestWorkflow;
  }

  try {
    const stepsWithNew = [...latestWorkflow.steps, step];
    const { payloadSchema, validatePayload } = computePayloadSchemaFromSteps(stepsWithNew);

    const persistedWorkflow = await upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: {
          ...latestWorkflow,
          steps: stepsWithNew,
          validatePayload,
          payloadSchema: validatePayload ? payloadSchema : undefined,
        },
        user: command.user,
        workflowIdOrInternalId: workflowId,
      })
    );
    draftState.setWorkflow(persistedWorkflow);

    logger.info({ _id: persistedWorkflow._id, slug: persistedWorkflow.slug }, `AI Workflow step added: ${step.name}`);

    return persistedWorkflow;
  } catch (error) {
    logger.error({ error }, 'Failed to add workflow step');

    throw error;
  }
};

const updateWorkflowStep = async ({
  workflowId,
  command,
  step,
  draftState,
  getWorkflowUseCase,
  upsertWorkflowUseCase,
  logger,
}: {
  workflowId: string;
  command: StreamGenerationCommand;
  step: UpsertStepDataCommand;
  draftState: DraftWorkflowState;
  getWorkflowUseCase: GetWorkflowUseCase;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  logger: PinoLogger;
}): Promise<WorkflowResponseDto> => {
  const latestWorkflow = await getWorkflowUseCase.execute(
    GetWorkflowCommand.create({
      workflowIdOrInternalId: workflowId,
      user: command.user,
    })
  );

  const steps = latestWorkflow.steps.map((s) =>
    s.stepId === step.stepId
      ? {
          ...s,
          name: step.name ?? s.name,
          controlValues: step.controlValues ?? s.controlValues ?? {},
        }
      : s
  );

  try {
    const { payloadSchema, validatePayload } = computePayloadSchemaFromSteps(steps);

    const persistedWorkflow = await upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: {
          ...latestWorkflow,
          steps,
          validatePayload,
          payloadSchema: validatePayload ? payloadSchema : undefined,
        },
        user: command.user,
        workflowIdOrInternalId: workflowId,
      })
    );
    draftState.setWorkflow(persistedWorkflow);

    logger.info({ _id: persistedWorkflow._id, slug: persistedWorkflow.slug }, `AI Workflow step updated: ${step.name}`);

    return persistedWorkflow;
  } catch (error) {
    logger.error({ error }, 'Failed to update workflow step');

    throw error;
  }
};

const removeWorkflowStep = async ({
  workflowId,
  command,
  stepId,
  draftState,
  getWorkflowUseCase,
  upsertWorkflowUseCase,
  logger,
}: {
  workflowId: string;
  command: StreamGenerationCommand;
  stepId: string;
  draftState: DraftWorkflowState;
  getWorkflowUseCase: GetWorkflowUseCase;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  logger: PinoLogger;
}): Promise<WorkflowResponseDto> => {
  const latestWorkflow = await getWorkflowUseCase.execute(
    GetWorkflowCommand.create({
      workflowIdOrInternalId: workflowId,
      user: command.user,
    })
  );

  const steps = latestWorkflow.steps
    .filter((s) => s.stepId !== stepId)
    .map((s) => ({
      _id: s._id,
      stepId: s.stepId,
      name: s.name,
      type: s.type,
      controlValues: s.controlValues ?? {},
    }));

  const { payloadSchema, validatePayload } = computePayloadSchemaFromSteps(steps);

  const persistedWorkflow = await upsertWorkflowUseCase.execute(
    UpsertWorkflowCommand.create({
      workflowDto: {
        ...latestWorkflow,
        steps,
        validatePayload,
        payloadSchema: validatePayload ? payloadSchema : undefined,
      },
      user: command.user,
      workflowIdOrInternalId: workflowId,
    })
  );
  draftState.setWorkflow(persistedWorkflow);

  logger.info({ _id: persistedWorkflow._id, slug: persistedWorkflow.slug }, `AI Workflow step removed: ${stepId}`);

  return persistedWorkflow;
};

const addWorkflowStepInBetween = async ({
  workflowId,
  command,
  step,
  afterStepId,
  draftState,
  getWorkflowUseCase,
  upsertWorkflowUseCase,
  logger,
}: {
  workflowId: string;
  command: StreamGenerationCommand;
  step: UpsertStepDataCommand;
  afterStepId: string;
  draftState: DraftWorkflowState;
  getWorkflowUseCase: GetWorkflowUseCase;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  logger: PinoLogger;
}): Promise<WorkflowResponseDto> => {
  const latestWorkflow = await getWorkflowUseCase.execute(
    GetWorkflowCommand.create({
      workflowIdOrInternalId: workflowId,
      user: command.user,
    })
  );

  const stepAlreadyExists = latestWorkflow.steps.some((s) => s.stepId === step.stepId);
  if (stepAlreadyExists) {
    logger.info({ stepId: step.stepId }, `AI Step already exists, skipping (idempotent resume): ${step.name}`);
    draftState.setWorkflow(latestWorkflow);

    return latestWorkflow;
  }

  const afterIndex = latestWorkflow.steps.findIndex((s) => s.stepId === afterStepId);
  if (afterIndex === -1) {
    throw new Error(`Step ${afterStepId} not found`);
  }

  const insertIndex = afterIndex + 1;
  const steps = [...latestWorkflow.steps.slice(0, insertIndex), step, ...latestWorkflow.steps.slice(insertIndex)];

  try {
    const { payloadSchema, validatePayload } = computePayloadSchemaFromSteps(steps);

    const persistedWorkflow = await upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: {
          ...latestWorkflow,
          steps,
          validatePayload,
          payloadSchema: validatePayload ? payloadSchema : undefined,
        },
        user: command.user,
        workflowIdOrInternalId: workflowId,
      })
    );
    draftState.setWorkflow(persistedWorkflow);

    logger.info(
      { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
      `AI Workflow step added in between: ${step.name} after ${afterStepId}`
    );

    return persistedWorkflow;
  } catch (error) {
    logger.error({ error }, 'Failed to add workflow step in between');

    throw error;
  }
};

const moveWorkflowStep = async ({
  workflowId,
  command,
  stepId,
  toIndex,
  draftState,
  getWorkflowUseCase,
  upsertWorkflowUseCase,
  logger,
}: {
  workflowId: string;
  command: StreamGenerationCommand;
  stepId: string;
  toIndex: number;
  draftState: DraftWorkflowState;
  getWorkflowUseCase: GetWorkflowUseCase;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  logger: PinoLogger;
}): Promise<WorkflowResponseDto> => {
  const latestWorkflow = await getWorkflowUseCase.execute(
    GetWorkflowCommand.create({
      workflowIdOrInternalId: workflowId,
      user: command.user,
    })
  );

  const fromIndex = latestWorkflow.steps.findIndex((s) => s.stepId === stepId);
  if (fromIndex === -1) {
    throw new Error(`Step ${stepId} not found`);
  }

  const clampedIndex = Math.max(0, Math.min(toIndex, latestWorkflow.steps.length - 1));

  const steps = [...latestWorkflow.steps];
  const [step] = steps.splice(fromIndex, 1);
  steps.splice(clampedIndex, 0, step);

  const reorderedSteps = steps.map((s) => ({
    _id: s._id,
    stepId: s.stepId,
    name: s.name,
    type: s.type,
    controlValues: s.controlValues ?? {},
  }));

  const persistedWorkflow = await upsertWorkflowUseCase.execute(
    UpsertWorkflowCommand.create({
      workflowDto: {
        ...latestWorkflow,
        steps: reorderedSteps,
      },
      user: command.user,
      workflowIdOrInternalId: workflowId,
    })
  );
  draftState.setWorkflow(persistedWorkflow);

  logger.info(
    { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
    `AI Workflow step moved: ${stepId} to index ${toIndex}`
  );

  return persistedWorkflow;
};

export function createWorkflowGenerationTools({
  command,
  llmService,
  draftState,
  aiChatRepository,
  getActiveIntegrationsUsecase,
  getWorkflowUseCase,
  upsertChatUseCase,
  upsertWorkflowUseCase,
  getEnvironmentTagsUsecase,
  logger,
}: {
  command: StreamGenerationCommand;
  llmService: LlmService;
  draftState: DraftWorkflowState;
  aiChatRepository: AiChatRepository;
  getActiveIntegrationsUsecase: GetActiveIntegrations;
  getWorkflowUseCase: GetWorkflowUseCase;
  upsertChatUseCase: UpsertChatUseCase;
  upsertWorkflowUseCase: UpsertWorkflowUseCase;
  getEnvironmentTagsUsecase: GetEnvironmentTags;
  logger: PinoLogger;
}) {
  const setWorkflowMetadataTool = tool(
    async (input: z.infer<typeof workflowMetadataInputSchema>, runtime: ToolRuntime) => {
      const existingWorkflow = draftState.getWorkflow();
      const chat = draftState.getChat();

      const workflowMetadata = await llmService.generateObject({
        systemPrompt: WORKFLOW_METADATA_PROMPT,
        userPrompt: input.userRequest,
        schema: workflowMetadataOutputSchema,
      });

      await aiChatRepository.withTransaction(async (session) => {
        if (!existingWorkflow) {
          // create a minimal workflow with the metadata for the snapshot
          const minimalWorkflow = await createMinimalWorkflow({
            command,
            metadata: { name: workflowMetadata.name },
            session,
            upsertWorkflowUseCase,
            logger,
            draftState,
          });

          // upsert the chat with the workflow resource
          await upsertChatUseCase.execute(
            UpsertChatCommand.create({
              id: command.chatId,
              resourceType: AiResourceTypeEnum.WORKFLOW,
              resourceId: minimalWorkflow._id,
              user: command.user,
              session,
            })
          );

          // update the workflow with the metadata
          const updatedWorkflow = await updateWorkflow({
            command,
            workflow: minimalWorkflow,
            metadata: workflowMetadata,
            session,
            upsertWorkflowUseCase,
            logger,
            draftState,
          });

          runtime.writer?.({ type: 'workflow-created', workflowSlug: updatedWorkflow.slug, chatId: chat._id });

          logger.info(
            { workflowId: updatedWorkflow._id, workflowSlug: updatedWorkflow.slug, chatId: chat._id },
            'AI Workflow created via agent'
          );
        } else {
          // update the workflow with the metadata
          const updatedWorkflow = await updateWorkflow({
            command,
            workflow: existingWorkflow,
            metadata: workflowMetadata,
            session,
            upsertWorkflowUseCase,
            logger,
            draftState,
          });

          runtime.writer?.({ type: 'workflow-metadata-updated', workflowSlug: updatedWorkflow.slug, chatId: chat._id });

          logger.info(
            { workflowId: updatedWorkflow._id, workflowSlug: updatedWorkflow.slug, chatId: chat._id },
            'AI Workflow updated via agent'
          );
        }
      });

      return workflowMetadata;
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

      const environmentTags = await getEnvironmentTagsUsecase.execute(
        GetEnvironmentTagsCommand.create({
          environmentIdOrIdentifier: command.user.environmentId,
          organizationId: command.user.organizationId,
          userId: command.user._id,
        })
      );

      const tags = environmentTags.map((tag) => tag.name);

      return { channels: [...new Set(channels)], tags };
    },
    {
      name: AiWorkflowToolsEnum.RETRIEVE_ORGANIZATION_META,
      description: `Retrieve the organization metadata like available channels, tags and workflow examples. Call this first to retrieve the organization metadata.`,
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
    async (input: z.infer<typeof stepInputSchema>, runtime: ToolRuntime) => {
      const stepConfig = stepTypeToSchemaAndPrompt[input.stepType];
      if (!stepConfig) {
        throw new Error(`Unsupported step type for adding: ${input.stepType}`);
      }

      const workflow = draftState.getWorkflow();
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const variablesSchema = buildFullVariableSchema({
        payloadSchema: workflow.payloadSchema ?? createEmptyPayloadSchema(),
        previousSteps: toGeneratedSteps(workflow.steps),
      });

      const newStep = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(stepConfig.prompt, variablesSchema),
        userPrompt: buildStepUserPrompt(input),
        schema: stepConfig.schema,
      });

      if (input.stepType === StepTypeEnum.EMAIL && newStep.controlValues?.editorType === 'block') {
        newStep.controlValues.body = JSON.stringify(newStep.controlValues.body ?? {}) as any;
      }

      if (input.skip) {
        newStep.controlValues = {
          ...newStep.controlValues,
          skip: input.skip,
        } as any;
      }

      await addWorkflowStep({
        workflowId: workflow._id,
        command,
        step: newStep,
        draftState,
        getWorkflowUseCase,
        upsertWorkflowUseCase,
        logger,
      });

      runtime.writer?.({ type: 'step-added', step: newStep });

      logger.info(`AI Step added: ${AiWorkflowToolsEnum.ADD_STEP}`);

      return { stepId: newStep.stepId, name: newStep.name, type: newStep.type };
    },
    {
      name: AiWorkflowToolsEnum.ADD_STEP,
      description: `Add a step to the workflow. Provide the step ID, name, type, and intent. The step content will be generated based on the intent.`,
      schema: zodToJsonSchema(stepInputSchema),
    }
  );

  const addStepInBetweenTool = tool(
    async (input: z.infer<typeof addStepInBetweenInputSchema>, runtime: ToolRuntime) => {
      const stepConfig = stepTypeToSchemaAndPrompt[input.stepType];
      if (!stepConfig) {
        throw new Error(`Unsupported step type for adding: ${input.stepType}`);
      }

      const workflow = draftState.getWorkflow();
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const variablesSchema = buildFullVariableSchema({
        payloadSchema: workflow.payloadSchema ?? createEmptyPayloadSchema(),
        previousSteps: toGeneratedSteps(workflow.steps),
      });

      const newStep = await llmService.generateObject({
        systemPrompt: buildStepSystemPrompt(stepConfig.prompt, variablesSchema),
        userPrompt: buildStepUserPrompt(input),
        schema: stepConfig.schema,
      });

      if (input.stepType === StepTypeEnum.EMAIL && newStep.controlValues?.editorType === 'block') {
        newStep.controlValues.body = JSON.stringify(newStep.controlValues.body ?? {}) as any;
      }

      if (input.skip) {
        newStep.controlValues = {
          ...newStep.controlValues,
          skip: input.skip,
        } as any;
      }

      await addWorkflowStepInBetween({
        workflowId: workflow._id,
        command,
        step: newStep,
        afterStepId: input.afterStepId,
        draftState,
        getWorkflowUseCase,
        upsertWorkflowUseCase,
        logger,
      });

      runtime.writer?.({ type: 'step-added', step: newStep });

      logger.info({ stepId: newStep.stepId, afterStepId: input.afterStepId }, 'AI Step added in between via agent');

      return { stepId: newStep.stepId, name: newStep.name, type: newStep.type };
    },
    {
      name: AiWorkflowToolsEnum.ADD_STEP_IN_BETWEEN,
      description: `Add a new step between two existing steps. Use when the user asks to insert a step in the middle of the workflow. Provide afterStepId (the step after which to insert), plus step ID, name, type, and intent for the new step.`,
      schema: zodToJsonSchema(addStepInBetweenInputSchema),
    }
  );

  const editStepContentTool = tool(
    async (input: z.infer<typeof editStepInputSchema>, runtime: ToolRuntime) => {
      const workflow = draftState.getWorkflow();
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const step = workflow.steps.find((s) => s.stepId === input.stepId);
      if (!step) {
        throw new Error(`Step ${input.stepId} not found in workflow`);
      }

      const stepConfig = stepTypeToSchemaAndPrompt[input.type as StepTypeEnum];
      if (!stepConfig) {
        throw new Error(`Unsupported step type for editing: ${input.type}`);
      }
      const { schema, prompt } = stepConfig;
      const currentControlValues = (step.controlValues ?? step.controls?.values ?? {}) as Record<string, unknown>;

      const variablesSchema = buildFullVariableSchema({
        payloadSchema: workflow.payloadSchema ?? createEmptyPayloadSchema(),
        previousSteps: toGeneratedSteps(workflow.steps),
      });

      const updatedStep = await llmService.generateObject({
        systemPrompt: buildEditStepSystemPrompt(prompt, currentControlValues, variablesSchema),
        userPrompt: buildEditStepUserPrompt(input),
        schema,
      });

      if (updatedStep.controlValues?.editorType === 'block') {
        updatedStep.controlValues.body = JSON.stringify(
          updatedStep.controlValues.body ?? {}
        ) as typeof updatedStep.controlValues.body;
      }

      if (step.controlValues?.skip) {
        updatedStep.controlValues = {
          ...updatedStep.controlValues,
          skip: step.controlValues.skip,
        } as any;
      }

      await updateWorkflowStep({
        workflowId: workflow._id,
        command,
        step: updatedStep,
        draftState,
        getWorkflowUseCase,
        upsertWorkflowUseCase,
        logger,
      });

      runtime.writer?.({ type: 'step-updated', step: updatedStep });

      logger.info({ stepId: updatedStep.stepId }, 'AI Step updated via agent');

      return { stepId: updatedStep.stepId, name: updatedStep.name, type: updatedStep.type };
    },
    {
      name: AiWorkflowToolsEnum.EDIT_STEP_CONTENT,
      description: `Edit the content of an existing workflow step. Use when the user asks to modify step content (e.g., email body, subject, in-app message). Provide the step ID and a clear description of the change.`,
      schema: zodToJsonSchema(editStepInputSchema),
    }
  );

  const updateStepConditionsTool = tool(
    async (input: z.infer<typeof updateStepConditionsInputSchema>, runtime: ToolRuntime) => {
      const workflow = draftState.getWorkflow();
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      const step = workflow.steps.find((s) => s.stepId === input.stepId);
      if (!step) {
        throw new Error(`Step ${input.stepId} not found in workflow`);
      }

      const stepIndex = workflow.steps.findIndex((s) => s.stepId === input.stepId);
      const previousStepIds = workflow.steps
        .slice(0, stepIndex)
        .filter((s) => s.type !== 'trigger')
        .map((s) => s.stepId);

      const existingCondition = step.controlValues?.skip ?? step.controls?.values?.skip ?? null;

      const { skip } = await llmService.generateObject({
        systemPrompt: buildUpdateStepConditionsSystemPrompt(previousStepIds, existingCondition),
        userPrompt: buildUpdateStepConditionsUserPrompt(input),
        schema: updateStepConditionsOutputSchema,
      });

      const updatedStep: UpsertStepDataCommand = {
        stepId: step.stepId,
        name: step.name,
        type: step.type,
        controlValues: {
          ...(step.controlValues ?? {}),
          skip: skip ?? undefined,
        },
      };

      await updateWorkflowStep({
        workflowId: workflow._id,
        command,
        step: updatedStep,
        draftState,
        getWorkflowUseCase,
        upsertWorkflowUseCase,
        logger,
      });

      runtime.writer?.({ type: 'step-updated', step: updatedStep });

      logger.info({ stepId: input.stepId }, 'AI Step conditions updated via agent');

      return { stepId: input.stepId, skip };
    },
    {
      name: AiWorkflowToolsEnum.UPDATE_STEP_CONDITIONS,
      description: `Update the execution condition of an existing step. Use when the user asks to add, change, or remove a step condition. Supports: ADD (merge with existing using AND), REPLACE (set entirely new condition), REMOVE (clear condition). Provide the step ID and a clear description of the condition.`,
      schema: zodToJsonSchema(updateStepConditionsInputSchema),
    }
  );

  const removeStepTool = tool(
    async (input: z.infer<typeof removeStepInputSchema>, runtime: ToolRuntime) => {
      const workflow = draftState.getWorkflow();
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      await removeWorkflowStep({
        workflowId: workflow._id,
        command,
        stepId: input.stepId,
        draftState,
        getWorkflowUseCase,
        upsertWorkflowUseCase,
        logger,
      });

      runtime.writer?.({ type: 'step-removed', stepId: input.stepId });

      logger.info({ stepId: input.stepId }, 'AI Step removed via agent');

      return 'success';
    },
    {
      name: AiWorkflowToolsEnum.REMOVE_STEP,
      description: `Remove a step from the workflow. Use when the user asks to delete or remove a step. Provide the step ID and reason.`,
      schema: zodToJsonSchema(removeStepInputSchema),
    }
  );

  const moveStepTool = tool(
    async (input: z.infer<typeof moveStepInputSchema>, runtime: ToolRuntime) => {
      const workflow = draftState.getWorkflow();
      if (!workflow) {
        throw new Error('Workflow not found');
      }

      await moveWorkflowStep({
        workflowId: workflow._id,
        command,
        stepId: input.stepId,
        toIndex: input.toIndex,
        draftState,
        getWorkflowUseCase,
        upsertWorkflowUseCase,
        logger,
      });

      runtime.writer?.({ type: 'step-moved', stepId: input.stepId });

      logger.info({ stepId: input.stepId, toIndex: input.toIndex }, 'AI Step moved via agent');

      return 'success';
    },
    {
      name: AiWorkflowToolsEnum.MOVE_STEP,
      description: `Move a step to a different position in the workflow. Use when the user asks to reorder steps. Provide the step ID and the target 0-based index.`,
      schema: zodToJsonSchema(moveStepInputSchema),
    }
  );

  return [
    setWorkflowMetadataTool,
    retrieveOrganizationMetaTool,
    addStepTool,
    addStepInBetweenTool,
    editStepContentTool,
    updateStepConditionsTool,
    removeStepTool,
    moveStepTool,
  ];
}
