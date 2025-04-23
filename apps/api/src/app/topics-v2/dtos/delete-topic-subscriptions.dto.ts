import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsDefined } from 'class-validator';

export class DeleteTopicSubscriptionsRequestDto {
  @ApiProperty({
    description: 'List of subscriber identifiers to unsubscribe from the topic (max: 100)',
    example: ['subscriberId1', 'subscriberId2'],
    type: [String],
  })
  @IsArray()
  @IsDefined()
  @ArrayMaxSize(100, { message: 'Cannot unsubscribe more than 100 subscribers at once' })
  subscriberIds: string[];
}
