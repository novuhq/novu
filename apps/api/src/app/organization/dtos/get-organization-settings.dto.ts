import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class GetOrganizationSettingsDto {
  @ApiProperty({
    description: 'Remove Novu branding',
    example: false,
  })
  @IsBoolean()
  removeNovuBranding: boolean;
}
