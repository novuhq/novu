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

  @ApiProperty({ description: 'API key to validate against the provider.' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiPropertyOptional({
    description: 'Workspace id for Anthropic cloud (optional) or required for Claude Platform on AWS.',
  })
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
