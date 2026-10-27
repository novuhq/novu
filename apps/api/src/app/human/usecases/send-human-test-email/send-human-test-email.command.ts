import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SendHumanTestEmailCommand extends EnvironmentWithUserCommand {
  @IsOptional()
  @IsString()
  agentIdentifier?: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}
