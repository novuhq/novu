import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgentSubscriberAccessEnum } from '@novu/shared';
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
      '"open" auto-creates a lightweight subscriber so the agent can reply; ' +
      '"restricted" rejects unknown senders with a managed denial reply. ' +
      'Unset resolves as "restricted". Managed agent create defaults to "open"; self-hosted create defaults to "restricted".',
  })
  @IsOptional()
  @IsEnum(AgentSubscriberAccessEnum)
  subscriberAccess?: AgentSubscriberAccessEnum;
}
