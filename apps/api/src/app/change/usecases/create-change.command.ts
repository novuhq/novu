import { IsDefined, IsString } from 'class-validator';
import { Document } from 'mongoose';
import { CommandHelper } from '../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../shared/commands/project.command';

export class CreateChangeCommand extends EnvironmentWithUserCommand {
  static create(data: CreateChangeCommand) {
    return CommandHelper.create(CreateChangeCommand, data);
  }

  @IsDefined()
  item: Partial<Document>;

  @IsDefined()
  @IsString()
  type: string;
}
