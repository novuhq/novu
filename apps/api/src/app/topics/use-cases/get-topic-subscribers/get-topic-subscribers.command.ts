import { IsDefined, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';
import { TopicKey } from '@novu/shared';

export class GetTopicSubscribersCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;
}
