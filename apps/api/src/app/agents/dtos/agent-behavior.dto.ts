import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class AgentBehaviorDto {
  @ApiPropertyOptional({ description: 'Show a "Thinking..." indicator while the agent is processing a message' })
  @IsBoolean()
  @IsOptional()
  thinkingIndicatorEnabled?: boolean;
}
