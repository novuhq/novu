import { IsArray, IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { ExternalSubscriberId, TopicKey } from '../../types';

export class AddSubscribersCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;

  @IsArray()
  @IsDefined()
  subscribers: ExternalSubscriberId[];
}
