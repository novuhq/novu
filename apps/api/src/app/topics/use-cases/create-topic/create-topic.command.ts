import { IsDefined, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { TopicKey, TopicName } from '../../types';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

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
