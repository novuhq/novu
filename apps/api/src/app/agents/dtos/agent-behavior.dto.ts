import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, ValidateIf } from 'class-validator';
import { IsWellKnownEmoji } from '../validators/is-well-known-emoji.validator';

export class AgentBehaviorDto {
  @ApiPropertyOptional({
    description:
      'Acknowledge incoming messages. On platforms that support a native typing indicator ' +
      '(e.g. Slack, Microsoft Teams), shows a "Typing…" indicator while the agent processes the message. ' +
      'On platforms that do not (e.g. WhatsApp), reacts with an "eyes" emoji to the first ' +
      'inbound message in a thread. Default: true',
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
}
