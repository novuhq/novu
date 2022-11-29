import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationTemplatesRequestDto {
  @ApiPropertyOptional({
    type: Number,
    required: false,
  })
  page?: number = 0;

  @ApiPropertyOptional({
    type: Number,
    required: false,
    default: 10,
    maximum: 100,
  })
  limit?: number = 10;
}
