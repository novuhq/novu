import { ApiProperty } from '@nestjs/swagger';

export class TopicDto {
  @ApiProperty({
    description: 'The unique identifier of the topic',
    example: '64f5e95d3d7946d80d0cb677',
  })
  _id: string;

  @ApiProperty({
    description: 'The key identifier of the topic',
    example: 'product-updates',
  })
  key: string;

  @ApiProperty({
    description: 'The name of the topic',
    example: 'Product Updates',
    required: false,
  })
  name?: string;
}

export class SubscriberDto {
  @ApiProperty({
    description: 'The unique identifier of the subscriber',
    example: '64f5e95d3d7946d80d0cb678',
  })
  _id: string;

  @ApiProperty({
    description: 'The external identifier of the subscriber',
    example: 'external-subscriber-id',
  })
  subscriberId: string;

  @ApiProperty({
    description: 'The avatar URL of the subscriber',
    example: 'https://example.com/avatar.png',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    description: 'The first name of the subscriber',
    example: 'John',
    required: false,
  })
  firstName?: string;

  @ApiProperty({
    description: 'The last name of the subscriber',
    example: 'Doe',
    required: false,
  })
  lastName?: string;

  @ApiProperty({
    description: 'The email of the subscriber',
    example: 'john.doe@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'The creation date of the subscriber',
    example: '2025-04-24T05:40:21Z',
    required: false,
  })
  createdAt?: string;

  @ApiProperty({
    description: 'The last update date of the subscriber',
    example: '2025-04-24T05:40:21Z',
    required: false,
  })
  updatedAt?: string;
}

export class SubscriptionDto {
  @ApiProperty({
    description: 'The unique identifier of the subscription',
    example: '64f5e95d3d7946d80d0cb679',
  })
  _id: string;

  @ApiProperty({
    description: 'The topic information',
    type: TopicDto,
  })
  topic: TopicDto;

  @ApiProperty({
    description: 'The subscriber information',
    type: SubscriberDto,
    nullable: true,
  })
  subscriber: SubscriberDto | null;

  @ApiProperty({
    description: 'The creation date of the subscription',
    example: '2025-04-24T05:40:21Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'The last update date of the subscription',
    example: '2025-04-24T05:40:21Z',
  })
  updatedAt: string;
}

export class SubscriptionsDeleteErrorDto {
  @ApiProperty({
    description: 'The subscriber ID that failed',
    example: 'invalid-subscriber-id',
  })
  subscriberId: string;

  @ApiProperty({
    description: 'The error code',
    example: 'SUBSCRIBER_NOT_FOUND',
  })
  code: string;

  @ApiProperty({
    description: 'The error message',
    example: 'Subscriber with ID invalid-subscriber-id could not be found',
  })
  message: string;
}

export class MetaDto {
  @ApiProperty({
    description: 'The total count of subscriber IDs provided',
    example: 3,
  })
  totalCount: number;

  @ApiProperty({
    description: 'The count of successfully deleted subscriptions',
    example: 2,
  })
  successful: number;

  @ApiProperty({
    description: 'The count of failed deletion attempts',
    example: 1,
  })
  failed: number;
}

export class DeleteTopicSubscriptionsResponseDto {
  @ApiProperty({
    description: 'The list of successfully deleted subscriptions',
    type: [SubscriptionDto],
  })
  data: SubscriptionDto[];

  @ApiProperty({
    description: 'Metadata about the operation',
    type: MetaDto,
  })
  meta: MetaDto;

  @ApiProperty({
    description: 'The list of errors for failed deletion attempts',
    type: [SubscriptionsDeleteErrorDto],
    required: false,
  })
  errors?: SubscriptionsDeleteErrorDto[];
}
