import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsValidContextData } from '@novu/application-generic';
import { CONTEXT_IDENTIFIER_REGEX, ContextData, ContextId, ContextType } from '@novu/shared';
import { IsDefined, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateContextRequestDto {
  @ApiProperty({
    description:
      'Context type (e.g., tenant, app, workspace). Must be lowercase alphanumeric with optional separators.',
    example: 'tenant',
    required: true,
    type: String,
    pattern: CONTEXT_IDENTIFIER_REGEX.source,
  })
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(CONTEXT_IDENTIFIER_REGEX, {
    message: 'Type must be lowercase alphanumeric with optional ., _, or - separators',
  })
  type: ContextType;

  @ApiProperty({
    description: 'Unique identifier for this context. Must be lowercase alphanumeric with optional separators.',
    example: 'org-acme',
    required: true,
    type: String,
    pattern: CONTEXT_IDENTIFIER_REGEX.source,
  })
  @IsDefined()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(CONTEXT_IDENTIFIER_REGEX, {
    message: 'ID must be lowercase alphanumeric with optional ., _, or - separators',
  })
  id: ContextId;

  @ApiProperty({
    description: 'Optional custom data to associate with this context.',
    example: { tenantName: 'Acme Corp', region: 'us-east-1', settings: { theme: 'dark' } },
    required: false,
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsValidContextData()
  data?: ContextData;

  @ApiPropertyOptional({
    description:
      'Optional bridge URL override for agent connect. When an inbound agent turn resolves this context, ' +
      'its bridge call is routed here instead of the agent default bridge URL. Must be a publicly reachable URL.',
    example: 'https://tenant-acme.example.com/api/novu',
    type: String,
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  bridgeUrl?: string;
}
