import { IsEnum, IsIn, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetSignedUrlCommand extends EnvironmentWithUserCommand {
  static create(data: GetSignedUrlCommand) {
    return CommandHelper.create<GetSignedUrlCommand>(GetSignedUrlCommand, data);
  }

  @IsString()
  @IsIn(['jpg', 'png', 'jpeg'])
  extension: string;
}
