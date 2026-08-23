import { IsValidContextData, IsValidCustomData } from '@novu/application-generic';
import { TopicCustomData } from '@novu/shared';
import { IsNotEmpty, IsObject, IsOptional, IsString, Length, ValidateIf } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateTopicCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  topicKey: string;

  @IsString()
  @IsOptional()
  @Length(0, 100)
  name?: string;

  @IsOptional()
  @ValidateIf((obj) => obj.data !== null)
  @IsObject()
  @IsValidCustomData()
  @IsValidContextData()
  data?: TopicCustomData | null;
}
