import { ApiProperty } from '@nestjs/swagger';

import { ITopicSubscriber } from '@novu/shared';

import { EnvironmentId, ExternalSubscriberId, OrganizationId, SubscriberId, TopicId, TopicKey } from '../types';

export class TopicSubscriberDto implements ITopicSubscriber {
  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  _subscriberId: SubscriberId;

  @ApiProperty()
  _topicId: TopicId;

  @ApiProperty()
  topicKey: TopicKey;

  @ApiProperty()
  externalSubscriberId: ExternalSubscriberId;
}
