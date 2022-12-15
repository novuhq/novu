import { ApiProperty } from '@nestjs/swagger';

import { EnvironmentId, ExternalSubscriberId, OrganizationId, SubscriberId, TopicId } from '../types';

export class TopicSubscribersDto {
  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  _subscriberId: SubscriberId;

  @ApiProperty()
  _topicId: TopicId;

  @ApiProperty()
  externalSubscriberId: ExternalSubscriberId;
}
