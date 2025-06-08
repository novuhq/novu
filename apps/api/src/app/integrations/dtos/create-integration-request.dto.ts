import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChannelTypeEnum, ICreateIntegrationBodyDto } from '@novu/shared';

import { CredentialsDto } from './credentials.dto';
import { StepFilterDto } from '../../shared/dtos/step-filter-dto';

export class CreateIntegrationRequestDto implements ICreateIntegrationBodyDto {
  @ApiPropertyOptional({ type: String, description: 'The name of the integration' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String, description: 'The unique identifier for the integration' })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ type: String, description: 'The ID of the associated environment', format: 'uuid' })
  @IsOptional()
  @IsMongoId()
  _environmentId?: string;

  @ApiProperty({ type: String, description: 'The provider ID for the integration' })
  @IsDefined()
  @IsString()
  providerId: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
    description: 'The channel type for the integration',
  })
  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  channel: ChannelTypeEnum;

  @ApiPropertyOptional({
    type: CredentialsDto,
    description: 'The credentials for the integration',
  })
  @IsOptional()
  @Type(() => CredentialsDto)
  @ValidateNested()
  credentials?: CredentialsDto;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'If the integration is active, the validation on the credentials field will run',
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: Boolean, description: 'Flag to check the integration status' })
  @IsOptional()
  @IsBoolean()
  check?: boolean;

  @ApiPropertyOptional({
    type: [StepFilterDto],
    description: 'Conditions for the integration',
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  conditions?: StepFilterDto[];
}
