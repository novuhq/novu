import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentRepository, ConversationEntity, ConversationRepository } from '@novu/dal';
import type { PlanModel, PlanTaskStatus } from 'chat';
import { AgentConversationService } from '../../conversation/agent-conversation.service';
import type { PlanProgressPhase, PlanTaskInput } from '../../egress/plan-phase';
import {
  formatToolDisplayName,
  type PlanPhase,
  planTitleForCurrentTool,
  planTitleForPhase,
} from '../../egress/plan-phase';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from './handle-plan-progress.command';

@Injectable()
export class HandlePlanProgress {
  constructor(
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

    const activePlanMessageId = conversation.activePlanMessageId;
    const { event } = command;

    switch (event.kind) {
      case 'task':
        return this.handleTask(command, event.task, event.cardTitle, activePlanMessageId);
      case 'phase':
        return this.handlePhase(command, event.phase, event.title, event.task, activePlanMessageId);
      case 'title':
        return this.handleTitle(command, event.title, activePlanMessageId);
      default:
        return assertNever(event);
    }
  }

  private async handleTask(
    command: HandlePlanProgressCommand,
    taskInput: PlanTaskInput,
    cardTitle: string | undefined,
    activePlanMessageId: string | undefined
  ): Promise<void> {
    const model = this.toModel('thinking', taskInput, false, cardTitle);
    const planMessageId = await this.postOrEditPlan(command, activePlanMessageId, model, 'thinking');

    if (planMessageId && planMessageId !== activePlanMessageId) {
      await this.conversationRepository.setActivePlanMessageId(
        command.environmentId,
        command.organizationId,
        command.conversationId,
        planMessageId
      );
    }
  }

  private async handlePhase(
    command: HandlePlanProgressCommand,
    phase: PlanProgressPhase,
    title: string | undefined,
    task: PlanTaskInput | undefined,
    activePlanMessageId: string | undefined
  ): Promise<void> {
    if (!activePlanMessageId) {
      return;
    }

    const isFinal = phase === 'finished' || phase === 'failed';

    await this.postOrEditPlan(command, activePlanMessageId, this.toModel(phase, task, isFinal, title), phase);

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
    activePlanMessageId: string | undefined
  ): Promise<void> {
    const model = this.toModel('thinking', undefined, false, title);

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

  private toModel(
    phase: PlanPhase,
    task: PlanTaskInput | undefined,
    isFinalized: boolean,
    titleOverride?: string
  ): PlanModel {
    if (!task) {
      return { title: titleOverride ?? planTitleForPhase(phase), tasks: [] };
    }

    const displayName = formatToolDisplayName(task.title, task.group);
    const terminalStatus: PlanTaskStatus = phase === 'failed' ? 'error' : 'complete';
    const status = isFinalized && task.status !== 'complete' && task.status !== 'error' ? terminalStatus : task.status;
    const title =
      titleOverride ??
      (phase === 'thinking' ? planTitleForCurrentTool({ ...task, title: displayName }) : planTitleForPhase(phase));

    return {
      title,
      tasks: [
        {
          id: task.id,
          title: displayName,
          status,
          ...(task.details ? { details: { markdown: task.details } } : {}),
        },
      ],
    };
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
