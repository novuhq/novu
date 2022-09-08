import { ApiProperty } from '@nestjs/swagger';
import { NotificationTemplateResponse } from './notification-template-response.dto';

export class NotificationTemplatesResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: NotificationTemplateResponse[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}
