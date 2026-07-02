import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntime, SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage } from '@novu/shared';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ManagedRuntimeDto } from './agent-runtime-config.dto';

export class CreateAgentRequestDto {
  @ApiProperty({
    description:
      'Required when not adopting an existing managed agent (i.e. when managedRuntime.externalAgentId is absent). ' +
      'Optional in adopt mode where the name is resolved from the provider.',
  })
  @IsOptional()
  @IsString()
  name: string;

  @ApiProperty({
    description:
      'Required when not adopting an existing managed agent. ' +
      'Auto-generated from the provider agent name when omitted in adopt mode.',
  })
  @IsOptional()
  @IsString()
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
