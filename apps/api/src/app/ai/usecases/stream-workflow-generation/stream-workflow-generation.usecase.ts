import { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { Injectable } from '@nestjs/common';
import { PinoLogger, ResourceValidatorService } from '@novu/application-generic';
import { ResourceOriginEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { convertToModelMessages, generateId, smoothStream } from 'ai';
import { z } from 'zod';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos';
import { GetWorkflowCommand, GetWorkflowUseCase } from '../../../workflows-v2/usecases/get-workflow';
import {
  UpsertStepDataCommand,
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
} from '../../../workflows-v2/usecases/upsert-workflow';
import { CREATE_WORKFLOW_AGENT_SYSTEM_PROMPT } from '../../prompts';
import { workflowMetadataOutputSchema } from '../../schemas/workflow-generation.schema';
import { LlmService } from '../../services/llm.service';
import { writeToolReasoningInChunks } from '../../tools/utils';
import { createWorkflowGenerationTools, DraftWorkflowState } from '../../tools/workflow-generation.tools';
import { BaseStreamGenerationAgent, StreamGenerationContext } from '../../types';
import { StreamGenerationCommand } from '../stream-generation';
import { UpsertChatCommand, UpsertChatUseCase } from '../upsert-chat';

type WorkflowMetadata = z.infer<typeof workflowMetadataOutputSchema>;

@Injectable()
export class StreamWorkflowGenerationUseCase implements BaseStreamGenerationAgent {
  constructor(
    private readonly logger: PinoLogger,
    private readonly llmService: LlmService,
    private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private readonly upsertChatUseCase: UpsertChatUseCase,
    private readonly getWorkflowUseCase: GetWorkflowUseCase,
    private readonly resourceValidatorService: ResourceValidatorService
  ) {}

  async execute({ writer, command }: StreamGenerationContext): Promise<void> {
    if (!this.llmService.isAvailable()) {
      throw new Error('LLM service not configured');
    }
    await this.resourceValidatorService.validateWorkflowLimit(command.user.environmentId);

    const agentMessages = await convertToModelMessages(command.messages);
    const lastUserMessage = agentMessages.filter((m) => m.role === 'user').pop();
    const content =
      typeof lastUserMessage?.content === 'string'
        ? lastUserMessage?.content
        : (lastUserMessage?.content.find((p) => p.type === 'text')?.text ?? '');

    this.logger.info(`AI Streaming workflow generation for prompt: ${content.substring(0, 100)}...`);

    const draftState = new DraftWorkflowState();
    const tools = createWorkflowGenerationTools({ writer, llmService: this.llmService, draftState });

    const result = this.llmService.streamAgent({
      systemPrompt: CREATE_WORKFLOW_AGENT_SYSTEM_PROMPT,
      messages: agentMessages,
      tools,
      stopAfterSteps: 15,
      providerOptions: {
        openai: {
          reasoningEffort: 'medium',
        } satisfies OpenAIResponsesProviderOptions,
      },
      experimental_transform: smoothStream({
        delayInMs: 5, // optional: defaults to 10ms
        chunking: 'line', // optional: defaults to 'word'
      }),
      onStepFinish: async ({ toolResults }) => {
        for (const toolResult of toolResults) {
          const toolName = toolResult.toolName;
          const toolCallId = toolResult.toolCallId;
          const output = 'output' in toolResult ? toolResult.output : undefined;
          this.logger.info(`AI Tool result: ${toolName}`);

          switch (toolName) {
            case 'setWorkflowMetadata': {
              const metadata = output as { success: boolean } & WorkflowMetadata;
              if (metadata?.success) {
                const workflow = await this.createWorkflow(command, metadata, draftState);
                // Update the chat with the active stream ID
                await this.upsertChatUseCase.execute(
                  UpsertChatCommand.create({ id: command.chatId, resourceId: workflow._id, user: command.user })
                );

                writer.write({ type: 'data-workflow-created', data: workflow.slug });
              }
              break;
            }

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

              await writeToolReasoningInChunks({
                id: generateId(),
                toolCallId,
                text: `\n\n✅ **Done!**`,
                writer,
              });

              writer.write({ type: 'data-step-added', data: latestStep });

              this.logger.info({ stepCount: draftState.getSteps().length }, `AI Step added: ${toolName}`);
              break;
            }

            case 'completeWorkflow': {
              const workflow = draftState.getWorkflow();
              if (!workflow) {
                throw new Error('Workflow or latest step not found');
              }

              await this.updateWorkflowPayloadSchema({ workflowId: workflow._id, command, draftState });

              writer.write({ type: 'data-workflow-completed', data: workflow.slug });

              this.logger.info('AI Workflow generation completed');
              break;
            }
          }
        }
      },
      onError: ({ error }) => {
        this.logger.error({ error }, 'AI Agent error');
      },
    });

    writer.merge(result.toUIMessageStream({ sendReasoning: true }));
  }

  private async createWorkflow(
    command: StreamGenerationCommand,
    metadata: WorkflowMetadata,
    draftState: DraftWorkflowState
  ): Promise<WorkflowResponseDto> {
    const workflowDto: UpsertWorkflowDataCommand = {
      name: metadata.name,
      description: metadata.description,
      tags: metadata.tags,
      __source: WorkflowCreationSourceEnum.AI,
      origin: ResourceOriginEnum.NOVU_CLOUD,
      active: true,
      severity: metadata.severity,
      steps: [],
    };

    try {
      const persistedWorkflow = await this.upsertWorkflowUseCase.execute(
        UpsertWorkflowCommand.create({
          user: command.user,
          workflowDto,
        })
      );
      draftState.setWorkflow(persistedWorkflow);

      this.logger.info(
        { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
        `AI Workflow created with metadata: ${workflowDto.name}`
      );

      return persistedWorkflow;
    } catch (error) {
      this.logger.error({ error }, 'Failed to create workflow with metadata');

      throw error;
    }
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
