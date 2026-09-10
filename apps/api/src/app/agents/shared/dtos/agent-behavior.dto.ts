import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgentReplyPolicyEnum, AgentSubscriberAccessEnum } from '@novu/shared';
import { IsBoolean, IsEnum, IsOptional, ValidateIf } from 'class-validator';
import { IsWellKnownEmoji } from '../validators/is-well-known-emoji.validator';

export class AgentBehaviorDto {
  @ApiPropertyOptional({
    description:
      'Acknowledge incoming messages. On platforms that support a native typing indicator ' +
      '(e.g. Slack, WhatsApp, Microsoft Teams, Telegram), shows a "Typing…" indicator while the agent ' +
      'processes the message. On platforms that do not (e.g. Email), reacts with an "eyes" emoji to the ' +
      'first inbound message in a thread. Default: true',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  acknowledgeOnReceived?: boolean;

  @ApiPropertyOptional({
    description:
      'Cross-platform emoji name for resolved conversations (e.g. "check", "star"). ' +
      'Set to null to disable. Default: "check"',
    default: 'check',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsWellKnownEmoji()
  reactionOnResolved?: string | null;

  @ApiPropertyOptional({
    enum: AgentSubscriberAccessEnum,
    description:
      'Controls whether the agent accepts inbound messages from senders not yet linked to a subscriber, across all channels. ' +
      '"open" on managed agents auto-creates a lightweight subscriber so the agent can reply; ' +
      'on custom-code / self-hosted agents, the turn is forwarded to the bridge with a null subscriber. ' +
      '"restricted" rejects unknown senders with a managed denial reply (any runtime). ' +
      'Optional on update (partial PATCH). Persisted agents always have a value — managed create defaults to "open"; ' +
      'self-hosted create defaults to "restricted".',
  })
  @IsOptional()
  @IsEnum(AgentSubscriberAccessEnum)
  subscriberAccess?: AgentSubscriberAccessEnum;

  @ApiPropertyOptional({
    enum: AgentReplyPolicyEnum,
    description:
      'How the agent replies in shared rooms. "mention_only" requires an @mention in every shared room. ' +
      '"auto_reply" (default) replies to unmentioned follow-ups in a nested Slack or Teams thread after the agent has joined. ' +
      '"smart" behaves like auto_reply while one person is talking to the agent in a thread, then requires an @mention there once someone else joins or the incumbent @mentions another teammate. ' +
      'DMs always reply without a mention. ' +
      'Optional on update (partial PATCH).',
    default: AgentReplyPolicyEnum.AUTO_REPLY,
  })
  @IsOptional()
  @IsEnum(AgentReplyPolicyEnum)
  replyPolicy?: AgentReplyPolicyEnum;
}
