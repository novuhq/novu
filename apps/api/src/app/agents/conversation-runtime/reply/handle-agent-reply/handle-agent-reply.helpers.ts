import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { PinoLogger } from '@novu/application-generic';
import { ConversationChannel, ConversationEntity, ConversationParticipantTypeEnum } from '@novu/dal';
import type { TriggerSignal } from '@novu/framework/internal';
import {
  AddressingTypeEnum,
  HUMAN_TRUST_SERVER_OPTION_ID,
  HUMAN_TRUST_TOOL_OPTION_ID,
  type TriggerRecipientsPayload,
  TriggerRequestCategoryEnum,
} from '@novu/shared';
import { ParseEventRequest, ParseEventRequestMulticastCommand } from '../../../../events/usecases/parse-event-request';
import type { HumanInteractionCardInput } from '../../../../human/usecases/create-conversation-interaction/create-conversation-interaction.command';
import type { ReplyContentDto, ToolApprovalRequestPayloadDto } from '../../../shared/dtos/agent-reply-payload.dto';
import { isValidMetadataSignalKey } from '../../../shared/dtos/agent-reply-payload.dto';
import {
  DIRECT_TOOL_APPROVAL_ACTION_PREFIX,
  MCP_TOOL_APPROVAL_ACTION_PREFIX,
} from '../../../shared/tool-approval/action-id';
import type { SelfHostedApprovalDescriptor } from '../../../shared/tool-approval/self-hosted-approval';
import { summariseToolInput } from '../../../shared/tool-approval/tool-approval-card.builder';
import type { MetadataOp } from '../../conversation/agent-conversation.service';
import { AgentConversationService } from '../../conversation/agent-conversation.service';
import { HandleAgentReplyCommand } from './handle-agent-reply.command';

type HitlToolApprovalChrome = {
  title: string;
  subtitle?: string;
  icon?: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
  extraActions?: Array<{ id: string; label: string }>;
};

export function managedTrustExtraActions(request: ToolApprovalRequestPayloadDto): Array<{ id: string; label: string }> {
  const isManagedGate =
    Boolean(request.mcpServerName) ||
    request.approveActionId?.startsWith(`${MCP_TOOL_APPROVAL_ACTION_PREFIX}:`) ||
    request.approveActionId?.startsWith(`${DIRECT_TOOL_APPROVAL_ACTION_PREFIX}:`);

  if (!isManagedGate) {
    return [];
  }

  const extras: Array<{ id: string; label: string }> = [
    { id: HUMAN_TRUST_TOOL_OPTION_ID, label: 'Always allow this tool' },
  ];
  if (request.mcpServerName) {
    extras.push({
      id: HUMAN_TRUST_SERVER_OPTION_ID,
      label: `Always allow ${request.mcpServerName}`,
    });
  }

  return extras;
}

export function hitlToolApprovalCard(
  command: HandleAgentReplyCommand,
  request: ToolApprovalRequestPayloadDto,
  delivery: { skipDelivery: true } | { skipDelivery: false; content: ReplyContentDto }
): HumanInteractionCardInput {
  const descriptor = (command.reply?.toolApprovalCard ?? {}) as SelfHostedApprovalDescriptor;
  const extraActions = managedTrustExtraActions(request);
  const title = descriptor.title ?? 'Tool approval required';
  const summary = summariseToolInput(request.input);
  const subtitle = descriptor.subtitle ?? (summary ? `${request.name}: ${summary}` : request.name);
  const chrome: HitlToolApprovalChrome = {
    title,
    subtitle,
    ...(descriptor.icon ? { icon: descriptor.icon } : {}),
    ...(descriptor.body ? { body: descriptor.body } : {}),
    ...(descriptor.approveLabel ? { approveLabel: descriptor.approveLabel } : {}),
    ...(descriptor.denyLabel ? { denyLabel: descriptor.denyLabel } : {}),
    ...(extraActions.length ? { extraActions } : {}),
  };

  if (delivery.skipDelivery) {
    return chrome;
  }

  if (delivery.content.card) {
    return {
      ...delivery.content.card,
      title: delivery.content.card.title ?? chrome.title,
    };
  }

  if (typeof delivery.content.markdown === 'string' && delivery.content.markdown.trim()) {
    return { ...chrome, body: delivery.content.markdown.trim() };
  }

  return chrome;
}

