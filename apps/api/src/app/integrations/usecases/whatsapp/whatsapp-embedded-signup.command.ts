import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { EnvironmentWithUserCommand } from '../../../shared/commands/project.command';

export class WhatsAppEmbeddedSignupCommand extends EnvironmentWithUserCommand {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  wabaId: string;

  @IsString()
  @IsNotEmpty()
  phoneNumberId: string;

  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  /** Left out when the integration is connected from the integration store, where no agent is involved. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  agentIdentifier?: string;
}
