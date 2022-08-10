import { ApiProperty } from '@nestjs/swagger';
import { SubscriberResponseDto } from './subscriber-response.dto';

export class SubscribersResponseDto {
  @ApiProperty()
  page: number;
  @ApiProperty()
  totalCount: number;
  @ApiProperty()
  pageSize: number;
  @ApiProperty()
  data: SubscriberResponseDto[];
}
