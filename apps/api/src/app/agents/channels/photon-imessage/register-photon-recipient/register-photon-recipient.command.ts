import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../../shared/commands/project.command';

export class RegisterPhotonRecipientCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  agentIdentifier: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phoneNumber must be in E.164 format (e.g. +14155551234)' })
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
