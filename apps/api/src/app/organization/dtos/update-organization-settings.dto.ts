import { ApiProperty } from '@nestjs/swagger';
import { IsValidLocale } from '@novu/application-generic';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @ApiProperty({
    description: 'Enable or disable Novu branding',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  removeNovuBranding?: boolean;

  @ApiProperty({
    description: 'Enable or disable translations',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  translationsEnabled?: boolean;

  @ApiProperty({
    description: 'Default locale',
    example: 'en-US',
  })
  @IsOptional()
  @IsValidLocale()
  defaultLocale?: string;
}
