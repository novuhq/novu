import { ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeEnum } from '@novu/dal';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, ValidateNested } from 'class-validator';

import { AgentBehaviorDto } from './agent-behavior.dto';
import { ManagedRuntimeDto } from './agent-runtime.dto';

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

  @ApiPropertyOptional({ enum: AgentRuntimeEnum })
  @IsEnum(AgentRuntimeEnum)
  @IsOptional()
  runtime?: AgentRuntimeEnum;

  @ApiPropertyOptional({ type: ManagedRuntimeDto })
  @ValidateNested()
  @Type(() => ManagedRuntimeDto)
  @IsOptional()
  managedRuntime?: ManagedRuntimeDto;

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
