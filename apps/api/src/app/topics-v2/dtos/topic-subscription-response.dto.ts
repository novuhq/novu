import { ApiProperty } from '@nestjs/swagger';
import { TopicResponseDto } from './topic-response.dto';

export class SubscriberDto {
  @ApiProperty({
    description: 'The identifier of the subscriber',
    example: '64da692e9a94fb2e6449ad07',
  })
  _id: string;

  @ApiProperty({
    description: 'The external identifier of the subscriber',
    example: 'user-123',
  })
  subscriberId: string;

  @ApiProperty({
    description: 'The avatar URL of the subscriber',
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  avatar?: string;

  @ApiProperty({
    description: 'The first name of the subscriber',
    example: 'John',
    nullable: true,
  })
  firstName?: string;

  @ApiProperty({
    description: 'The last name of the subscriber',
    example: 'Doe',
    nullable: true,
  })
  lastName?: string;

  @ApiProperty({
    description: 'The email of the subscriber',
    example: 'john@example.com',
    nullable: true,
  })
  email?: string;
}

export class TopicSubscriptionResponseDto {
  @ApiProperty({
    description: 'The identifier of the subscription',
    example: '64da692e9a94fb2e6449ad08',
  })
  _id: string;

  @ApiProperty({
    description: 'The date and time the subscription was created',
    example: '2021-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Topic information',
    type: TopicResponseDto,
  })
  topic: TopicResponseDto;

  @ApiProperty({
    description: 'Subscriber information',
    type: SubscriberDto,
  })
  subscriber: SubscriberDto;
}
