import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionsEnum, ServiceAccountScopeEnum } from '@novu/shared';
import { IsArray, IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateServiceAccountRequestDto {
  @ApiProperty({ description: 'Human-readable name for the service account' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ServiceAccountScopeEnum })
  @IsEnum(ServiceAccountScopeEnum)
  scope: ServiceAccountScopeEnum;

  @ApiPropertyOptional({ description: 'Required when scope is environment' })
  @IsString()
  @IsOptional()
  environmentId?: string;

  @ApiPropertyOptional({ type: [String], enum: PermissionsEnum })
  @IsArray()
  @IsOptional()
  defaultPermissions?: PermissionsEnum[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
