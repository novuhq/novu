import { ApiProperty } from '@nestjs/swagger';
import { CustomDataType, ICreateTenantDto } from '@novu/shared';

export class CreateTenantRequestDto implements ICreateTenantDto {
  @ApiProperty()
  identifier: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  data?: CustomDataType;
}
