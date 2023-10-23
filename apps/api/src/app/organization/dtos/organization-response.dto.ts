import { PartnerTypeEnum, DirectionEnum } from '@novu/dal';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateBrandingDetailsDto } from './update-branding-details.dto';

export class IPartnerConfigurationResponseDto {
  @ApiPropertyOptional()
  projectIds?: string[];

  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  configurationId: string;

  @ApiPropertyOptional()
  teamId: string;

  @ApiProperty({
    enum: { ...PartnerTypeEnum },
    description: 'Partner Type Enum',
  })
  @IsString()
  partnerType: PartnerTypeEnum;
}

export class OrganizationBrandingResponseDto extends UpdateBrandingDetailsDto {
  @ApiPropertyOptional({
    enum: { ...DirectionEnum },
  })
  @IsString()
  direction?: DirectionEnum;
}

export class OrganizationResponseDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty()
  @IsObject()
  branding: OrganizationBrandingResponseDto;

  @ApiProperty()
  partnerConfigurations: IPartnerConfigurationResponseDto[];
}
