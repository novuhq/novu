import { toUIMessageStream } from '@ai-sdk/langchain';
import { Injectable } from '@nestjs/common';
import { PinoLogger, ResourceValidatorService } from '@novu/application-generic';
import {
  AiResourceTypeEnum,
  AiWorkflowToolsEnum,
  ChannelTypeEnum,
  ResourceOriginEnum,
  WorkflowCreationSourceEnum,
} from '@novu/shared';
import { createUIMessageStream, generateId, UIMessage } from 'ai';
import { createAgent, createMiddleware, ToolRuntime, tool } from 'langchain';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WorkflowResponseDto } from '../../../workflows-v2/dtos';
import {
  UpsertWorkflowCommand,
  UpsertWorkflowDataCommand,
  UpsertWorkflowUseCase,
} from '../../../workflows-v2/usecases/upsert-workflow';
import { CREATE_WORKFLOW_METADATA_AGENT_SYSTEM_PROMPT, WORKFLOW_METADATA_PROMPT } from '../../prompts';
import { workflowMetadataInputSchema, workflowMetadataOutputSchema } from '../../schemas/workflow-generation.schema';
import { CheckpointerService } from '../../services/checkpointer.service';
import { LlmService } from '../../services/llm.service';
import { createErrorTransform } from '../../transforms/error-transform';
import { createToolOutputTransform } from '../../transforms/tool-output-transform';
import { BaseStreamGenerationAgent, StreamGenerationCommand, StreamGenerationContext } from '../../types';
import { writeToolReasoningInChunks } from '../../utils/streaming';
import { UpsertChatCommand, UpsertChatUseCase } from '../upsert-chat';

type WorkflowMetadata = z.infer<typeof workflowMetadataOutputSchema>;

class CreateWorkflowState {
  private workflowMetadata: WorkflowMetadata | null = null;
  private workflow: WorkflowResponseDto | null = null;

  setWorkflowMetadata(metadata: WorkflowMetadata): void {
    this.workflowMetadata = metadata;
  }

  getWorkflowMetadata(): WorkflowMetadata | null {
    return this.workflowMetadata;
  }

  setWorkflow(workflow: WorkflowResponseDto): void {
    this.workflow = workflow;
  }

  getWorkflow(): WorkflowResponseDto | null {
    return this.workflow;
  }
}

@Injectable()
export class StreamCreateWorkflowUseCase implements BaseStreamGenerationAgent {
  constructor(
    private readonly logger: PinoLogger,
    private readonly llmService: LlmService,
    private readonly upsertWorkflowUseCase: UpsertWorkflowUseCase,
    private readonly upsertChatUseCase: UpsertChatUseCase,
    private readonly resourceValidatorService: ResourceValidatorService,
    private readonly checkpointerService: CheckpointerService
  ) {}

