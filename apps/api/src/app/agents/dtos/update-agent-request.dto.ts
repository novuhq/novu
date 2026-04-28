import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Production bridge URL for this agent' })
  @IsUrl({ require_tld: false })
  @IsOptional()
  bridgeUrl?: string;

  @ApiPropertyOptional({ description: 'Development bridge URL (set by npx novu dev)' })
  @IsUrl({ require_tld: false })
  @IsOptional()
  devBridgeUrl?: string;

  @ApiPropertyOptional({ description: 'Whether the dev bridge override is active' })
  @IsBoolean()
  @IsOptional()
  devBridgeActive?: boolean;
}
