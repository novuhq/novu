import { IsDefined, IsString } from 'class-validator';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetTopicSubscribersCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  topicId: string;
}
