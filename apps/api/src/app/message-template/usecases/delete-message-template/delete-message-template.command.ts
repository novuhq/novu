import { IsDefined, IsMongoId } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class DeleteMessageTemplateCommand extends EnvironmentWithUserCommand {
  @IsDefined()
  @IsMongoId()
  messageTemplateId: string;

  @IsDefined()
  @IsMongoId()
  parentChangeId: string;
}
