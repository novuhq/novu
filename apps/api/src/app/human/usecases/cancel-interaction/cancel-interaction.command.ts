import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CancelInteractionCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  identifier: string;
}
