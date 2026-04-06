import { ApiProperty } from '@nestjs/swagger';

export class GetSubscriberNotificationsCountResponseDto {
  @ApiProperty({
    description: 'The count of notifications matching the filter',
    type: Number,
  })
  count: number;

  @ApiProperty({
    description: 'The filter applied',
    type: 'object',
    additionalProperties: true,
  })
  filter: Record<string, unknown>;
}
