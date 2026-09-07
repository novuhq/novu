import { ApiPropertyOptional } from '@nestjs/swagger';
import { AGENT_NAME_MAX_LENGTH } from '@novu/shared';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';

import { AgentBehaviorDto } from './agent-behavior.dto';

export class UpdateAgentRequestDto {
  @ApiPropertyOptional({ maxLength: AGENT_NAME_MAX_LENGTH })
  @IsString()
  @IsOptional()
  // Trim before measuring so trailing whitespace can't push a valid name over the limit.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(AGENT_NAME_MAX_LENGTH, {
    message: `Agent name must be ${AGENT_NAME_MAX_LENGTH} characters or fewer.`,
  })
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
