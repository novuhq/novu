import { ApiProperty } from '@nestjs/swagger';
import { ContextData, ContextType } from '@novu/shared';

export class GetContextResponseDto {
  @ApiProperty({ type: String })
  type: ContextType;

  @ApiProperty()
  id: string;

  @ApiProperty()
  data: ContextData;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
