import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsString, IsOptional } from 'class-validator';
import { IsValidLocale } from '@novu/application-generic';

export class GetOrganizationSettingsDto {
  @ApiProperty({
    description: 'Remove Novu branding',
    example: false,
  })
  @IsBoolean()
  removeNovuBranding: boolean;

  @ApiProperty({
    description: 'Default locale',
    example: 'en-US',
  })
  @IsValidLocale()
  defaultLocale: string;

  @ApiProperty({
    description: 'Target locales',
    example: ['en-US', 'es-ES'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLocales?: string[];
}
