import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { OrganizationCommand } from '../../../shared/commands/organization.command';

export class WhatsAppValidateTokenCommand extends OrganizationCommand {
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @IsString()
  @IsOptional()
  phoneNumberIdentification?: string;

  @IsString()
  @IsOptional()
  businessAccountId?: string;
}
