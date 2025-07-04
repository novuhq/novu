import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
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
}
