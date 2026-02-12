import { toUIMessageStream } from '@ai-sdk/langchain';
import { Injectable } from '@nestjs/common';
import { PinoLogger, ResourceValidatorService } from '@novu/application-generic';
import { AiChatEntity, AiChatRepository, ClientSession, SnapshotRepository } from '@novu/dal';
import {
  AiResourceTypeEnum,
  AiWorkflowToolsEnum,
  ChannelTypeEnum,
  ResourceOriginEnum,
  SnapshotSourceTypeEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { createUIMessageStream, generateId, UIMessage } from 'ai';
import { createAgent, createMiddleware } from 'langchain';
import { z } from 'zod';
import { GetActiveIntegrations } from '../../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow';
import {
  UpsertStepDataCommand,
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
} from '../../../workflows-v2/usecases/upsert-workflow';
import { GENERATE_WORKFLOW_AGENT_SYSTEM_PROMPT } from '../../prompts';
import { workflowMetadataOutputSchema } from '../../schemas/workflow-generation.schema';
import { CheckpointerService } from '../../services/checkpointer.service';
import { LlmService } from '../../services/llm.service';
import { createWorkflowGenerationTools, DraftWorkflowState } from '../../tools/workflow-generation.tools';
import { createErrorTransform } from '../../transforms/error-transform';
import { createToolOutputTransform } from '../../transforms/tool-output-transform';
import { BaseStreamGenerationAgent, StreamGenerationCommand, StreamGenerationContext } from '../../types';
import { GetChatCommand, GetChatUseCase } from '../get-chat';
import { UpsertChatCommand, UpsertChatUseCase } from '../upsert-chat';

type WorkflowMetadata = z.infer<typeof workflowMetadataOutputSchema>;

@Injectable()
export class StreamWorkflowGenerationUseCase implements BaseStreamGenerationAgent {
  constructor(
    private readonly logger: PinoLogger,
    private readonly llmService: LlmService,
    private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private readonly getWorkflowUseCase: GetWorkflowUseCase,
    private readonly getActiveIntegrationsUsecase: GetActiveIntegrations,
    private readonly checkpointerService: CheckpointerService,
    private readonly getChatUseCase: GetChatUseCase,
    private readonly upsertChatUseCase: UpsertChatUseCase,
    private readonly snapshotRepository: SnapshotRepository,
    private readonly aiChatRepository: AiChatRepository,
    private readonly resourceValidatorService: ResourceValidatorService
  ) {}

  async execute({ command }: StreamGenerationContext): Promise<ReadableStream> {
    if (!command.chatId) {
      throw new Error('Chat ID is required for adding workflow steps');
    }

    const draftState = new DraftWorkflowState();
    const chat = await this.getChatUseCase.execute(
      GetChatCommand.create({
        id: command.chatId,
        user: command.user,
      })
    );
    const chatMessages = chat.messages as UIMessage[];
    const lastUserMessageId = chatMessages.filter((m) => m.role === 'user').pop()?.id ?? '';

    let existingWorkflow: WorkflowResponseDto | null = null;
    const workflowId = chat.resourceId;
    if (workflowId) {
      existingWorkflow = await this.getWorkflowUseCase.execute(
        GetWorkflowCommand.create({
          workflowIdOrInternalId: workflowId,
          user: command.user,
        })
      );
      draftState.setWorkflow(existingWorkflow);

      await this.resourceValidatorService.validateStepsLimit(
        command.user.environmentId,
        command.user.organizationId,
        existingWorkflow.steps
      );

      const checkpointer = this.checkpointerService.getCheckpointer();
      const checkpointTuple = await checkpointer.getTuple({ configurable: { thread_id: command.chatId } });
      const currentCheckpointId = checkpointTuple?.checkpoint.id;

      await this.createSnapshotForWorkflowCreation(
        command,
        existingWorkflow,
        chat,
        lastUserMessageId,
        currentCheckpointId
      );
    } else {
      await this.resourceValidatorService.validateWorkflowLimit(command.user.environmentId);
    }

    this.logger.info(`AI executing workflow generation agent for chat ${command.chatId}`);

    const tools = createWorkflowGenerationTools({
      command,
      llmService: this.llmService,
      draftState,
      getActiveIntegrationsUsecase: this.getActiveIntegrationsUsecase,
    });

    const agent = createAgent({
      model: this.llmService.getModel(),
      tools,
      systemPrompt: GENERATE_WORKFLOW_AGENT_SYSTEM_PROMPT,
      checkpointer: this.checkpointerService.getCheckpointer(),
      middleware: [
        // TODO: create a middleware that will protect from the malicious prompt injection and jailbreak attacks
        // TODO: use middleware to summarize the messages before the agent starts, to avoid the context window limit
        createMiddleware({
          name: 'WorkflowStepsPersistenceMiddleware',
          wrapToolCall: async (request, handler) => {
            const toolName = request.toolCall.name;
            const writer = request.runtime.writer;

            const checkpointer = this.checkpointerService.getCheckpointer();
            const checkpointTuple = await checkpointer.getTuple({ configurable: { thread_id: command.chatId } });
            const currentCheckpointId = checkpointTuple?.checkpoint.id;

            const result = await handler(request);

            switch (toolName) {
              case AiWorkflowToolsEnum.SET_WORKFLOW_METADATA: {
                const workflowMetadata = draftState.getWorkflowMetadata();
                if (!workflowMetadata) {
                  throw new Error('Workflow metadata not found');
                }

                await this.snapshotRepository.withTransaction(async (session) => {
                  if (!existingWorkflow) {
                    // create a minimal workflow with the metadata
                    const minimalWorkflow = await this.createMinimalWorkflow(command, workflowMetadata, session);
                    draftState.setWorkflow(minimalWorkflow);

                    // upsert the chat with the workflow resource
                    await this.upsertChatUseCase.execute(
                      UpsertChatCommand.create({
                        id: command.chatId,
                        resourceType: AiResourceTypeEnum.WORKFLOW,
                        resourceId: minimalWorkflow._id,
                        user: command.user,
                        session,
                      })
                    );
                    await this.createSnapshotForWorkflowCreation(
                      command,
                      minimalWorkflow,
                      chat,
                      lastUserMessageId,
                      currentCheckpointId
                    );

                    // update the workflow with the metadata
                    const updatedWorkflow = await this.updateWorkflow(
                      command,
                      minimalWorkflow,
                      workflowMetadata,
                      session
                    );
                    draftState.setWorkflow(updatedWorkflow);

                    writer?.({ type: 'workflow-created', workflowSlug: updatedWorkflow.slug, chatId: chat._id });

                    this.logger.info(
                      { workflowId: updatedWorkflow._id, workflowSlug: updatedWorkflow.slug, chatId: chat._id },
                      'AI Workflow created via agent'
                    );
                  } else {
                    // update the workflow with the metadata
                    const updatedWorkflow = await this.updateWorkflow(
                      command,
                      existingWorkflow,
                      workflowMetadata,
                      session
                    );
                    draftState.setWorkflow(updatedWorkflow);

                    this.logger.info(
                      { workflowId: updatedWorkflow._id, workflowSlug: updatedWorkflow.slug, chatId: chat._id },
                      'AI Workflow updated via agent'
                    );
                  }
                });
                break;
              }
              case AiWorkflowToolsEnum.ADD_EMAIL_STEP:
              case AiWorkflowToolsEnum.ADD_IN_APP_STEP:
              case AiWorkflowToolsEnum.ADD_SMS_STEP:
              case AiWorkflowToolsEnum.ADD_PUSH_STEP:
              case AiWorkflowToolsEnum.ADD_CHAT_STEP:
              case AiWorkflowToolsEnum.ADD_DIGEST_STEP:
              case AiWorkflowToolsEnum.ADD_DELAY_STEP:
              case AiWorkflowToolsEnum.ADD_THROTTLE_STEP: {
                const workflow = draftState.getWorkflow();
                const latestStep = draftState.getSteps().pop();
                if (!workflow || !latestStep) {
                  throw new Error('Workflow or latest step not found');
                }

                await this.addWorkflowStep({ workflowId: workflow._id, command, step: latestStep, draftState });

                writer?.({ type: 'step-added', step: latestStep });

                this.logger.info({ stepCount: draftState.getSteps().length }, `AI Step added: ${toolName}`);
                break;
              }

              case AiWorkflowToolsEnum.COMPLETE_WORKFLOW: {
                const workflow = draftState.getWorkflow();
                if (!workflow) {
                  throw new Error('Workflow not found');
                }

                await this.updateWorkflowPayloadSchema({ workflowId: workflow._id, command, draftState });

                writer?.({ type: 'workflow-completed', workflowSlug: workflow.slug });

                this.logger.info('AI Workflow step addition completed');
                break;
              }
            }

            return result;
          },
        }),
      ],
    });

    const uiMessageStream = createUIMessageStream({
      originalMessages: chatMessages,
      generateId,
      onFinish: async ({ messages }) => {
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const isAssistantMessage = lastMessage?.role === 'assistant';

        await this.upsertChatUseCase.execute(
          UpsertChatCommand.create({
            id: command.chatId,
            messages,
            activeStreamId: null,
            hasPendingChanges: !!isAssistantMessage && lastMessage.id !== lastUserMessageId,
            user: command.user,
          })
        );
      },
      execute: async ({ writer }) => {
        const configurable: Record<string, string> = { thread_id: command.chatId };
        if (chat.resumeCheckpointId) {
          configurable.checkpoint_id = chat.resumeCheckpointId;
          await this.aiChatRepository.update(
            {
              _id: command.chatId,
              _environmentId: command.user.environmentId,
              _organizationId: command.user.organizationId,
            },
            { $set: { resumeCheckpointId: null } }
          );
        }

        // the cases:
        // 1. when there are no messages - resume action - graph execution from where it left off
        // 2. when there is a checkpoint and no messages - try again action - will fork the graph execution and play from the checkpoint
        // 3. when there is a checkpoint with messages - revert and edit action - will fork the graph execution and play from the checkpoint with the updated messages
        const agentMessages = command.messages;
        const resume = !agentMessages || agentMessages.length === 0 || (!!chat.resumeCheckpointId && !agentMessages);

        const agentStream = await agent.stream(resume ? null : { messages: agentMessages }, {
          configurable,
          signal: command.signal,
          streamMode: ['values', 'messages', 'custom'],
          context: {
            logger: this.logger,
          },
        });

        await writer.merge(
          toUIMessageStream(agentStream).pipeThrough(createToolOutputTransform()).pipeThrough(createErrorTransform())
        );
      },
    });

    return uiMessageStream;
  }

  private async createSnapshotForWorkflowCreation(
    command: StreamGenerationCommand,
    workflow: WorkflowResponseDto,
    chat: AiChatEntity,
    lastUserMessageId: string,
    currentCheckpointId?: string
  ): Promise<void> {
    await this.snapshotRepository.withTransaction(async (session) => {
      // create a snapshot for the workflow creation
      const existingSnapshot = chat.snapshots?.find((s) => s.messageId === lastUserMessageId);
      if (!existingSnapshot) {
        const snapshot = await this.snapshotRepository.createSnapshot(
          {
            _environmentId: command.user.environmentId,
            _organizationId: command.user.organizationId,
            resourceType: AiResourceTypeEnum.WORKFLOW,
            resourceId: workflow._id,
            sourceType: SnapshotSourceTypeEnum.AI_CHAT,
            sourceId: command.chatId,
            data: workflow,
          },
          { session }
        );
        await this.aiChatRepository.pushSnapshotRef(
          command.user.environmentId,
          command.chatId,
          {
            _snapshotId: snapshot._id,
            messageId: lastUserMessageId,
            checkpointId: currentCheckpointId,
          },
          { session }
        );

        this.logger.info(
          { snapshotId: snapshot._id, checkpointId: currentCheckpointId },
          'AI Snapshot created for workflow creation'
        );
      }
    });
  }

  private async createMinimalWorkflow(
    command: StreamGenerationCommand,
    metadata: { name: string },
    session: ClientSession | null
  ): Promise<WorkflowResponseDto> {
    const workflowDto: UpsertWorkflowDataCommand = {
      name: metadata.name,
      __source: WorkflowCreationSourceEnum.AI,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      active: true,
      steps: [],
    };

    const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        user: command.user,
        workflowDto,
        session,
      })
    );

    this.logger.info(
      { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
      `AI Workflow created with metadata: ${workflowDto.name}`
    );

    return persistedWorkflow;
  }

  private async updateWorkflow(
    command: StreamGenerationCommand,
    workflow: WorkflowResponseDto,
    metadata: WorkflowMetadata,
    session: ClientSession | null
  ): Promise<WorkflowResponseDto> {
    const workflowDto: UpsertWorkflowDataCommand = {
      ...workflow,
      name: metadata.name,
      description: metadata.description,
      tags: metadata.tags,
      severity: metadata.severity,
      steps: [],
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

    const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        user: command.user,
        workflowDto,
        workflowIdOrInternalId: workflow._id,
        session,
      })
    );

    this.logger.info(
      { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
      `AI Workflow updated with metadata: ${workflowDto.name}`
    );

    return persistedWorkflow;
  }

  private async addWorkflowStep({
    workflowId,
    command,
    step,
    draftState,
  }: {
    workflowId: string;
    command: StreamGenerationCommand;
    step: UpsertStepDataCommand;
    draftState: DraftWorkflowState;
  }): Promise<WorkflowResponseDto> {
    const latestWorkflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId: workflowId,
        user: command.user,
      })
    );

    const stepAlreadyExists = latestWorkflow.steps.some((s) => s.stepId === step.stepId);
    if (stepAlreadyExists) {
      this.logger.info({ stepId: step.stepId }, `AI Step already exists, skipping (idempotent resume): ${step.name}`);
      draftState.setWorkflow(latestWorkflow);

      return latestWorkflow;
    }

    try {
      const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
        UpsertWorkflowCommand.create({
          workflowDto: {
            ...latestWorkflow,
            steps: [...latestWorkflow.steps, step],
          },
          user: command.user,
          workflowIdOrInternalId: workflowId,
        })
      );
      draftState.setWorkflow(persistedWorkflow);

      this.logger.info(
        { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
        `AI Workflow step added: ${step.name}`
      );

      return persistedWorkflow;
    } catch (error) {
      this.logger.error({ error }, 'Failed to add workflow step');

      throw error;
    }
  }

  private async updateWorkflowPayloadSchema({
    workflowId,
    command,
    draftState,
  }: {
    workflowId: string;
    command: StreamGenerationCommand;
    draftState: DraftWorkflowState;
  }): Promise<WorkflowResponseDto> {
    const latestWorkflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId: workflowId,
        user: command.user,
      })
    );

    const payloadSchema = draftState.getPayloadSchema();
    const validatePayload = !!payloadSchema;

    try {
      const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
        UpsertWorkflowCommand.create({
          workflowDto: {
            ...latestWorkflow,
            validatePayload,
            payloadSchema: payloadSchema ?? undefined,
          },
          user: command.user,
          workflowIdOrInternalId: workflowId,
        })
      );
      draftState.setWorkflow(persistedWorkflow);

      this.logger.info(
        { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
        `AI Workflow payload schema updated`
      );

      return persistedWorkflow;
    } catch (error) {
      this.logger.error({ error }, 'Failed to update workflow payload schema');

      throw error;
    }
  }
}
