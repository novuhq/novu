import { ApiProperty } from '@nestjs/swagger';

import { TenantCustomData } from '@novu/shared';
import { TenantId } from '@novu/dal';

export class CreateTenantResponseDto {
  @ApiProperty()
  _id: string;

  @ApiProperty()
  identifier: string;

  @ApiProperty()
  name?: string;

  @ApiProperty()
  data?: TenantCustomData;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
