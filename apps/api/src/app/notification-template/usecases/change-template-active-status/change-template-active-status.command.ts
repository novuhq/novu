import { IsBoolean, IsDefined, IsMongoId } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ChangeTemplateActiveStatusCommand extends EnvironmentWithUserCommand {
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
