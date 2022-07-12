import { ChangeEntityTypeEnum } from '@novu/shared';
import { IsDefined, IsMongoId, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class UpdateChangeCommand extends EnvironmentWithUserCommand {
  static create(data: UpdateChangeCommand) {
    return CommandHelper.create(UpdateChangeCommand, data);
  }

  @IsMongoId()
  _entityId: string;

  @IsDefined()
  @IsString()
  type: ChangeEntityTypeEnum;

  @IsMongoId()
  parentChangeId: string;
}
