import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

import { AgentBehaviorDto } from './agent-behavior.dto';

export class UpdateAgentRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ type: AgentBehaviorDto })
  @ValidateNested()
  @Type(() => AgentBehaviorDto)
  @IsOptional()
  behavior?: AgentBehaviorDto;
}
