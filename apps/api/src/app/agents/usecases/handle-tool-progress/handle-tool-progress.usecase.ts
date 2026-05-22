import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivityRepository,
  type ConversationChannel,
  type ConversationEntity,
} from '@novu/dal';
import type { PlanModel, PlanTaskStatus } from 'chat';
import { AgentConversationService } from '../../services/agent-conversation.service';
import { ChatSdkService } from '../../services/chat-sdk.service';
import { HandleToolProgressCommand, type ToolProgressPayload } from './handle-tool-progress.command';

interface ToolTask {
  toolUseId: string;
  toolName: string;
  status: PlanTaskStatus;
  details?: string;
}

@Injectable()
export class HandleToolProgress {
  constructor(
    private readonly activityRepository: ConversationActivityRepository,
    private readonly conversationService: AgentConversationService,
    private readonly chatSdkService: ChatSdkService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: HandleToolProgressCommand): Promise<void> {
    const conversation = await this.conversationService.getConversation(
      command.conversationId,
      command.environmentId,
      command.organizationId
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const { toolProgress } = command;

    const existingActivities = await this.activityRepository.findToolActivitiesByRunId(
      command.environmentId,
      command.conversationId,
      toolProgress.runId
    );

    if (toolProgress.action === 'tool-use') {
      await this.handleToolUse(command, conversation, channel, toolProgress, existingActivities);

      return;
    }

    await this.handleFinalize(command, conversation, channel, toolProgress, existingActivities);
  }

  private async handleToolUse(
    command: HandleToolProgressCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    toolProgress: ToolProgressPayload,
    existingActivities: ConversationActivityEntity[]
  ): Promise<void> {
    if (!toolProgress.toolUseId || !toolProgress.status) {
      return;
    }

    const tasks = this.collectTasks(existingActivities);
    const existing = tasks.get(toolProgress.toolUseId);
    const toolName = toolProgress.toolName || existing?.toolName || 'Tool';
    const status: PlanTaskStatus = toolProgress.status === 'running' ? 'in_progress' : toolProgress.status;
    const details = formatToolInputSummary(toolProgress.toolInput) || existing?.details;

    tasks.set(toolProgress.toolUseId, { toolUseId: toolProgress.toolUseId, toolName, status, details });

    const model = this.toModel('Thinking…', tasks, false);
    const planMessageId = await this.postOrEditPlan(
      conversation,
      channel,
      command,
      this.findPlanMessageId(existingActivities),
      model
    );

    await this.persistToolActivity(command, channel, toolProgress, toolName, details, planMessageId);
  }

  private async handleFinalize(
    command: HandleToolProgressCommand,
    conversation: ConversationEntity,
    channel: ConversationChannel,
    toolProgress: ToolProgressPayload,
    existingActivities: ConversationActivityEntity[]
  ): Promise<void> {
    const planMessageId = this.findPlanMessageId(existingActivities);
    if (!existingActivities.length || !planMessageId) {
      return;
    }

    const finalStatus: PlanTaskStatus = toolProgress.action === 'fail' ? 'error' : 'complete';
    const title = toolProgress.action === 'fail' ? 'Something went wrong' : 'Finished thinking';

    const tasks = this.collectTasks(existingActivities);
    for (const task of tasks.values()) {
      task.status = finalStatus;
    }

    await this.postOrEditPlan(conversation, channel, command, planMessageId, this.toModel(title, tasks, true));
  }

  private async postOrEditPlan(
    conversation: ConversationEntity,
    channel: ConversationChannel,
    command: HandleToolProgressCommand,
    existingMessageId: string | undefined,
    model: PlanModel
  ): Promise<string | undefined> {
    try {
      if (existingMessageId) {
        await this.chatSdkService.editPlanObject(
          conversation._agentId,
          command.integrationIdentifier,
          channel.platform,
          channel.platformThreadId,
          existingMessageId,
          model
        );

        return existingMessageId;
      }

      const sent = await this.chatSdkService.postPlanObject(
        conversation._agentId,
        command.integrationIdentifier,
        channel.platform,
        channel.platformThreadId,
        model
      );

      return sent?.messageId;
    } catch (err) {
      this.logger.warn(err, 'Failed to post/edit plan card');

      return undefined;
    }
  }

  private async persistToolActivity(
    command: HandleToolProgressCommand,
    channel: ConversationChannel,
    toolProgress: ToolProgressPayload,
    toolName: string,
    details: string | undefined,
    planMessageId: string | undefined
  ): Promise<void> {
    await this.activityRepository.createSignalActivity({
      identifier: `act_${shortId(12)}`,
      conversationId: command.conversationId,
      platform: channel.platform,
      integrationId: channel._integrationId,
      platformThreadId: channel.platformThreadId,
      agentId: command.agentIdentifier,
      content: `Tool: ${toolName} (${toolProgress.status})`,
      signalData: {
        type: 'tool-use',
        payload: {
          runId: toolProgress.runId,
          planMessageId,
          toolUseId: toolProgress.toolUseId,
          toolName,
          status: toolProgress.status,
          ...(details ? { details } : {}),
        },
      },
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
  }

  private findPlanMessageId(activities: ConversationActivityEntity[]): string | undefined {
    for (const activity of activities) {
      const id = activity.signalData?.payload?.planMessageId;
      if (typeof id === 'string' && id) return id;
    }

    return undefined;
  }

  private collectTasks(activities: ConversationActivityEntity[]): Map<string, ToolTask> {
    const tasks = new Map<string, ToolTask>();

    for (const activity of activities) {
      const payload = activity.signalData?.payload;
      if (!payload?.toolUseId || !payload?.toolName || !payload?.status) continue;

      const toolUseId = String(payload.toolUseId);
      const rawStatus = String(payload.status);
      const status: PlanTaskStatus = rawStatus === 'running' ? 'in_progress' : (rawStatus as PlanTaskStatus);
      const details = typeof payload.details === 'string' ? payload.details : undefined;
      const existing = tasks.get(toolUseId);

      const isFinalStatus = status === 'complete' || status === 'error';
      const shouldReplace = !existing || isFinalStatus;

      if (shouldReplace) {
        tasks.set(toolUseId, {
          toolUseId,
          toolName: String(payload.toolName),
          status,
          details: details || existing?.details,
        });
      } else if (details && !existing.details) {
        existing.details = details;
      }
    }

    return tasks;
  }

  private toModel(title: string, tasks: Map<string, ToolTask>, isFinalized: boolean): PlanModel {
    const planTasks = [...tasks.values()].map((t) => ({
      id: t.toolUseId,
      title: t.toolName,
      status: t.status,
      ...(t.details ? { details: { markdown: t.details } } : {}),
    }));

    const hasInProgress = planTasks.some((t) => t.status === 'in_progress');
    if (!isFinalized && !hasInProgress) {
      planTasks.push({ id: '__thinking__', title: 'Thinking…', status: 'in_progress' as PlanTaskStatus });
    }

    return { title, tasks: planTasks };
  }
}

const SUMMARY_KEY_PRIORITY = ['query', 'command', 'path', 'action'];
const MAX_DETAIL_LENGTH = 200;

function formatToolInputSummary(input: Record<string, unknown> | undefined): string | undefined {
  if (!input || typeof input !== 'object') return undefined;

  const keys = Object.keys(input);
  if (keys.length === 0) return undefined;

  if (keys.length === 1) {
    return truncate(String(input[keys[0]]), MAX_DETAIL_LENGTH);
  }

  const primaryKey = keys.find((k) => SUMMARY_KEY_PRIORITY.includes(k));
  if (primaryKey) {
    return truncate(String(input[primaryKey]), MAX_DETAIL_LENGTH);
  }

  const pairs = keys.slice(0, 3).map((k) => {
    const val = typeof input[k] === 'string' ? input[k] : JSON.stringify(input[k]);

    return `${k}: ${val}`;
  });

  return truncate(pairs.join(', '), MAX_DETAIL_LENGTH);
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;

  return `${str.slice(0, max - 1)}…`;
}
