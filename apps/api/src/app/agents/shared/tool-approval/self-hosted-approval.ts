import { buildApprovalActionId } from '@novu/framework/internal';
import type { SlackNativeDelivery } from '../../conversation-runtime/egress/slack-native-delivery';
import type { ReplyContentDto, ToolApprovalRequestPayloadDto } from '../dtos/agent-reply-payload.dto';
import {
  type ApprovalCardSpec,
  buildToolApprovalCard,
  resolveDashboardBaseUrl,
  summariseToolInput,
} from './tool-approval-card.builder';

export type SelfHostedApprovalDescriptor = {
  icon?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
};

export type SelfHostedApprovalDelivery = {
  content: ReplyContentDto;
  slackNative: SlackNativeDelivery;
};

export function buildSelfHostedApprovalCard(
  descriptor: SelfHostedApprovalDescriptor,
  request: ToolApprovalRequestPayloadDto
): SelfHostedApprovalDelivery {
  const summary = summariseToolInput(request.input);
  const subtitle = descriptor.subtitle ?? (summary ? `${request.name}: ${summary}` : request.name);

  const spec: ApprovalCardSpec = {
    title: descriptor.title ?? 'Tool approval required',
    subtitlePortable: subtitle,
    subtitleSlack: subtitle,
    bodySlack: descriptor.body,
    slackText: `Approve ${request.name}?`,
    icon: { value: descriptor.icon, fallbackName: request.name },
    deny: {
      id: buildApprovalActionId('deny', request.approvalId),
      label: descriptor.denyLabel ?? 'Deny',
    },
    approve: {
      id: buildApprovalActionId('approve', request.approvalId),
      label: descriptor.approveLabel ?? 'Approve',
    },
  };

  const { portable, slackNative } = buildToolApprovalCard(spec, { baseUrl: resolveDashboardBaseUrl() });

  return { content: { card: portable }, slackNative };
}
