import { IsArray, IsDefined, IsString } from 'class-validator';

import { ExternalSubscriberId, TopicKey } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class AddSubscribersCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;

  @IsArray()
  @IsDefined()
  subscribers: ExternalSubscriberId[];
}
