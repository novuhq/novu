import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentRuntimeProviderIdEnum, AWS_CLAUDE_COMMERCIAL_REGIONS, isGoogleAgentRuntimeProvider } from '@novu/shared';
import { IsEnum, IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';

export class VerifyManagedCredentialsRequestDto {
  @ApiProperty({
    description: 'Identifier of the managed-runtime provider to verify credentials against.',
    enum: AgentRuntimeProviderIdEnum,
    enumName: 'AgentRuntimeProviderIdEnum',
  })
  @IsEnum(AgentRuntimeProviderIdEnum)
  @IsNotEmpty()
  providerId: AgentRuntimeProviderIdEnum;

  @ApiPropertyOptional({
    description:
      'API key to validate against the provider. Required for Anthropic providers. Unused for Gemini Enterprise.',
  })
  @ValidateIf((body: VerifyManagedCredentialsRequestDto) => !isGoogleAgentRuntimeProvider(body.providerId))
  @IsString()
  @IsNotEmpty()
  apiKey?: string;

  @ApiPropertyOptional({
    description: 'Workspace id for Anthropic cloud (optional) or required for Claude Platform on AWS.',
  })
  @ValidateIf((body: VerifyManagedCredentialsRequestDto) => body.providerId === AgentRuntimeProviderIdEnum.AnthropicAws)
  @IsString()
  @IsNotEmpty()
  externalWorkspaceId?: string;

  @ApiPropertyOptional({
    description:
      'AWS region for Claude Platform on AWS, or GCP location for Gemini Enterprise (optional, defaults to global).',
  })
  @ValidateIf((body: VerifyManagedCredentialsRequestDto) => body.providerId === AgentRuntimeProviderIdEnum.AnthropicAws)
  @IsString()
  @IsNotEmpty()
  @IsIn([...AWS_CLAUDE_COMMERCIAL_REGIONS])
  region?: string;

  @ApiPropertyOptional({ description: 'GCP project ID for Gemini Enterprise.' })
  @ValidateIf((body: VerifyManagedCredentialsRequestDto) => isGoogleAgentRuntimeProvider(body.providerId))
  @IsString()
  @IsNotEmpty()
  projectName?: string;

  @ApiPropertyOptional({ description: 'Gemini Enterprise engine ID from the Discovery Engine console.' })
  @ValidateIf((body: VerifyManagedCredentialsRequestDto) => isGoogleAgentRuntimeProvider(body.providerId))
  @IsString()
  @IsNotEmpty()
  instanceId?: string;
}
