import { IsEnum, IsIn, IsString } from 'class-validator';
import { CommandHelper } from '../../../shared/commands/command.helper';
import { ApplicationWithUserCommand } from '../../../shared/commands/project.command';

export class GetSignedUrlCommand extends ApplicationWithUserCommand {
  static create(data: GetSignedUrlCommand) {
    return CommandHelper.create<GetSignedUrlCommand>(GetSignedUrlCommand, data);
  }

  @IsString()
  @IsIn(['jpg', 'png', 'jpeg'])
  extension: string;
}