  async execute({ command }: StreamGenerationContext): Promise<ReadableStream> {
    await this.resourceValidatorService.validateWorkflowLimit(command.user.environmentId);

    const agentMessages = command.messages;
    if (agentMessages && agentMessages.length > 0) {
      const lastUserMessage = agentMessages.filter((m) => m.type === 'human').pop();
      const content: string =
        typeof lastUserMessage?.content === 'string'
          ? lastUserMessage.content
          : ((lastUserMessage?.content.find((p) => p.type === 'text')?.text as string) ?? '');

      this.logger.info(`AI Creating workflow for prompt: ${content.substring(0, 100)}...`);
    }

    const draftState = new CreateWorkflowState();

    const setWorkflowMetadataTool = tool(
      async (input: z.infer<typeof workflowMetadataInputSchema>, config: ToolRuntime) => {
        const writer = config.writer ?? (() => {});
        const toolCallId = config.toolCallId;

        await writeToolReasoningInChunks(
          generateId(),
          toolCallId,
          `**Generating workflow for input:**\n${input.userRequest}`,
          writer
        );

        const result = await this.llmService.generateObject(
          {
            systemPrompt: WORKFLOW_METADATA_PROMPT,
            userPrompt: input.userRequest,
            schema: workflowMetadataOutputSchema,
          },
          { modelId: 'gpt-5-mini', provider: 'openai' }
        );
        draftState.setWorkflowMetadata(result);

        const reasoningText =
          `**Workflow details**\n` +
          `- **Name:** ${result.name}\n\n` +
          `- **Description:** ${result.description || 'no description'}\n\n` +
          `- **Tags:** ${result.tags?.join(', ') || 'none'}\n\n` +
          `- **Severity:** ${result.severity.toString().toLowerCase()}\n\n` +
          `- **Critical:** ${result.critical ? 'yes' : 'no'}`;

        await writeToolReasoningInChunks(generateId(), toolCallId, reasoningText, writer);

        return result;
      },
      {
        name: AiWorkflowToolsEnum.SET_WORKFLOW_METADATA,
        description: `Generate workflow metadata including name, description, tags, criticality, and severity based on the user's request. Call this tool only once with the user's original request.`,
        schema: zodToJsonSchema(workflowMetadataInputSchema),
      }
    );

    const agent = createAgent({
      model: this.llmService.getModel(),
      tools: [setWorkflowMetadataTool],
      systemPrompt: CREATE_WORKFLOW_METADATA_AGENT_SYSTEM_PROMPT,
      checkpointer: this.checkpointerService.getCheckpointer(),
      middleware: [
        createMiddleware({
          name: 'WorkflowCreationMiddleware',
          wrapToolCall: async (request, handler) => {
            const toolName = request.toolCall.name;
            const writer = request.runtime.writer;

            const result = await handler(request);

            if (toolName === AiWorkflowToolsEnum.SET_WORKFLOW_METADATA) {
              const workflowMetadata = draftState.getWorkflowMetadata();
              if (!workflowMetadata) {
                throw new Error('Workflow metadata not found');
              }

              const workflow = await this.createWorkflow(command, workflowMetadata);
              draftState.setWorkflow(workflow);

              const chat = await this.upsertChatUseCase.execute(
                UpsertChatCommand.create({
                  id: command.chatId,
                  resourceType: AiResourceTypeEnum.WORKFLOW,
                  resourceId: workflow._id,
                  user: command.user,
                })
              );

              writer?.({ type: 'workflow-created', workflowSlug: workflow.slug, chatId: chat._id });

              this.logger.info(
                { workflowId: workflow._id, workflowSlug: workflow.slug, chatId: chat._id },
                'AI Workflow created via agent'
              );
            }

            return result;
          },
        }),
      ],
    });

    const originalMessages: UIMessage[] = command.messages
      ? command.messages.map((msg) => ({
          id: generateId(),
          role: msg.getType() === 'human' ? ('user' as const) : ('assistant' as const),
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
          parts: [
            {
              type: 'text' as const,
              text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            },
          ],
          createdAt: new Date(),
        }))
      : [];

    const uiMessageStream = createUIMessageStream({
      originalMessages,
      generateId,
      onFinish: async ({ messages: streamedMessages }) => {
        const workflow = draftState.getWorkflow();
        if (workflow) {
          await this.upsertChatUseCase.execute(
            UpsertChatCommand.create({
              id: command.chatId,
              resourceType: AiResourceTypeEnum.WORKFLOW,
              resourceId: workflow._id,
              messages: streamedMessages,
              user: command.user,
            })
          );
        }
      },
      execute: async ({ writer }) => {
        const agentStream = await agent.stream(agentMessages ? { messages: agentMessages } : null, {
          configurable: {
            thread_id: generateId(),
          },
          signal: command.signal,
          streamMode: ['values', 'messages', 'custom'],
          context: {
            logger: this.logger,
          },
          recursionLimit: 10,
        });

        await writer.merge(
          toUIMessageStream(agentStream).pipeThrough(createToolOutputTransform()).pipeThrough(createErrorTransform())
        );
      },
    });

    return uiMessageStream;
  }

  private async createWorkflow(
    command: StreamGenerationCommand,
    metadata: WorkflowMetadata
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
      })
    );

    this.logger.info(
      { _id: persistedWorkflow._id, slug: persistedWorkflow.slug },
      `AI Workflow created with metadata: ${workflowDto.name}`
    );

    return persistedWorkflow;
  }
}
