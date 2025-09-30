import { ApiProperty } from '@nestjs/swagger';
import { IsValidLocale } from '@novu/application-generic';
import { OrganizationEntity } from '@novu/dal';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class GetOrganizationSettingsDto {
  @ApiProperty({
    description: 'Remove Novu branding',
    example: false,
  })
  @IsBoolean()
  removeNovuBranding: boolean;

  @ApiProperty({
    description: 'Default locale',
    example: 'en_US',
  })
  @IsValidLocale()
  defaultLocale: string;

  @ApiProperty({
    description: 'Target locales',
    example: ['en_US', 'es_ES'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLocales?: string[];
}
