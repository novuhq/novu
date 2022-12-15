import { IsDefined, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetTopicSubscribersCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  topicId: string;
}
