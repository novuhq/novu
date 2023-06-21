import { ApiProperty } from '@nestjs/swagger';
import { TenantCustomData } from '@novu/shared';

export class UpdateTenantRequestDto {
  @ApiProperty()
  identifier?: string;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  data?: TenantCustomData;
}
