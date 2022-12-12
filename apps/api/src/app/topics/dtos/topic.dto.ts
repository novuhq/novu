import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnvironmentId, OrganizationId, SubscriberId, TopicId, TopicKey, TopicName, UserId } from '../types';

export class TopicDto {
  @ApiPropertyOptional()
  _id?: TopicId;

  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  _userId: UserId;

  @ApiProperty()
  key: TopicKey;

  @ApiProperty()
  name: TopicName;

  @ApiPropertyOptional()
  subscribers?: SubscriberId[];
}
