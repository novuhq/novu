import { ApiProperty } from '@nestjs/swagger';
import { ContextData, ContextTypeEnum } from '@novu/shared';

export class GetContextResponseDto {
  @ApiProperty({ enum: ContextTypeEnum })
  type: ContextTypeEnum;

  @ApiProperty()
  identifier: string;

  @ApiProperty()
  data: ContextData;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
