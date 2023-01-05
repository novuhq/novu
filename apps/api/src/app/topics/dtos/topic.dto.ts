import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnvironmentId, ExternalSubscriberId, OrganizationId, TopicId, TopicKey, TopicName } from '../types';

export class TopicDto {
  @ApiPropertyOptional()
  _id: TopicId;

  @ApiProperty()
  _organizationId: OrganizationId;

  @ApiProperty()
  _environmentId: EnvironmentId;

  @ApiProperty()
  key: TopicKey;

  @ApiProperty()
  name: TopicName;

  @ApiProperty()
  subscribers: ExternalSubscriberId[];
}
