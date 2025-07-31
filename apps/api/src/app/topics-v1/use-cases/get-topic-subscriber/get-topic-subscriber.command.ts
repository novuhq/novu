import { IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ExternalSubscriberId, TopicKey } from '../../types';

export class GetTopicSubscriberCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  externalSubscriberId: ExternalSubscriberId;

  @IsString()
  @IsDefined()
  topicKey: TopicKey;
}
