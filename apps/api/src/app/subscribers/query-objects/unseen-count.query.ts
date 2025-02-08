import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UnseenCountQueryDto {
  @ApiProperty({
    description: 'Identifier for the feed. Can be a single string or an array of strings.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    required: false,
  })
  feedId?: string | string[];

  @ApiProperty({
    description: 'Indicates whether to count seen notifications.',
    required: false,
    default: false,
    type: Boolean,
  })
  seen?: boolean;

  @ApiProperty({
    description: 'The maximum number of notifications to return.',
    required: false,
    default: 100,
    type: Number,
  })
  @Transform(({ value }) => Number(value)) // Convert string to integer
  limit?: number;
}
