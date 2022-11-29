import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class ChangesRequestDto {
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

  @ApiProperty({
    type: String,
    required: true,
    default: 'false',
  })
  promoted: string;
}
