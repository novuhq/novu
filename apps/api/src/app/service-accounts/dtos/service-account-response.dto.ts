import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionsEnum, ServiceAccountScopeEnum } from '@novu/shared';

export class ServiceAccountResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: ServiceAccountScopeEnum })
  scope: ServiceAccountScopeEnum;

  @ApiPropertyOptional()
  environmentId?: string;

  @ApiProperty({ type: [String], enum: PermissionsEnum })
  defaultPermissions: PermissionsEnum[];

  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
