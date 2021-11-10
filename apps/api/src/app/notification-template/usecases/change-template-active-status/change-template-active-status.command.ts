import { IsBoolean, IsDefined, IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class ChangeTemplateActiveStatusCommand extends ApplicationWithUserCommand {
  static create(data: ChangeTemplateActiveStatusCommand) {
    return CommandHelper.create<ChangeTemplateActiveStatusCommand>(ChangeTemplateActiveStatusCommand, data);
  }

  @IsBoolean()
  @IsDefined()
  active: boolean;

  @IsMongoId()
  @IsDefined()
  templateId: string;
}
