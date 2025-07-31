import { Transform } from 'class-transformer';
import { IsDefined, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';
import { TopicKey, TopicName } from '../../types';

export class CreateTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsDefined()
  @Transform(({ value }) => value.trim())
  key: TopicKey;

  @IsString()
  @IsDefined()
  @Transform(({ value }) => value.trim())
  name: TopicName;
}
