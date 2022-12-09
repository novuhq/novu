import { IsDefined, IsString } from 'class-validator';

import { TopicId } from '../../types';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  id: TopicId;
}
