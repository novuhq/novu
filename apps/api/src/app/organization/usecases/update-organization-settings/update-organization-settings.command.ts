import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class UpdateOrganizationSettingsCommand extends BaseCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  @IsBoolean()
  removeNovuBranding?: boolean;
}
