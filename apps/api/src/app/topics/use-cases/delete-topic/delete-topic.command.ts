import { IsDefined, IsString } from 'class-validator';

import { TopicKey } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class DeleteTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;
}
