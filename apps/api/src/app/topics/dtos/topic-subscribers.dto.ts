import { ApiProperty } from '@nestjs/swagger';

import { EnvironmentId, OrganizationId, TopicId, UserId } from '../types';

export class TopicSubscribersDto {
  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  _topicId: TopicId;

  @ApiProperty()
  _userId: UserId;

  @ApiProperty()
  subscribers: string[];
}
