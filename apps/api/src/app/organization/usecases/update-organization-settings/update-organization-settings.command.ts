import { IsBoolean, IsNotEmpty, IsOptional, IsArray, IsString } from 'class-validator';
import { AuthenticatedCommand, IsValidLocale } from '@novu/application-generic';

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
