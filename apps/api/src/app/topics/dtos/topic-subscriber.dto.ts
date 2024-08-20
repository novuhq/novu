import { ApiProperty } from '@nestjs/swagger';

import { ITopicSubscriber } from '@novu/shared';

export class TopicSubscriberDto implements ITopicSubscriber {
  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;

  @ApiProperty()
  _subscriberId: string;

  @ApiProperty()
  _topicId: string;

  @ApiProperty()
  topicKey: string;

  @ApiProperty()
  externalSubscriberId: string;
}
