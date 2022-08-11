import { IsIn, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class GetSignedUrlCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsIn(['jpg', 'png', 'jpeg'])
  extension: string;
}
