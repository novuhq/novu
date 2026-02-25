import { toUIMessageStream } from '@ai-sdk/langchain';
import { Injectable } from '@nestjs/common';
import { PinoLogger, ResourceValidatorService } from '@novu/application-generic';
import { AiChatRepository, AiChatSnapshotRef, ClientSession, SnapshotRepository } from '@novu/dal';
import {
  AiResourceTypeEnum,
  AiWorkflowToolsEnum,
  ChannelTypeEnum,
  ResourceOriginEnum,
  SnapshotSourceTypeEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { createUIMessageStream, generateId, UIMessage } from 'ai';
import { BaseMessage, createAgent, createMiddleware } from 'langchain';
import { safeParse } from '../../../../utils/json';
import { GetActiveIntegrations } from '../../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow';
import {
  UpsertStepDataCommand,
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
} from '../../../workflows-v2/usecases/upsert-workflow';
import { buildWorkflowAgentSystemPrompt } from '../../prompts';
import { CheckpointerService } from '../../services/checkpointer.service';
import { LlmService } from '../../services/llm.service';
import {
  createWorkflowGenerationTools,
  DraftWorkflowState,
  WorkflowMetadata,
} from '../../tools/workflow-generation.tools';
import { createErrorTransform } from '../../transforms/error-transform';
import { createToolOutputTransform } from '../../transforms/tool-output-transform';
import { BaseStreamGenerationAgent, StreamGenerationCommand, StreamGenerationContext } from '../../types';
import { GetChatCommand, GetChatUseCase } from '../get-chat';
import { UpsertChatCommand, UpsertChatUseCase } from '../upsert-chat';

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
    // chat snapshots perf improvement: avoid the database query for the snapshots
    const localSnapshots = [...(chat.snapshots ?? [])];
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

    const checkpointer = this.checkpointerService.getCheckpointer();

    const agent = createAgent({
      model: this.llmService.getModel(),
      tools,
      systemPrompt: buildWorkflowAgentSystemPrompt(existingWorkflow),
      checkpointer,
      middleware: [
        // TODO: create a middleware that will protect from the malicious prompt injection and jailbreak attacks
        // TODO: use middleware to summarize the messages before the agent starts, to avoid the context window limit
        createMiddleware({
          name: 'WorkflowStepsPersistenceMiddleware',
          wrapToolCall: async (request, handler) => {
            const toolName = request.toolCall.name;
            const writer = request.runtime.writer;
            // important: get the current checkpoint id before the tool call
            const checkpointTuple = await checkpointer.getTuple({ configurable: { thread_id: command.chatId } });
            const currentCheckpointId = checkpointTuple?.checkpoint.id;

            // create a snapshot for the last (new) user message if it doesn't exist
            const lastUserMessageSnapshot = localSnapshots.find((s) => s.messageId === lastUserMessageId);
            if (existingWorkflow && !lastUserMessageSnapshot) {
              await this.createSnapshotForWorkflowCreation({
                command,
                workflow: existingWorkflow,
                lastUserMessageId,
                currentCheckpointId,
                chatSnapshotRef: (ref) => localSnapshots.push(ref),
              });
            }

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

                    const snapshot = localSnapshots.find((s) => s.messageId === lastUserMessageId);
                    if (!snapshot) {
                      await this.createSnapshotForWorkflowCreation({
                        command,
                        workflow: minimalWorkflow,
                        lastUserMessageId,
                        currentCheckpointId,
                        chatSnapshotRef: (ref) => localSnapshots.push(ref),
                      });
                    }

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
              case AiWorkflowToolsEnum.ADD_STEP: {
                const workflow = draftState.getWorkflow();
                const steps = draftState.getSteps();
                const latestStep = steps.length > 0 ? steps[steps.length - 1] : undefined;
                if (!workflow || !latestStep) {
                  throw new Error('Workflow or latest step not found');
                }

                await this.addWorkflowStep({ workflowId: workflow._id, command, step: latestStep, draftState });

                writer?.({ type: 'step-added', step: latestStep });

                this.logger.info({ stepCount: draftState.getSteps().length }, `AI Step added: ${toolName}`);
                break;
              }

              case AiWorkflowToolsEnum.EDIT_STEP_CONTENT: {
                const workflow = draftState.getWorkflow();
                const updatedStep =
                  'content' in result && typeof result.content === 'string'
                    ? (safeParse(result.content) as UpsertStepDataCommand)
                    : undefined;

                if (!workflow || !updatedStep?.stepId) {
                  throw new Error('Workflow or updated step not found');
                }

                await this.updateWorkflowStep({
                  workflowId: workflow._id,
                  command,
                  step: updatedStep,
                  draftState,
                });

                writer?.({ type: 'step-updated', step: updatedStep });

                this.logger.info({ stepId: updatedStep.stepId }, 'AI Step updated via agent');
                break;
              }

              case AiWorkflowToolsEnum.REMOVE_STEP: {
                const workflow = draftState.getWorkflow();
                const removeResult =
                  'content' in result && typeof result.content === 'string'
                    ? (safeParse(result.content) as { removedStepId: string })
                    : undefined;
                if (!workflow || !removeResult?.removedStepId) {
                  throw new Error('Workflow or step ID not found');
                }

                await this.removeWorkflowStep({
                  workflowId: workflow._id,
                  command,
                  stepId: removeResult.removedStepId,
                  draftState,
                });

                writer?.({ type: 'step-removed', stepId: removeResult.removedStepId });

                this.logger.info({ stepId: removeResult.removedStepId }, 'AI Step removed via agent');
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
      onFinish: async ({ messages, isAborted }) => {
        const finalIsAborted = isAborted || command.signal.aborted;
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const isAssistantMessage = lastMessage?.role === 'assistant';
        const hasPendingChanges = !!isAssistantMessage && lastMessage.id !== lastUserMessageId;

        await this.upsertChatUseCase.execute(
          UpsertChatCommand.create({
            id: command.chatId,
            messages,
            activeStreamId: finalIsAborted ? undefined : null,
            hasPendingChanges,
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
        // 1. when there are no last human message - resume action - graph execution from where it left off
        // 2. when there is a checkpoint and no last human message - try again action - will fork the graph execution and play from the checkpoint
        // 3. when there is a checkpoint with last human message - revert and edit action - will fork the graph execution and play from the checkpoint with the updated messages
        const allChatMessages = command.messages;
        const isNewMessage = command.isNewMessage;
        const lastHumanMessage = isNewMessage ? allChatMessages?.filter((m) => m.type === 'human').pop() : undefined;
        const messages: Array<BaseMessage> = lastHumanMessage ? [lastHumanMessage] : [];
        const resume = !lastHumanMessage || (!!chat.resumeCheckpointId && !lastHumanMessage);

        const agentStream = await agent.stream((resume ? null : { messages }) as Parameters<typeof agent.stream>[0], {
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

  private async createSnapshotForWorkflowCreation({
    command,
    workflow,
    lastUserMessageId,
    currentCheckpointId,
    chatSnapshotRef,
  }: {
    command: StreamGenerationCommand;
    workflow: WorkflowResponseDto;
    lastUserMessageId: string;
    currentCheckpointId?: string;
    chatSnapshotRef: (ref: AiChatSnapshotRef) => void;
  }): Promise<void> {
    await this.snapshotRepository.withTransaction(async (session) => {
      // create a snapshot for the workflow creation
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
      const snapshotRef: AiChatSnapshotRef = {
        _snapshotId: snapshot._id,
        messageId: lastUserMessageId,
        checkpointId: currentCheckpointId,
      };
      await this.aiChatRepository.pushSnapshotRef(command.user.environmentId, command.chatId, snapshotRef, { session });

      chatSnapshotRef(snapshotRef);

      this.logger.info(
        { snapshotId: snapshot._id, checkpointId: currentCheckpointId },
        'AI Snapshot created for workflow creation'
      );
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
      const payloadSchema = draftState.getPayloadSchema();
      const validatePayload = !!payloadSchema;

      const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
        UpsertWorkflowCommand.create({
          workflowDto: {
            ...latestWorkflow,
            steps: [...latestWorkflow.steps, step],
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
        `AI Workflow step added: ${step.name}`
      );

      return persistedWorkflow;
    } catch (error) {
      this.logger.error({ error }, 'Failed to add workflow step');

      throw error;
    }
  }

  private async updateWorkflowStep({
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
      const payloadSchema = draftState.getPayloadSchema();
      const validatePayload = !!payloadSchema;

      const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
        UpsertWorkflowCommand.create({
          workflowDto: {
            ...latestWorkflow,
            steps,
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
        `AI Workflow step updated: ${step.name}`
      );

      return persistedWorkflow;
    } catch (error) {
      this.logger.error({ error }, 'Failed to update workflow step');

      throw error;
    }
  }

  private async removeWorkflowStep({
    workflowId,
    command,
    stepId,
    draftState,
  }: {
    workflowId: string;
    command: StreamGenerationCommand;
    stepId: string;
    draftState: DraftWorkflowState;
  }): Promise<WorkflowResponseDto> {
    const latestWorkflow = await this.getWorkflowUseCase.execute(
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

    const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
      UpsertWorkflowCommand.create({
        workflowDto: {
          ...latestWorkflow,
          steps,
        },
        user: command.user,
        workflowIdOrInternalId: workflowId,
      })
    );
    draftState.setWorkflow(persistedWorkflow);

    this.logger.info(
      { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
      `AI Workflow step removed: ${stepId}`
    );

    return persistedWorkflow;
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
