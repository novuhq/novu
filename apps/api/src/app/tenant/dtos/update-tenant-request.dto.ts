import { ApiPropertyOptional } from '@nestjs/swagger';
import { IUpdateTenantBodyDto, TenantCustomData } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTenantRequestDto implements IUpdateTenantBodyDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String })
  identifier?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ type: String })
  name?: string;

  @IsOptional()
  @ApiPropertyOptional()
  data?: TenantCustomData;
}
