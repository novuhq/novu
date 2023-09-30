import { ApiProperty } from '@nestjs/swagger';

export class GetMxRecordResponseDto {
  @ApiProperty()
  mxRecordConfigured: boolean;
}
