import { ApiProperty } from '@nestjs/swagger';
import { MessageResponseDto } from '../../widgets/dtos/message-response.dto';

export class ActivitiesResponseDto {
  @ApiProperty()
  totalCount: number;
  @ApiProperty()
  data: MessageResponseDto[];
  @ApiProperty()
  pageSize: number;
  @ApiProperty()
  page: number;
}
