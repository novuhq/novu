import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class VerifyDomainCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  domain: string;
}
