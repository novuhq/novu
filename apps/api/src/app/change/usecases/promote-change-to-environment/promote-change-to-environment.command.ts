import { ChangeEntityTypeEnum } from '@novu/shared';
import { IsDefined, IsMongoId, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class PromoteChangeToEnvironmentCommand extends EnvironmentWithUserCommand {
  static create(data: PromoteChangeToEnvironmentCommand) {
    return CommandHelper.create(PromoteChangeToEnvironmentCommand, data);
  }

  @IsDefined()
  @IsMongoId()
  itemId: string;

  @IsDefined()
  @IsString()
  type: ChangeEntityTypeEnum;
}
