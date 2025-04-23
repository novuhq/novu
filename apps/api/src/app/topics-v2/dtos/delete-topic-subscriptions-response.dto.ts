import { ApiProperty } from '@nestjs/swagger';

export class DeleteTopicSubscriptionsResponseDto {
  @ApiProperty({
    description: 'Whether the operation was acknowledged',
    type: Boolean,
  })
  acknowledged: boolean;
}
