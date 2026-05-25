import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeProviderIdEnum } from '@novu/shared';
import { IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class VerifyManagedCredentialsRequestDto {
  @ApiProperty({
    description: 'Identifier of the managed-runtime provider to verify credentials against.',
    enum: AgentRuntimeProviderIdEnum,
    enumName: 'AgentRuntimeProviderIdEnum',
  })
  @IsEnum(AgentRuntimeProviderIdEnum)
  @IsNotEmpty()
  providerId: AgentRuntimeProviderIdEnum;

  @ApiPropertyOptional({ description: 'API key to validate against the provider.' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Optional workspace id; defaults to the provider default workspace.' })
  @ValidateIf((body: VerifyManagedCredentialsRequestDto) => body.providerId === AgentRuntimeProviderIdEnum.AnthropicAws)
  @IsString()
  @IsNotEmpty()
  externalWorkspaceId?: string;

  @ApiPropertyOptional({ description: 'AWS region for Claude Platform on AWS.' })
  @ValidateIf((body: VerifyManagedCredentialsRequestDto) => body.providerId === AgentRuntimeProviderIdEnum.AnthropicAws)
  @IsString()
  @IsNotEmpty()
  region?: string;
}
