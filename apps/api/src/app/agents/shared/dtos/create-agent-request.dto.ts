import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AGENT_IDENTIFIER_MAX_LENGTH, AGENT_NAME_MAX_LENGTH, AgentRuntime, SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage } from '@novu/shared';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ManagedRuntimeDto } from './agent-runtime-config.dto';

export class CreateAgentRequestDto {
  @ApiProperty({
    description:
      'Required when not adopting an existing managed agent (i.e. when managedRuntime.externalAgentId is absent). ' +
      'Optional in adopt mode where the name is resolved from the provider.',
    maxLength: AGENT_NAME_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  // Trim before measuring so trailing whitespace can't push a valid name over the limit.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(AGENT_NAME_MAX_LENGTH, {
    message: `Agent name must be ${AGENT_NAME_MAX_LENGTH} characters or fewer.`,
  })
  name: string;

  @ApiProperty({
    description:
      'Required when not adopting an existing managed agent. ' +
      'Auto-generated from the provider agent name when omitted in adopt mode.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(AGENT_IDENTIFIER_MAX_LENGTH, {
    message: `Identifier must be ${AGENT_IDENTIFIER_MAX_LENGTH} characters or fewer.`,
  })
  @Matches(SLUG_IDENTIFIER_REGEX, {
    message: slugIdentifierFormatMessage('identifier'),
  })
  identifier: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ enum: ['self-hosted', 'managed'] })
  @IsOptional()
  @IsEnum(['self-hosted', 'managed'] as const)
  runtime?: AgentRuntime;

  @ApiPropertyOptional({ type: ManagedRuntimeDto })
  @ValidateIf((o) => o.runtime === 'managed')
  @IsObject()
  @ValidateNested()
  @Type(() => ManagedRuntimeDto)
  managedRuntime?: ManagedRuntimeDto;
}
