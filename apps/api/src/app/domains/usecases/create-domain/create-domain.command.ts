import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class CreateDomainCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  name: string;
}
