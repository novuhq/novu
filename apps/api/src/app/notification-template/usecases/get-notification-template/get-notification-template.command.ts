import { IsDefined, IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetNotificationTemplateCommand extends ApplicationWithUserCommand {
  static create(data: GetNotificationTemplateCommand) {
    return CommandHelper.create<GetNotificationTemplateCommand>(GetNotificationTemplateCommand, data);
  }

  @IsDefined()
  @IsMongoId()
  templateId: string;
}
