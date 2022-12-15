import { IsDefined, IsString } from 'class-validator';

import { TopicId } from '../../types';

import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetTopicCommand extends EnvironmentCommand {
  @IsString()
  @IsDefined()
  id: TopicId;
}
