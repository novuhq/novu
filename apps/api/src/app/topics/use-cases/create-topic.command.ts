import { TopicKey } from '@novu/dal';
import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';

export class CreateTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  key: TopicKey;

  @IsString()
  @IsDefined()
  name: string;
}
