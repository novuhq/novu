import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max } from 'class-validator';

export class NotificationTemplatesRequestDto {
  @ApiPropertyOptional({
    type: Number,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  page?: number = 0;

  @ApiPropertyOptional({
    type: Number,
    required: false,
    default: 10,
    maximum: 100,
  })
  @Type(() => Number)
  @IsInt()
  @Max(100)
  limit?: number = 10;
}
