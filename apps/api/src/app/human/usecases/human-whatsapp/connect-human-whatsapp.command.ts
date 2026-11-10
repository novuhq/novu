import { IsNotEmpty, IsString } from 'class-validator';
import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class ConnectHumanWhatsAppCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;
}
