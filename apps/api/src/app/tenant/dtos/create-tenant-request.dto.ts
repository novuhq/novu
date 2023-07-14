import { ApiProperty } from '@nestjs/swagger';
import { TenantCustomData } from '@novu/shared';

export class CreateTenantRequestDto {
  @ApiProperty()
  identifier: string;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  data?: TenantCustomData;
}
