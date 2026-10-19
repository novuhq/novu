import { IsArray, IsDefined, IsString } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { ExternalSubscriberId, TopicKey } from '../../types';

export class RemoveSubscribersCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;

  @IsArray()
  @IsDefined()
  subscribers: ExternalSubscriberId[];
}
