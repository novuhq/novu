import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class TopicDto {
  @ApiProperty({
    description: 'The internal unique identifier of the topic',
    example: '64f5e95d3d7946d80d0cb677',
  })
  @IsString()
  _id: string;

  @ApiProperty({
    description: 'The key identifier of the topic used in your application. Should be unique on the environment level.',
    example: 'product-updates',
  })
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: 'The name of the topic',
    example: 'Product Updates',
  })
  @IsString()
  @IsOptional()
  name?: string;
}

export class SubscriberDto {
  @ApiProperty({
    description: 'The unique identifier of the subscriber',
    example: '64f5e95d3d7946d80d0cb678',
  })
  @IsString()
  _id: string;

  @ApiProperty({
    description: 'The external identifier of the subscriber',
    example: 'external-subscriber-id',
  })
  @IsString()
  subscriberId: string;

  @ApiPropertyOptional({
    description: 'The avatar URL of the subscriber',
    example: 'https://example.com/avatar.png',
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiPropertyOptional({
    description: 'The first name of the subscriber',
    example: 'John',
  })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    description: 'The last name of the subscriber',
    example: 'Doe',
  })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({
    description: 'The email of the subscriber',
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    description: 'The creation date of the subscriber',
    example: '2025-04-24T05:40:21Z',
  })
  @IsString()
  @IsOptional()
  createdAt?: string;

  @ApiPropertyOptional({
    description: 'The last update date of the subscriber',
    example: '2025-04-24T05:40:21Z',
  })
  @IsString()
  @IsOptional()
  updatedAt?: string;
}

export class SubscriptionDto {
  @ApiProperty({
    description: 'The unique identifier of the subscription',
    example: '64f5e95d3d7946d80d0cb679',
  })
  @IsString()
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

export class SubscriptionErrorDto {
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
    description: 'The count of successfully created subscriptions',
    example: 2,
  })
  successful: number;

  @ApiProperty({
    description: 'The count of failed subscription attempts',
    example: 1,
  })
  failed: number;
}

export class CreateTopicSubscriptionsResponseDto {
  @ApiProperty({
    description: 'The list of successfully created subscriptions',
    type: [SubscriptionDto],
  })
  data: SubscriptionDto[];

  @ApiProperty({
    description: 'Metadata about the operation',
    type: MetaDto,
  })
  meta: MetaDto;

  @ApiPropertyOptional({
    description: 'The list of errors for failed subscription attempts',
    type: [SubscriptionErrorDto],
  })
  errors?: SubscriptionErrorDto[];
}
