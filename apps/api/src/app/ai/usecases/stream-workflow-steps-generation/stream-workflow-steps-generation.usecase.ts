import { toUIMessageStream } from '@ai-sdk/langchain';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { createUIMessageStream, generateId, UIMessage } from 'ai';
import { createAgent, createMiddleware } from 'langchain';
import { GetActiveIntegrations } from '../../../integrations/usecases/get-active-integration/get-active-integration.usecase';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow';
import {
  UpsertStepDataCommand,
  UpsertWorkflowCommand,
  UpsertWorkflowUseCase,
} from '../../../workflows-v2/usecases/upsert-workflow';
import { ADD_WORKFLOW_STEPS_AGENT_SYSTEM_PROMPT } from '../../prompts';
import { CheckpointerService } from '../../services/checkpointer.service';
import { LlmService } from '../../services/llm.service';
import { createWorkflowGenerationTools, DraftWorkflowState } from '../../tools/workflow-generation.tools';
import { createErrorTransform } from '../../transforms/error-transform';
import { createToolOutputTransform } from '../../transforms/tool-output-transform';
import { BaseStreamGenerationAgent, StreamGenerationCommand, StreamGenerationContext } from '../../types';
import { GetChatCommand, GetChatUseCase } from '../get-chat';
import { UpsertChatCommand, UpsertChatUseCase } from '../upsert-chat';

@Injectable()
export class StreamWorkflowStepsGenerationUseCase implements BaseStreamGenerationAgent {
  constructor(
    private readonly logger: PinoLogger,
    private readonly llmService: LlmService,
    private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private readonly getWorkflowUseCase: GetWorkflowUseCase,
    private readonly getActiveIntegrationsUsecase: GetActiveIntegrations,
    private readonly checkpointerService: CheckpointerService,
    private readonly getChatUseCase: GetChatUseCase,
    private readonly upsertChatUseCase: UpsertChatUseCase
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

    const workflowId = chat.resourceId;
    if (!workflowId) {
      throw new Error('Chat does not have an associated workflow');
    }

    const existingWorkflow = await this.getWorkflowUseCase.execute(
      GetWorkflowCommand.create({
        workflowIdOrInternalId: workflowId,
        user: command.user,
      })
    );

    const allMessages = chat.messages as UIMessage[];

    const agentMessages = command.messages;
    if (agentMessages && agentMessages.length > 0) {
      const lastUserMessage = agentMessages.filter((m) => m.type === 'human').pop();
      const content: string =
        typeof lastUserMessage?.content === 'string'
          ? lastUserMessage.content
          : ((lastUserMessage?.content.find((p) => p.type === 'text')?.text as string) ?? '');

      this.logger.info(
        `AI Adding steps to workflow ${existingWorkflow.slug} for prompt: ${content.substring(0, 100)}...`
      );
    } else {
      this.logger.info(`AI Adding steps to workflow ${existingWorkflow.slug} resumed`);
    }

    const draftState = new DraftWorkflowState();
    draftState.setWorkflow(existingWorkflow);

    const tools = createWorkflowGenerationTools({
      command,
      llmService: this.llmService,
      draftState,
      getActiveIntegrationsUsecase: this.getActiveIntegrationsUsecase,
    });

    const agent = createAgent({
      model: this.llmService.getModel(),
      tools,
      systemPrompt: ADD_WORKFLOW_STEPS_AGENT_SYSTEM_PROMPT,
      checkpointer: this.checkpointerService.getCheckpointer(),
      middleware: [
        createMiddleware({
          name: 'WorkflowStepsPersistenceMiddleware',
          wrapToolCall: async (request, handler) => {
            const toolName = request.toolCall.name;
            const writer = request.runtime.writer;

            const result = await handler(request);

            switch (toolName) {
              case 'addEmailStep':
              case 'addInAppStep':
              case 'addSmsStep':
              case 'addPushStep':
              case 'addChatStep':
              case 'addDigestStep':
              case 'addDelayStep':
              case 'addThrottleStep': {
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

              case 'completeWorkflow': {
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
      originalMessages: allMessages,
      generateId,
      onFinish: async ({ messages }) => {
        await this.upsertChatUseCase.execute(
          UpsertChatCommand.create({
            id: command.chatId,
            messages,
            activeStreamId: null,
            user: command.user,
          })
        );
      },
      execute: async ({ writer }) => {
        const agentStream = await agent.stream(agentMessages ? { messages: agentMessages } : null, {
          configurable: {
            thread_id: command.chatId,
          },
          signal: command.signal,
          streamMode: ['values', 'messages', 'custom'],
          context: {
            logger: this.logger,
          },
          recursionLimit: 200,
        });

        await writer.merge(
          toUIMessageStream(agentStream).pipeThrough(createToolOutputTransform()).pipeThrough(createErrorTransform())
        );
      },
    });

    return uiMessageStream;
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
