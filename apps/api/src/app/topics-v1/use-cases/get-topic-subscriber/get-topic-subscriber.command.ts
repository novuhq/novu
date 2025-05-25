import { IsDefined, IsString } from 'class-validator';

import { ExternalSubscriberId, TopicKey } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetTopicSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  externalSubscriberId: ExternalSubscriberId;

  @IsString()
  @IsDefined()
  topicKey: TopicKey;
}
