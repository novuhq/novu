import { ApiProperty } from '@nestjs/swagger';
import { ICreateTenantDto, TenantCustomData } from '@novu/shared';
import { IsString } from 'class-validator';

export class CreateTenantRequestDto implements ICreateTenantDto {
  @ApiProperty()
  @IsString()
  identifier: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  data?: TenantCustomData;
}
