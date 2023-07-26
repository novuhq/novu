import { ApiProperty } from '@nestjs/swagger';
import { ICreateTenantBodyDto, TenantCustomData } from '@novu/shared';

export class CreateTenantRequestDto implements ICreateTenantBodyDto {
  @ApiProperty()
  identifier: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  data?: TenantCustomData;
}
