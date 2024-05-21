import { IsDefined, IsString } from 'class-validator';

import { TopicKey } from '@novu/shared';
import { EnvironmentCommand } from '../../commands';

export class GetTopicSubscribersCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicKey: TopicKey;
}
