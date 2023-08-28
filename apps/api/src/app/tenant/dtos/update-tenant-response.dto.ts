import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TenantCustomData } from '@novu/shared';
import { IsString } from 'class-validator';

export class UpdateTenantResponseDto {
  @ApiProperty({ type: String })
  @IsString()
  _id: string;

  @ApiProperty({ type: String })
  @IsString()
  identifier: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  data?: TenantCustomData;

  @ApiProperty({ type: String })
  @IsString()
  _environmentId: string;

  @ApiProperty({ type: String })
  @IsString()
  createdAt: string;

  @ApiProperty({ type: String })
  @IsString()
  updatedAt: string;
}
