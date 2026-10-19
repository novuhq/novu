import { ApiProperty } from '@nestjs/swagger';
import { IsValidLocale } from '@novu/application-generic';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @ApiProperty({
    description: 'Enable or disable Novu branding',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  removeNovuBranding?: boolean;

  @ApiProperty({
    description: 'Default locale',
    example: 'en_US',
  })
  @IsOptional()
  @IsValidLocale()
  defaultLocale?: string;

  @ApiProperty({
    description: 'Target locales',
    example: ['en_US', 'es_ES'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true }) // TODO: validate locales
  targetLocales?: string[];
}
