import { IsNotEmpty, IsString, Matches } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class SendWhatsAppTestTemplateCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @IsString()
  @IsNotEmpty()
  // E.164 with optional leading +. Meta accepts both with and without the +.
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'to must be a valid E.164 phone number' })
  to: string;
}
