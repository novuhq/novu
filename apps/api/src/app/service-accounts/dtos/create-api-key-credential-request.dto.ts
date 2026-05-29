import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionsEnum } from '@novu/shared';
import { IsArray, IsISO8601, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateApiKeyCredentialRequestDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ type: [String], enum: PermissionsEnum })
  @IsArray()
  @IsOptional()
  permissions?: PermissionsEnum[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'ISO 8601 expiration date' })
  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
