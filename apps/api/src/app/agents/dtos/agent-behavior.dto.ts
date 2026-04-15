import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, ValidateIf, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AgentReactionSettingsDto {
  @ApiPropertyOptional({
    description: 'Emoji reaction for incoming messages. Emoji name string to customize, null to disable. Default: "eyes" (👀)',
    default: 'eyes',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  onMessageReceived?: string | null;

  @ApiPropertyOptional({
    description: 'Emoji reaction when a conversation is resolved. Emoji name string to customize, null to disable. Default: "check" (✅)',
    default: 'check',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
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
