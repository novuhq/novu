import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { AuthenticatedCommand } from '@novu/application-generic';

export class UpdateOrganizationSettingsCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  @IsBoolean()
  removeNovuBranding?: boolean;
}
