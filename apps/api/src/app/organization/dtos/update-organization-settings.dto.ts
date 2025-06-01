import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrganizationSettingsDto {
  @ApiProperty({
    description: 'Enable or disable Novu branding',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  removeNovuBranding?: boolean;
}
