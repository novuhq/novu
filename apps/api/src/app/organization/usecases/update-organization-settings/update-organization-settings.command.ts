import { AuthenticatedCommand, IsValidLocale } from '@novu/application-generic';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationSettingsCommand extends AuthenticatedCommand {
  @IsNotEmpty()
  readonly organizationId: string;

  @IsOptional()
  @IsBoolean()
  removeNovuBranding?: boolean;

  @IsOptional()
  @IsValidLocale()
  defaultLocale?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLocales?: string[];
}
