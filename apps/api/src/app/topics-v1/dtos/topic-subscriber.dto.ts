import { ApiProperty } from '@nestjs/swagger';
import { ITopicSubscriber } from '@novu/shared';

export class TopicSubscriberDto implements ITopicSubscriber {
  @ApiProperty({
    description: 'Unique identifier for the organization',
    example: 'org_123456789',
  })
  _organizationId: string;

  @ApiProperty({
    description: 'Unique identifier for the environment',
    example: 'env_123456789',
  })
  _environmentId: string;

  @ApiProperty({
    description: 'Unique identifier for the subscriber',
    example: 'sub_123456789',
  })
  _subscriberId: string;

  @ApiProperty({
    description: 'Unique identifier for the topic',
    example: 'topic_123456789',
  })
  _topicId: string;

  @ApiProperty({
    description: 'Key associated with the topic',
    example: 'my_topic_key',
  })
  topicKey: string;

  @ApiProperty({
    description: 'External identifier for the subscriber',
    example: 'external_subscriber_123',
  })
  externalSubscriberId: string;
}
