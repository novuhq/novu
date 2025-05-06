import { ApiPropertyOptional } from '@nestjs/swagger';
import { IUpdateTenantDto, CustomDataType } from '@novu/shared';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTenantRequestDto implements IUpdateTenantDto {
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
  data?: CustomDataType;
}
