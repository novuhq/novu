import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger, shortId } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivityEntity,
  ConversationActivityRepository,
  type ConversationChannel,
  ConversationEntity,
  ConversationRepository,
} from '@novu/dal';
import type { PlanProgressPhase, PlanTaskInput, PlanTaskStatus } from '@novu/framework';
import type { PlanModel } from 'chat';
import { AgentConversationService } from '../../conversation/agent-conversation.service';
import { PLAN_THINKING_TASK_ID, type PlanPhase, planTitleForPhase } from '../../egress/plan-phase';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from './handle-plan-progress.command';

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
    private readonly agentRepository: AgentRepository,
    private readonly conversationRepository: ConversationRepository,
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

    await this.assertAgentOwnsConversation(command, conversation);

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const activePlanMessageId = conversation.activePlanMessageId;
    const existingActivities = activePlanMessageId
      ? await this.activityRepository.findToolActivitiesByPlanMessageId(
          command.environmentId,
          command.conversationId,
          activePlanMessageId
        )
      : [];

    const { event } = command;
    switch (event.kind) {
      case 'task':
        return this.handleTask(command, channel, event.task, event.cardTitle, existingActivities, activePlanMessageId);
      case 'phase':
        return this.handlePhase(command, event.phase, event.title, existingActivities, activePlanMessageId);
      case 'title':
        return this.handleTitle(command, event.title, existingActivities, activePlanMessageId);
      default:
        return assertNever(event);
    }
  }

  private async handleTask(
    command: HandlePlanProgressCommand,
    channel: ConversationChannel,
    taskInput: PlanTaskInput,
    cardTitle: string | undefined,
    existingActivities: ConversationActivityEntity[],
    activePlanMessageId: string | undefined
  ): Promise<void> {
    const tasks = this.collectTasks(existingActivities);
    const existing = tasks.get(taskInput.id);
    const toolName = taskInput.title || existing?.toolName || 'Tool';
    const mcpServerName = taskInput.group || existing?.mcpServerName;
    const details = taskInput.details || existing?.details;

    tasks.set(taskInput.id, {
      toolUseId: taskInput.id,
      toolName,
      mcpServerName,
      status: taskInput.status,
      details,
    });

    const model = this.toModel('thinking', tasks, false, cardTitle);
    const planMessageId = await this.postOrEditPlan(command, activePlanMessageId, model, 'thinking');

    if (planMessageId && planMessageId !== activePlanMessageId) {
      await this.conversationRepository.setActivePlanMessageId(
        command.environmentId,
        command.organizationId,
        command.conversationId,
        planMessageId
      );
    }

    await this.persistTaskActivity(command, channel, taskInput, toolName, details, planMessageId);
  }

  private async handlePhase(
    command: HandlePlanProgressCommand,
    phase: PlanProgressPhase,
    title: string | undefined,
    existingActivities: ConversationActivityEntity[],
    activePlanMessageId: string | undefined
  ): Promise<void> {
    if (!activePlanMessageId) {
      return;
    }

    const tasks = this.collectTasks(existingActivities);
    const isFinal = phase === 'finished' || phase === 'failed';

    await this.postOrEditPlan(command, activePlanMessageId, this.toModel(phase, tasks, isFinal, title), phase);

    if (isFinal) {
      await this.conversationRepository.clearActivePlanMessageId(
        command.environmentId,
        command.organizationId,
        command.conversationId
      );
    }
  }

  private async handleTitle(
    command: HandlePlanProgressCommand,
    title: string | undefined,
    existingActivities: ConversationActivityEntity[],
    activePlanMessageId: string | undefined
  ): Promise<void> {
    const tasks = this.collectTasks(existingActivities);
    const model = this.toModel('thinking', tasks, false, title);

    if (activePlanMessageId) {
      await this.postOrEditPlan(command, activePlanMessageId, model, 'thinking');

      return;
    }

    const planMessageId = await this.postOrEditPlan(command, undefined, model, 'thinking');

    if (planMessageId) {
      await this.conversationRepository.setActivePlanMessageId(
        command.environmentId,
        command.organizationId,
        command.conversationId,
        planMessageId
      );
    }
  }

  private async persistTaskActivity(
    command: HandlePlanProgressCommand,
    channel: ConversationChannel,
    taskInput: PlanTaskInput,
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
      content: `Tool: ${toolName} (${taskInput.status})`,
      signalData: {
        type: 'tool-use',
        payload: {
          planMessageId,
          toolUseId: taskInput.id,
          toolName,
          mcpServerName: taskInput.group,
          status: taskInput.status,
          ...(details ? { details } : {}),
        },
      },
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
  }

  private async postOrEditPlan(
    command: HandlePlanProgressCommand,
    existingMessageId: string | undefined,
    model: PlanModel,
    phase: PlanPhase
  ): Promise<string | undefined> {
    try {
      const result = await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: command.organizationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          plan: { model, phase, messageId: existingMessageId },
        })
      );

      return result?.messageId ?? existingMessageId;
    } catch (err) {
      this.logger.warn(err, 'Failed to post/edit plan card');

      return undefined;
    }
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

  private toModel(
    phase: PlanPhase,
    tasks: Map<string, ToolTask>,
    isFinalized: boolean,
    titleOverride?: string
  ): PlanModel {
    const terminalStatus: PlanTaskStatus = phase === 'failed' ? 'error' : 'complete';

    const planTasks = [...tasks.values()].map((t) => ({
      id: t.toolUseId,
      title: t.mcpServerName ? `${t.mcpServerName}: ${t.toolName}` : t.toolName,
      status: isFinalized && t.status !== 'complete' && t.status !== 'error' ? terminalStatus : t.status,
      ...(t.details ? { details: { markdown: t.details } } : {}),
    }));

    const hasInProgress = planTasks.some((t) => t.status === 'in_progress');
    if (!isFinalized && !hasInProgress) {
      planTasks.push({
        id: PLAN_THINKING_TASK_ID,
        title: planTitleForPhase('thinking'),
        status: 'in_progress' as PlanTaskStatus,
      });
    }

    return { title: titleOverride ?? planTitleForPhase(phase), tasks: planTasks };
  }

  private async assertAgentOwnsConversation(
    command: HandlePlanProgressCommand,
    conversation: ConversationEntity
  ): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: command.agentIdentifier,
      },
      { _id: 1 }
    );

    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (String(agent._id) !== conversation._agentId) {
      throw new ForbiddenException('Agent identifier does not match this conversation');
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled PlanProgressEvent: ${JSON.stringify(value)}`);
}
