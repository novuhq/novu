import { IsArray, IsDefined, IsString } from 'class-validator';
import { ExternalSubscriberId, TopicKey } from '../../types';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class AddSubscribersCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;

  @IsArray()
  @IsDefined()
  subscribers: ExternalSubscriberId[];
}
