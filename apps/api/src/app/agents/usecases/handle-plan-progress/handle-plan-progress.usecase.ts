import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import { ConversationActivityEntity, ConversationActivityRepository, type ConversationChannel } from '@novu/dal';
import type { PlanModel, PlanTaskStatus } from 'chat';
import { AgentConversationService } from '../../services/agent-conversation.service';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand, type ToolProgressPayload } from './handle-plan-progress.command';

interface ToolTask {
  toolUseId: string;
  toolName: string;
  mcpServerName?: string;
  status: PlanTaskStatus;
  details?: string;
}

@Injectable()
export class HandlePlanProgress {
  constructor(
    private readonly activityRepository: ConversationActivityRepository,
    private readonly conversationService: AgentConversationService,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: HandlePlanProgressCommand): Promise<void> {
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

    const existingActivities = await this.activityRepository.findToolActivitiesByTurnId(
      command.environmentId,
      command.conversationId,
      toolProgress.turnId
    );

    if (toolProgress.action === 'tool-use') {
      await this.handleToolUse(command, channel, toolProgress, existingActivities);

      return;
    }

    if (toolProgress.action === 'awaiting-approval') {
      await this.handleAwaitingApproval(command, existingActivities);

      return;
    }

    if (toolProgress.action === 'approved' || toolProgress.action === 'denied') {
      await this.handleVerdictUpdate(command, toolProgress.action, existingActivities);

      return;
    }

    await this.handleFinalize(command, toolProgress, existingActivities);
  }

  private async handleToolUse(
    command: HandlePlanProgressCommand,
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
    const mcpServerName = toolProgress.mcpServerName || existing?.mcpServerName;
    const status: PlanTaskStatus = toolProgress.status === 'running' ? 'in_progress' : toolProgress.status;
    const details = toolProgress.details || formatToolInputSummary(toolProgress.toolInput) || existing?.details;

    tasks.set(toolProgress.toolUseId, { toolUseId: toolProgress.toolUseId, toolName, mcpServerName, status, details });

    const model = this.toModel('Thinking…', tasks, false);
    const planMessageId = await this.postOrEditPlan(command, this.findPlanMessageId(existingActivities), model);

    await this.persistToolActivity(command, channel, toolProgress, toolName, details, planMessageId);
  }

  private async handleAwaitingApproval(
    command: HandlePlanProgressCommand,
    existingActivities: ConversationActivityEntity[]
  ): Promise<void> {
    const planMessageId = this.findPlanMessageId(existingActivities);
    if (!existingActivities.length || !planMessageId) {
      return;
    }

    const tasks = this.collectTasks(existingActivities);
    for (const task of tasks.values()) {
      if (task.status === 'in_progress') {
        task.status = 'in_progress';
      }
    }

    await this.postOrEditPlan(command, planMessageId, this.toModel('Waiting for approval…', tasks, false));
  }

  private async handleVerdictUpdate(
    command: HandlePlanProgressCommand,
    verdict: 'approved' | 'denied',
    existingActivities: ConversationActivityEntity[]
  ): Promise<void> {
    const planMessageId = this.findPlanMessageId(existingActivities);
    if (!existingActivities.length || !planMessageId) {
      return;
    }

    const title = verdict === 'approved' ? 'Approved, resuming…' : 'Denied, resuming…';
    const tasks = this.collectTasks(existingActivities);

    await this.postOrEditPlan(command, planMessageId, this.toModel(title, tasks, false));
  }

  private async handleFinalize(
    command: HandlePlanProgressCommand,
    toolProgress: ToolProgressPayload,
    existingActivities: ConversationActivityEntity[]
  ): Promise<void> {
    const planMessageId = this.findPlanMessageId(existingActivities);
    if (!existingActivities.length || !planMessageId) {
      return;
    }

    const title = toolProgress.action === 'fail' ? 'Something went wrong' : 'Finished thinking';
    const tasks = this.collectTasks(existingActivities);

    await this.postOrEditPlan(command, planMessageId, this.toModel(title, tasks, true));
  }

  private async postOrEditPlan(
    command: HandlePlanProgressCommand,
    existingMessageId: string | undefined,
    model: PlanModel
  ): Promise<string | undefined> {
    try {
      const result = await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          plan: { model, messageId: existingMessageId },
        })
      );

      return result?.messageId ?? existingMessageId;
    } catch (err) {
      this.logger.warn(err, 'Failed to post/edit plan card');

      return undefined;
    }
  }

  private async persistToolActivity(
    command: HandlePlanProgressCommand,
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
          turnId: toolProgress.turnId,
          planMessageId,
          toolUseId: toolProgress.toolUseId,
          toolName,
          mcpServerName: toolProgress.mcpServerName,
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
          mcpServerName: (payload.mcpServerName as string) || existing?.mcpServerName,
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
      title: t.mcpServerName ? `${t.mcpServerName}: ${t.toolName}` : t.toolName,
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
