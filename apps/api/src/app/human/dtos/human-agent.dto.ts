import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AGENT_NAME_MAX_LENGTH } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { AGENT_DESCRIPTION_MAX_LENGTH, trimmed } from './setup-human-relay.dto';

/** Which relay agent a call is about, for a setup made with its own `--agent-identifier`. */
export class HumanAgentQueryDto {
  @ApiPropertyOptional({ description: 'Relay agent identifier. Defaults to `human-relay`.' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-_]+$/i)
  @MaxLength(64)
  agentIdentifier?: string;
}

export class UpdateHumanAgentRequestDto extends HumanAgentQueryDto {
  @ApiPropertyOptional({
    description: 'What the relay agent is called from now on. Missing leaves the name it has.',
    maxLength: AGENT_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @IsNotEmpty()
  @MaxLength(AGENT_NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({
    description: 'A line about what the relay agent does. An empty one clears it; missing leaves it alone.',
    maxLength: AGENT_DESCRIPTION_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @MaxLength(AGENT_DESCRIPTION_MAX_LENGTH)
  description?: string;
}

export class HumanAgentResponseDto {
  @ApiProperty()
  agentId: string;

  @ApiProperty()
  agentIdentifier: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Where anyone can load the agent’s picture. Missing when it has none.' })
  pictureUrl?: string;

  @ApiProperty()
  active: boolean;

  @ApiPropertyOptional({ description: 'When `human setup` made the agent.' })
  createdAt?: string;
}
