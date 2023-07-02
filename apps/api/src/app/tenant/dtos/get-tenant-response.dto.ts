import { ApiProperty } from '@nestjs/swagger';
import { TenantCustomData } from '@novu/shared';

export class GetTenantResponseDto {
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
