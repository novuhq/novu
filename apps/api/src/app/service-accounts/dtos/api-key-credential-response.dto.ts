import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionsEnum } from '@novu/shared';

export class ApiKeyCredentialResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  serviceAccountId: string;

  @ApiProperty()
  keyPrefix: string;

  @ApiProperty()
  last4: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiProperty({ type: [String], enum: PermissionsEnum })
  permissions: PermissionsEnum[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  lastUsedAt?: string;

  @ApiPropertyOptional()
  expiresAt?: string;

  @ApiPropertyOptional()
  revokedAt?: string;

  @ApiProperty()
  createdAt: string;
}

export class CreateApiKeyCredentialResponseDto extends ApiKeyCredentialResponseDto {
  @ApiProperty({ description: 'Full API key — shown only once at creation' })
  key: string;
}
