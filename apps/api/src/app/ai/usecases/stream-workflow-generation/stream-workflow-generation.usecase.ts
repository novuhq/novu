import { toUIMessageStream } from '@ai-sdk/langchain';
import { Injectable } from '@nestjs/common';
import { PinoLogger, ResourceValidatorService } from '@novu/application-generic';
import { AiChatRepository, AiChatSnapshotRef, SnapshotRepository } from '@novu/dal';
import { AiResourceTypeEnum, SnapshotSourceTypeEnum } from '@novu/shared';
import { createUIMessageStream, generateId, UIMessage } from 'ai';
import { BaseMessage, createAgent, createMiddleware } from 'langchain';
import { GetEnvironmentTags } from '../../../environments-v2/usecases/get-environment-tags';
import { GetActiveIntegrations } from '../../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow';
import { UpsertWorkflowUseCase } from '../../../workflows-v2/usecases/upsert-workflow';
import { buildWorkflowAgentSystemPrompt } from '../../prompts';
import { CheckpointerService } from '../../services/checkpointer.service';
import { LlmService } from '../../services/llm.service';
import { createWorkflowGenerationTools, DraftWorkflowState } from '../../tools/workflow-generation.tools';
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
    private readonly resourceValidatorService: ResourceValidatorService,
    private readonly getEnvironmentTagsUsecase: GetEnvironmentTags
  ) {}

  async execute({ command }: StreamGenerationContext): Promise<ReadableStream> {
    if (!command.chatId) {
      throw new Error('Chat ID is required for adding workflow steps');
    }

    const chat = await this.getChatUseCase.execute(
      GetChatCommand.create({
        id: command.chatId,
        user: command.user,
      })
    );
    const draftState = new DraftWorkflowState(chat);

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
      aiChatRepository: this.aiChatRepository,
      getActiveIntegrationsUsecase: this.getActiveIntegrationsUsecase,
      getWorkflowUseCase: this.getWorkflowUseCase,
      upsertWorkflowUseCase: this.upsertWorkflowUseCase,
      upsertChatUseCase: this.upsertChatUseCase,
      getEnvironmentTagsUsecase: this.getEnvironmentTagsUsecase,
      logger: this.logger,
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

              this.logger.info(
                { workflowId: existingWorkflow._id, workflowSlug: existingWorkflow.slug, chatId: chat._id },
                'AI Workflow snapshot created for existing workflow'
              );
            }

            const result = await handler(request);

            // create the first workflow snapshot after we have a minimal workflow
            const minimalWorkflow = draftState.getMinimalWorkflow();
            if (!existingWorkflow && !lastUserMessageSnapshot && minimalWorkflow) {
              await this.createSnapshotForWorkflowCreation({
                command,
                workflow: minimalWorkflow,
                lastUserMessageId,
                currentCheckpointId,
                chatSnapshotRef: (ref) => localSnapshots.push(ref),
              });

              this.logger.info(
                { workflowId: minimalWorkflow._id, workflowSlug: minimalWorkflow.slug, chatId: chat._id },
                'AI Workflow snapshot created for minimal workflow'
              );
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
}
