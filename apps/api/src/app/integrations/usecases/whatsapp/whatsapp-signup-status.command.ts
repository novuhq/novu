import { IsNotEmpty, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class WhatsAppSignupStatusCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;
}