export function normalizeMetadataOps(
  signals: Array<{ type: 'metadata'; action?: string; key?: string; value?: unknown }>
): MetadataOp[] {
  const ops: MetadataOp[] = [];

  for (const signal of signals) {
    const action = signal.action ?? 'set';

    switch (action) {
      case 'clear':
        ops.push({ action: 'clear' });
        break;
      case 'delete':
        if (!signal.key || !isValidMetadataSignalKey(signal.key)) {
          throw new BadRequestException(`Invalid metadata signal key: "${signal.key}"`);
        }
        ops.push({ action: 'delete', key: signal.key });
        break;
      case 'set':
        if (!signal.key || !isValidMetadataSignalKey(signal.key)) {
          throw new BadRequestException(`Invalid metadata signal key: "${signal.key}"`);
        }
        if (signal.value === undefined) {
          throw new BadRequestException(`Metadata signal "${signal.key}" must have a defined value`);
        }
        ops.push({ action: 'set', key: signal.key, value: signal.value });
        break;
      default:
        throw new BadRequestException(`Unsupported metadata signal action: "${action}"`);
    }
  }

  return ops;
}

type TriggerSignalDispatchDeps = {
  parseEventRequest: ParseEventRequest;
  conversationService: AgentConversationService;
  logger: PinoLogger;
};

/** Dispatch each `trigger` signal as a workflow event and persist the resulting activity. */
export async function dispatchTriggerSignals(
  deps: TriggerSignalDispatchDeps,
  command: HandleAgentReplyCommand,
  conversation: ConversationEntity,
  channel: ConversationChannel,
  signals: TriggerSignal[]
): Promise<void> {
  const { parseEventRequest, conversationService, logger } = deps;
  const subscriberParticipant = conversation.participants.find(
    (p) => p.type === ConversationParticipantTypeEnum.SUBSCRIBER
  );

  for (const signal of signals) {
    const to = (signal.to as TriggerRecipientsPayload | undefined) ?? subscriberParticipant?.id;

    if (!to) {
      logger.warn(
        { agentIdentifier: command.agentIdentifier, workflowId: signal.workflowId },
        `[agent:${command.agentIdentifier}] Skipping trigger signal for "${signal.workflowId}" — no recipient and conversation has no resolved subscriber`
      );
      continue;
    }

    let transactionId: string;
    try {
      const result = await parseEventRequest.execute(
        ParseEventRequestMulticastCommand.create({
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          identifier: signal.workflowId,
          payload: signal.payload ?? {},
          overrides: {},
          to,
          addressingType: AddressingTypeEnum.MULTICAST,
          requestCategory: TriggerRequestCategoryEnum.SINGLE,
          requestId: randomUUID(),
        })
      );
      transactionId = result.transactionId;
    } catch (err) {
      logger.warn(
        { err, agentIdentifier: command.agentIdentifier, workflowId: signal.workflowId },
        `[agent:${command.agentIdentifier}] Failed to dispatch trigger for workflow "${signal.workflowId}"`
      );
      continue;
    }

    try {
      await conversationService.persistTriggerSignal({
        conversationId: conversation._id,
        channel,
        agentIdentifier: command.agentIdentifier,
        workflowId: signal.workflowId,
        to,
        transactionId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });
    } catch (err) {
      logger.warn(
        { err, agentIdentifier: command.agentIdentifier, workflowId: signal.workflowId, transactionId },
        `[agent:${command.agentIdentifier}] Workflow "${signal.workflowId}" was enqueued (txn: ${transactionId}) but failed to persist activity`
      );
    }
  }
}
