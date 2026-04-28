import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SLUG_IDENTIFIER_REGEX, slugIdentifierFormatMessage } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

import { AgentRuntimeEnum, ManagedRuntimeDto } from './agent-runtime.dto';

export class CreateAgentRequestDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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

  @ApiPropertyOptional({ enum: AgentRuntimeEnum, default: AgentRuntimeEnum.BRIDGE })
  @IsEnum(AgentRuntimeEnum)
  @IsOptional()
  runtime?: AgentRuntimeEnum;

  @ApiPropertyOptional({ type: ManagedRuntimeDto })
  @ValidateNested()
  @Type(() => ManagedRuntimeDto)
  @IsOptional()
  managedRuntime?: ManagedRuntimeDto;
}
