import { ApiProperty } from '@nestjs/swagger';

export class CreateTopicSubscriptionsResponseDto {
  @ApiProperty({
    description: 'Whether the operation was acknowledged',
    type: Boolean,
  })
  acknowledged: boolean;
}
