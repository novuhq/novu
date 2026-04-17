import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IsWellKnownEmoji } from '../validators/is-well-known-emoji.validator';

export class AgentReactionSettingsDto {
  @ApiPropertyOptional({
    description:
      'Cross-platform emoji name for incoming messages (e.g. "eyes", "thumbs_up"). ' +
      'Set to null to disable. Default: "eyes"',
    default: 'eyes',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsWellKnownEmoji()
  onMessageReceived?: string | null;

  @ApiPropertyOptional({
    description:
      'Cross-platform emoji name for resolved conversations (e.g. "check", "star"). ' +
      'Set to null to disable. Default: "check"',
    default: 'check',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsWellKnownEmoji()
  onResolved?: string | null;
}

export class AgentBehaviorDto {
  @ApiPropertyOptional({ description: 'Show a "Thinking..." indicator while the agent is processing a message' })
  @IsBoolean()
  @IsOptional()
  thinkingIndicatorEnabled?: boolean;

  @ApiPropertyOptional({ type: AgentReactionSettingsDto, description: 'Automatic emoji reactions on messages' })
  @ValidateNested()
  @Type(() => AgentReactionSettingsDto)
  @IsOptional()
  reactions?: AgentReactionSettingsDto;
}
